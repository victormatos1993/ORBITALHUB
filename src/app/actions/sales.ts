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

export type CreateSaleData = {
    customerId: string | null
    carrierId: string | null
    shippingCost: number | null
    shippingStatus: 'PAID' | 'PENDING' | null
    freightPaidBy: 'CLIENTE' | 'EMPRESA'
    paymentMethod: string | null
    paymentType: string | null
    installments: number | null
    eventId?: string | null  // se veio de um agendamento
    items: CreateSaleItem[]
    date: Date
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

        await prisma.$transaction(async (tx) => {
            let salesCategory = await tx.category.findFirst({
                where: { userId: tenantId, name: "Vendas", type: "income" }
            })

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
                    }
                }
            }

            await tx.transaction.create({
                data: {
                    userId: tenantId,
                    createdById: userId,
                    description: `Venda #${sale.id.slice(-6).toUpperCase()}`,
                    amount: totalAmount,
                    type: 'income',
                    status: 'paid',
                    date: data.date,
                    customerId: customerId,
                    saleId: sale.id,
                    categoryId: salesCategory.id
                }
            })

            // Gera despesa de frete se houver transportadora e valor
            // (sempre gera a despesa, independente de quem paga — se EMPRESA, é custo absorvido; se CLIENTE, é repasse)
            if (carrierId && data.shippingCost && data.shippingCost > 0) {
                const transactionStatus = data.shippingStatus === 'PAID' ? 'paid' : 'pending'

                let freightCategory = await tx.category.findFirst({
                    where: { userId: tenantId, name: "Frete", type: "expense" }
                })

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
                        date: data.date,
                        supplierId: carrierId,
                        saleId: sale.id,
                        categoryId: freightCategory.id
                    }
                })
            }
        })

        revalidatePath("/dashboard/vendas")
        revalidatePath("/dashboard/financeiro/transacoes")
        revalidatePath("/dashboard/cadastros/produtos")

        // Se a venda veio de um agendamento, baixa tudo relacionado ao evento
        if (data.eventId) {
            // 1. Atualiza o evento: financeiro PAID + atendimento COMPLETED
            await prisma.agendaEvent.update({
                where: { id: data.eventId },
                data: {
                    notificationStatus: "ACTED_PDV",
                    notificationActedAt: new Date(),
                    paymentStatus: "PAID",
                    attendanceStatus: "COMPLETED",
                },
            })

            // 2. Baixa a(s) Transaction(s) pendentes vinculadas ao evento
            await prisma.transaction.updateMany({
                where: { eventId: data.eventId, status: "pending" },
                data: { status: "paid", date: data.date },
            })

            // 3. Marca notificação normal como atuada
            await markNotificationActed(data.eventId, "ACTED_PDV", totalAmount)

            // 4. Baixa o PAYMENT_ALERT como Venda PDV (com valor faturado)
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
                carrier: true
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
