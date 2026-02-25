"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getTenantInfo } from "@/lib/auth-utils"
import { markNotificationActed } from "@/app/actions/notifications"

export type CreateSaleItem = {
    itemType: 'product' | 'service'
    productId?: string
    serviceId?: string
    quantity: number
    unitPrice: number
}

export type PaymentEntry = {
    method: string        // PIX, DINHEIRO, CREDITO, DEBITO, etc.
    amount: number        // valor parcial
    installments: number  // 1 para à vista
    maquinaCartaoId?: string | null
    contaFinanceiraId?: string | null
}

export type CreateSaleData = {
    customerId: string | null
    carrierId: string | null
    shippingCost: number | null
    shippingStatus: 'PAID' | 'PENDING' | null
    freightPaidBy: 'CLIENTE' | 'EMPRESA'
    paymentMethod: string | null
    paymentType: string | null
    installments: number | null
    eventId?: string | null
    contaFinanceiraId?: string | null
    maquinaCartaoId?: string | null
    payments?: PaymentEntry[]  // Pagamento múltiplo
    items: CreateSaleItem[]
    date: Date
}

/**
 * Converte o paymentMethod + installments em um código de método para buscar a taxa.
 * Ex: CREDITO + 3 parcelas → CREDITO_3X
 */
function resolveMetodoPagamento(paymentMethod: string | null, installments: number | null): string | null {
    if (!paymentMethod) return null

    const m = paymentMethod.toUpperCase()

    if (m === 'PIX') return 'PIX'
    if (m === 'VOUCHER') return 'VOUCHER'
    if (m === 'DEBITO') return 'DEBITO'
    if (m === 'CREDITO') {
        const parcelas = installments || 1
        return `CREDITO_${parcelas}X`
    }

    // Dinheiro, Cheque, Carnê, Boleto — não passam pela maquininha
    return null
}

export async function processSale(tenantId: string, userId: string | null, data: CreateSaleData) {
    if (data.items.length === 0) {
        return { error: "A venda deve conter pelo menos um item." }
    }

    try {
        for (const item of data.items) {
            if (item.itemType === 'product') {
                if (!item.productId) {
                    return { error: 'Item do tipo produto deve ter productId' }
                }
                const product = await prisma.product.findFirst({
                    where: { id: item.productId, userId: tenantId }
                })
                if (!product) {
                    return { error: `Produto não encontrado ou sem acesso: ${item.productId}` }
                }
                if (product.manageStock && product.stockQuantity < item.quantity) {
                    return { error: `Estoque insuficiente para o produto: ${product.name}. Disponível: ${product.stockQuantity}` }
                }
            } else if (item.itemType === 'service') {
                if (!item.serviceId) {
                    return { error: 'Item do tipo serviço deve ter serviceId' }
                }
                const service = await prisma.service.findFirst({
                    where: { id: item.serviceId, userId: tenantId }
                })
                if (!service) {
                    return { error: `Serviço não encontrado ou sem acesso: ${item.serviceId}` }
                }
            }
        }

        const totalItemsAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)

        // Se freightPaidBy = EMPRESA, o frete NÃO é cobrado do cliente (totalAmount = só itens)
        // Se freightPaidBy = CLIENTE (padrão), o frete entra no total
        const freightPaidBy = data.freightPaidBy ?? 'CLIENTE'
        const freightForCustomer = freightPaidBy === 'CLIENTE' ? (data.shippingCost || 0) : 0
        const totalAmount = totalItemsAmount + freightForCustomer

        const customerId = (data.customerId === "") ? null : data.customerId
        const carrierId = (data.carrierId === "") ? null : data.carrierId
        const contaFinanceiraId = data.contaFinanceiraId || null
        const maquinaCartaoId = data.maquinaCartaoId || null

        // ── Buscar taxa da maquininha se aplicável ──
        let taxaPercentual = 0
        let diasRecebimento = 30
        const metodo = resolveMetodoPagamento(data.paymentMethod, data.installments)

        if (maquinaCartaoId && metodo) {
            const maquina = await prisma.maquinaCartao.findFirst({
                where: { id: maquinaCartaoId, userId: tenantId },
                include: { taxas: true },
            })
            if (maquina) {
                diasRecebimento = maquina.diasRecebimento
                const taxaReg = maquina.taxas.find(t => t.metodoPagamento === metodo)
                if (taxaReg) taxaPercentual = Number(taxaReg.taxa)
            }
        }

        await prisma.$transaction(async (tx) => {
            // ── Categoria de Vendas ──
            let salesCategory = await tx.category.findFirst({
                where: { userId: tenantId, code: "1.1", isSystem: true }
            })
            if (!salesCategory) {
                salesCategory = await tx.category.findFirst({
                    where: { userId: tenantId, name: "Vendas", type: "income" }
                })
            }
            if (!salesCategory) {
                salesCategory = await tx.category.create({
                    data: {
                        userId: tenantId,
                        name: "Vendas",
                        type: "income",
                        color: "#10b981"
                    }
                })
            }

            // ── Criar Sale ──
            const sale = await tx.sale.create({
                data: {
                    userId: tenantId,
                    createdById: userId,
                    customerId: customerId,
                    carrierId: carrierId,
                    shippingCost: data.shippingCost,
                    shippingStatus: data.shippingStatus,
                    freightPaidBy: freightPaidBy,
                    paymentMethod: data.paymentMethod,
                    paymentType: data.paymentType,
                    installments: data.installments,
                    totalAmount,
                    date: data.date,
                    status: 'COMPLETED'
                }
            })

            // ── Buscar/criar categoria CMV (código 2.1) para uso no loop de itens ──
            let cmvCategory = await tx.category.findFirst({
                where: { userId: tenantId, code: "2.1", isSystem: true },
            })
            if (!cmvCategory) {
                cmvCategory = await tx.category.findFirst({
                    where: { userId: tenantId, name: "CMV (Custo da Mercadoria)", type: "expense" },
                })
            }
            if (!cmvCategory) {
                cmvCategory = await tx.category.create({
                    data: {
                        userId: tenantId,
                        name: "CMV (Custo da Mercadoria)",
                        type: "expense",
                        code: "2.1",
                        color: "#fbbf24",
                        isSystem: true,
                    },
                })
            }

            // ── Criar SaleItems e decrementar estoque ──
            for (const item of data.items) {
                await tx.saleItem.create({
                    data: {
                        saleId: sale.id,
                        itemType: item.itemType,
                        productId: item.itemType === 'product' ? item.productId : undefined,
                        serviceId: item.itemType === 'service' ? item.serviceId : undefined,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.quantity * item.unitPrice
                    }
                })

                if (item.itemType === 'product' && item.productId) {
                    const product = await tx.product.findUnique({ where: { id: item.productId } })
                    if (product?.manageStock) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: {
                                stockQuantity: { decrement: item.quantity }
                            }
                        })

                        // ── Gerar CMV automaticamente usando custo médio ──
                        const avgCost = Number((product as any).averageCost)
                        if (avgCost > 0) {
                            const cmvAmount = Math.round(item.quantity * avgCost * 100) / 100
                            await tx.transaction.create({
                                data: {
                                    userId: tenantId,
                                    createdById: userId,
                                    description: `CMV — ${product.name} (${item.quantity}un × R$${avgCost.toFixed(2)})`,
                                    amount: cmvAmount,
                                    type: "expense",
                                    status: "paid",
                                    paidAt: data.date,
                                    date: data.date,
                                    competenceDate: data.date,
                                    saleId: sale.id,
                                    categoryId: cmvCategory!.id,
                                } as any,
                            })
                        }
                    }
                }
            }

            // ── MOTOR DE PAGAMENTOS (suporta múltiplas formas) ──
            const payments: PaymentEntry[] = (data.payments && data.payments.length > 0)
                ? data.payments
                : data.paymentMethod
                    ? [{
                        method: data.paymentMethod,
                        amount: totalAmount,
                        installments: data.installments || 1,
                        maquinaCartaoId: data.maquinaCartaoId || null,
                        contaFinanceiraId: data.contaFinanceiraId || null,
                    }]
                    : []

            for (const payment of payments) {
                const pmUpper = payment.method.toUpperCase()
                const parcelas = payment.installments || 1
                const isParcelado = parcelas > 1
                const installablesMethods = ["CREDITO", "CARNE", "BOLETO", "CHEQUE"]
                const isInstallable = installablesMethods.includes(pmUpper)
                const payMaquinaId = payment.maquinaCartaoId || null
                const payContaId = payment.contaFinanceiraId || contaFinanceiraId
                const metodo = resolveMetodoPagamento(pmUpper, parcelas)
                const usaMaquininha = !!payMaquinaId && !!metodo

                // Resolve taxa
                let payTaxaPerc = 0
                let payDiasReceb = 30
                let payModoReceb = "PARCELADO"
                if (usaMaquininha) {
                    const maq = await (tx as any).maquinaCartao.findFirst({
                        where: { id: payMaquinaId, userId: tenantId },
                        include: { taxas: true },
                    })
                    if (maq) {
                        payDiasReceb = maq.diasRecebimento
                        payModoReceb = maq.modoRecebimento || "PARCELADO"
                        const taxaReg = maq.taxas.find((t: any) => t.metodoPagamento === metodo)
                        if (taxaReg) payTaxaPerc = Number(taxaReg.taxa)
                    }
                }

                const labelPagto = payments.length > 1 ? ` (${pmUpper})` : ""

                if (pmUpper === 'DINHEIRO' || (pmUpper === 'CHEQUE' && !isParcelado)) {
                    await tx.transaction.create({
                        data: {
                            userId: tenantId,
                            createdById: userId,
                            description: `Venda #${sale.id.slice(-6).toUpperCase()}${labelPagto}`,
                            amount: payment.amount,
                            type: 'income',
                            status: 'paid',
                            paidAt: data.date,
                            date: data.date,
                            competenceDate: data.date,
                            customerId,
                            saleId: sale.id,
                            categoryId: salesCategory.id,
                            contaFinanceiraId: payContaId,
                            taxaAplicada: 0,
                        } as any
                    })
                } else if (isParcelado && isInstallable) {
                    // Parcelado (com ou sem maquininha)
                    const valorBrutoParcela = payment.amount / parcelas
                    const valorLiqParcela = usaMaquininha ? valorBrutoParcela * (1 - payTaxaPerc) : valorBrutoParcela

                    // ── MODO ANTECIPADO: uma única transação com valor total líquido ──
                    if (usaMaquininha && payModoReceb === "ANTECIPADO") {
                        const valorTotalLiquido = Number((valorLiqParcela * parcelas).toFixed(2))
                        const vencimento = new Date(data.date)
                        vencimento.setDate(vencimento.getDate() + payDiasReceb)
                        await tx.transaction.create({
                            data: {
                                userId: tenantId,
                                createdById: userId,
                                description: `Venda #${sale.id.slice(-6).toUpperCase()}${labelPagto} — ${parcelas}x (antecipado)`,
                                amount: valorTotalLiquido,
                                type: 'income',
                                status: 'pending',
                                date: vencimento,
                                competenceDate: data.date,
                                customerId,
                                saleId: sale.id,
                                categoryId: salesCategory.id,
                                contaFinanceiraId: payContaId,
                                maquinaCartaoId: payMaquinaId,
                                installmentNumber: 1,
                                installmentTotal: 1,
                                taxaAplicada: payTaxaPerc,
                            } as any
                        })
                    } else {
                        // ── MODO PARCELADO: N parcelas separadas ──
                        const dias = usaMaquininha ? payDiasReceb : 30

                        for (let i = 1; i <= parcelas; i++) {
                            const vencimento = new Date(data.date)
                            vencimento.setDate(vencimento.getDate() + (dias * i))
                            await tx.transaction.create({
                                data: {
                                    userId: tenantId,
                                    createdById: userId,
                                    description: `Venda #${sale.id.slice(-6).toUpperCase()}${labelPagto} — Parcela ${i}/${parcelas}`,
                                    amount: Number(valorLiqParcela.toFixed(2)),
                                    type: 'income',
                                    status: 'pending',
                                    date: vencimento,
                                    competenceDate: data.date,
                                    customerId,
                                    saleId: sale.id,
                                    categoryId: salesCategory.id,
                                    contaFinanceiraId: payContaId,
                                    maquinaCartaoId: payMaquinaId,
                                    installmentNumber: i,
                                    installmentTotal: parcelas,
                                    taxaAplicada: payTaxaPerc,
                                } as any
                            })
                        }
                    }
                } else if (usaMaquininha) {
                    // Débito/PIX/Voucher/Crédito 1x com maquininha
                    const valorLiquido = payment.amount * (1 - payTaxaPerc)
                    const vencimento = new Date(data.date)
                    vencimento.setDate(vencimento.getDate() + payDiasReceb)
                    await tx.transaction.create({
                        data: {
                            userId: tenantId,
                            createdById: userId,
                            description: `Venda #${sale.id.slice(-6).toUpperCase()}${labelPagto}`,
                            amount: Number(valorLiquido.toFixed(2)),
                            type: 'income',
                            status: 'pending',
                            date: vencimento,
                            competenceDate: data.date,
                            customerId,
                            saleId: sale.id,
                            categoryId: salesCategory.id,
                            contaFinanceiraId: payContaId,
                            maquinaCartaoId: payMaquinaId,
                            installmentNumber: 1,
                            installmentTotal: 1,
                            taxaAplicada: payTaxaPerc,
                        } as any
                    })
                } else {
                    // Fallback: pagamento simples
                    await tx.transaction.create({
                        data: {
                            userId: tenantId,
                            createdById: userId,
                            description: `Venda #${sale.id.slice(-6).toUpperCase()}${labelPagto}`,
                            amount: payment.amount,
                            type: 'income',
                            status: 'paid',
                            paidAt: data.date,
                            date: data.date,
                            competenceDate: data.date,
                            customerId,
                            saleId: sale.id,
                            categoryId: salesCategory.id,
                            contaFinanceiraId: payContaId,
                            taxaAplicada: 0,
                        } as any
                    })
                }
            }

            // ── Despesa de Frete (mantém lógica existente) ──
            if (carrierId && data.shippingCost && data.shippingCost > 0) {
                const transactionStatus = data.shippingStatus === 'PAID' ? 'paid' : 'pending'

                let freightCategory = await tx.category.findFirst({
                    where: { userId: tenantId, code: "2.4", isSystem: true }
                })
                if (!freightCategory) {
                    freightCategory = await tx.category.findFirst({
                        where: { userId: tenantId, name: "Frete", type: "expense" }
                    })
                }
                if (!freightCategory) {
                    freightCategory = await tx.category.create({
                        data: {
                            userId: tenantId,
                            name: "Frete",
                            type: "expense",
                            color: "#f59e0b"
                        }
                    })
                }

                const freightDesc = freightPaidBy === 'EMPRESA'
                    ? `Frete Grátis (custo empresa) Venda #${sale.id.slice(-6).toUpperCase()}`
                    : `Frete Venda #${sale.id.slice(-6).toUpperCase()}`

                await tx.transaction.create({
                    data: {
                        userId: tenantId,
                        createdById: userId,
                        description: freightDesc,
                        amount: data.shippingCost,
                        type: 'expense',
                        status: transactionStatus,
                        paidAt: transactionStatus === 'paid' ? data.date : null,
                        date: data.date,
                        competenceDate: data.date,
                        supplierId: carrierId,
                        saleId: sale.id,
                        categoryId: freightCategory.id,
                        contaFinanceiraId,
                    }
                })
            }
        })

        revalidatePath("/dashboard/vendas")
        revalidatePath("/dashboard/financeiro/transacoes")
        revalidatePath("/dashboard/financeiro/contas-receber")
        revalidatePath("/dashboard/cadastros/produtos")

        // Se a venda veio de um agendamento, baixa tudo relacionado ao evento
        // IMPORTANTE: deleta a transação original do agendamento para evitar duplicidade
        // A(s) transaction(ões) da venda substitui(em) a transação do evento
        if (data.eventId) {
            await prisma.agendaEvent.update({
                where: { id: data.eventId },
                data: {
                    notificationStatus: "ACTED_PDV",
                    notificationActedAt: new Date(),
                    paymentStatus: "PAID",
                    attendanceStatus: "COMPLETED",
                },
            })

            // Deletar transações do agendamento (substituídas pelas transações da venda)
            // Remove tanto pending quanto paid (caso confirmEventAttendance foi chamado antes)
            await prisma.transaction.deleteMany({
                where: { eventId: data.eventId },
            })

            await markNotificationActed(data.eventId, "ACTED_PDV", totalAmount)

            await prisma.notification.updateMany({
                where: {
                    userId: tenantId,
                    eventId: `pay_alert_${data.eventId}`,
                    status: "PENDING",
                },
                data: { status: "ACTED_PDV", actionAmount: totalAmount, actionAt: new Date() },
            })

            revalidatePath("/dashboard/financeiro")
            revalidatePath("/dashboard/notificacoes")
            revalidatePath("/dashboard/agenda")
        }


        return { success: true }
    } catch (error) {
        console.error("Erro ao processar venda:", error)
        return { error: `Erro ao processar venda: ${(error as Error).message}` }
    }
}

export async function createSale(data: CreateSaleData) {
    const { userId, tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    return processSale(tenantId, userId || null, data)
}

export async function getSales() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { sales: [], total: 0 }

    try {
        const sales = await prisma.sale.findMany({
            where: { userId: tenantId },
            include: {
                customer: true,
                items: {
                    include: {
                        product: true,
                        service: true
                    }
                }
            },
            orderBy: { date: 'desc' }
        })

        return { sales, total: sales.length }
    } catch (error) {
        console.error("Erro ao buscar vendas:", error)
        return { sales: [], total: 0 }
    }
}

export async function getSale(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    try {
        const sale = await prisma.sale.findFirst({
            where: { id, userId: tenantId },
            include: {
                customer: true,
                items: {
                    include: {
                        product: true,
                        service: true
                    }
                },
                carrier: true,
                transactions: {
                    orderBy: { date: "asc" },
                    select: {
                        id: true,
                        description: true,
                        amount: true,
                        status: true,
                        date: true,
                        paidAt: true,
                        installmentNumber: true,
                        installmentTotal: true,
                        taxaAplicada: true,
                    }
                }
            }
        })
        return sale
    } catch (error) {
        console.error("Erro ao buscar venda:", error)
        return null
    }
}

export async function deleteSale(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        await prisma.$transaction(async (tx) => {
            const sale = await tx.sale.findFirst({
                where: { id, userId: tenantId },
                include: { items: { include: { product: true, service: true } } }
            })

            if (!sale) throw new Error("Venda não encontrada")

            for (const item of sale.items) {
                if (item.productId && item.product?.manageStock) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            stockQuantity: { increment: item.quantity }
                        }
                    })
                }
            }

            await tx.transaction.deleteMany({
                where: { saleId: id }
            })

            await tx.sale.delete({
                where: { id }
            })
        })

        revalidatePath("/dashboard/vendas")
        revalidatePath("/dashboard/financeiro/transacoes")
        revalidatePath("/dashboard/cadastros/produtos")

        return { success: true }
    } catch (error) {
        console.error("Erro ao excluir venda:", error)
        return { error: "Erro ao excluir venda" }
    }
}
