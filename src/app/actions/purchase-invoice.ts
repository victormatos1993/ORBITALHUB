"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getTenantInfo } from "@/lib/auth-utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export type PurchaseItem = {
    productId?: string   // se existente no catálogo
    newProduct?: {       // se novo produto
        name: string
        sku?: string
        ncm?: string
    }
    quantity: number
    rawUnitCost: number // preço unitário da NF (sem rateio)
}

export type CreatePurchaseInvoiceData = {
    invoiceNumber?: string | null
    invoiceKey?: string | null
    supplierId?: string | null
    entryDate: Date
    freightCost: number
    taxPercent: number      // 0.15 = 15%
    otherCosts: number
    notes?: string | null
    // Itens
    items: PurchaseItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calcula o custo unitário com rateio proporcional de frete, impostos e custos adicionais.
 * Fórmula: custoRateado = (rawUnitCost + freteProporcionado/qtd) × (1 + taxPercent) + outrosCustosProporcionados/qtd
 */
function calculateAllocatedCosts(
    items: PurchaseItem[],
    freightCost: number,
    taxPercent: number,
    otherCosts: number
) {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rawUnitCost, 0)

    return items.map(item => {
        const itemSubtotal = item.quantity * item.rawUnitCost
        const proportion = subtotal > 0 ? itemSubtotal / subtotal : 0

        // Rateio proporcional
        const freightShare = freightCost * proportion
        const otherCostsShare = otherCosts * proportion

        // Custo total do item = (subtotal do item + frete rateado + outros custos rateados) × (1 + impostos)
        const totalItemCost = (itemSubtotal + freightShare + otherCostsShare) * (1 + taxPercent)
        const unitCost = totalItemCost / item.quantity

        return {
            ...item,
            unitCost: Math.round(unitCost * 100) / 100, // arredondar para 2 casas
            totalItemCost: Math.round(totalItemCost * 100) / 100,
        }
    })
}

/**
 * Recalcula averageCost e stockQuantity de um produto baseado em todas as StockEntries.
 */
async function recalculateProductCost(tx: any, productId: string) {
    const entries = await tx.stockEntry.findMany({
        where: { productId },
        select: { remainingQuantity: true, unitCost: true },
    })

    const totalQuantity = entries.reduce((sum: number, e: any) => sum + e.remainingQuantity, 0)
    const totalValue = entries.reduce((sum: number, e: any) => sum + e.remainingQuantity * Number(e.unitCost), 0)
    const averageCost = totalQuantity > 0 ? totalValue / totalQuantity : 0

    await tx.product.update({
        where: { id: productId },
        data: {
            stockQuantity: totalQuantity,
            averageCost: Math.round(averageCost * 100) / 100,
        },
    })
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createPurchaseInvoice(data: CreatePurchaseInvoiceData) {
    const { userId, tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    if (data.items.length === 0) {
        return { error: "A nota de entrada deve conter pelo menos um item." }
    }

    try {
        // Calcular rateio
        const allocatedItems = calculateAllocatedCosts(data.items, data.freightCost, data.taxPercent, data.otherCosts)
        const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.rawUnitCost, 0)
        const totalCost = allocatedItems.reduce((sum, item) => sum + item.totalItemCost, 0)

        const supplierId = data.supplierId === "" ? null : data.supplierId

        // Track new products for notification
        const newProductsCreated: { id: string; name: string }[] = []
        let invoiceId = ""
        let invoiceLabel = ""

        await prisma.$transaction(async (tx) => {
            // ── Criar PurchaseInvoice ──
            const invoice = await (tx as any).purchaseInvoice.create({
                data: {
                    invoiceNumber: data.invoiceNumber || null,
                    invoiceKey: data.invoiceKey || null,
                    supplierId,
                    entryDate: data.entryDate,
                    subtotal,
                    freightCost: data.freightCost,
                    taxPercent: data.taxPercent,
                    otherCosts: data.otherCosts,
                    totalCost,
                    notes: data.notes || null,
                    paymentStatus: "PENDING",
                    userId: tenantId,
                    createdById: userId || null,
                },
            })

            invoiceId = invoice.id
            invoiceLabel = data.invoiceNumber ? `NF ${data.invoiceNumber}` : `Entrada #${invoice.id.slice(-6).toUpperCase()}`

            // ── Criar StockEntries e atualizar produtos ──
            const affectedProductIds = new Set<string>()

            for (const item of allocatedItems) {
                let productId = item.productId

                // Se é um novo produto, criar antes
                if (!productId && item.newProduct) {
                    const newProd = await tx.product.create({
                        data: {
                            name: item.newProduct.name,
                            sku: item.newProduct.sku || null,
                            ncm: item.newProduct.ncm || null,
                            price: 0,
                            stockQuantity: 0,
                            averageCost: 0,
                            manageStock: true,
                            userId: tenantId,
                            createdById: userId || null,
                        } as any,
                    })
                    productId = newProd.id
                    newProductsCreated.push({ id: newProd.id, name: item.newProduct.name })
                }

                if (!productId) continue

                await (tx as any).stockEntry.create({
                    data: {
                        quantity: item.quantity,
                        remainingQuantity: item.quantity,
                        unitCost: item.unitCost,
                        rawUnitCost: item.rawUnitCost,
                        productId,
                        purchaseInvoiceId: invoice.id,
                        userId: tenantId,
                    },
                })
                affectedProductIds.add(productId)
            }

            // Recalcular custo médio e estoque de cada produto afetado
            for (const productId of affectedProductIds) {
                await recalculateProductCost(tx, productId)
            }

            // ── Gerar "Contas a Pagar" automático ──
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

            // Contas a pagar — vencimento 30 dias após a entrada
            const vencimento = new Date(data.entryDate)
            vencimento.setDate(vencimento.getDate() + 30)

            await tx.transaction.create({
                data: {
                    userId: tenantId,
                    createdById: userId || null,
                    description: `Compra de Mercadoria — ${invoiceLabel}`,
                    amount: totalCost,
                    type: "expense",
                    status: "pending",
                    date: vencimento,
                    competenceDate: data.entryDate,
                    supplierId,
                    purchaseInvoiceId: invoice.id,
                    categoryId: cmvCategory.id,
                } as any,
            })
        })

        // ── Gerar Notificações (fora da transação) ──

        // 1. PRICING_NEEDED — para cada produto novo sem preço (targetRole: COMERCIAL)
        if (newProductsCreated.length > 0) {
            const prodNames = newProductsCreated.map(p => p.name).join(", ")
            await prisma.notification.create({
                data: {
                    userId: tenantId,
                    type: "PRICING_NEEDED",
                    targetRole: "COMERCIAL",
                    title: newProductsCreated.length === 1
                        ? `Produto sem preço de venda`
                        : `${newProductsCreated.length} produtos sem preço de venda`,
                    description: newProductsCreated.length === 1
                        ? `O produto "${newProductsCreated[0].name}" foi cadastrado via ${invoiceLabel}. Defina o preço de venda.`
                        : `Produtos cadastrados via ${invoiceLabel}: ${prodNames}. Defina os preços de venda.`,
                    purchaseInvoiceId: invoiceId,
                    status: "PENDING",
                    dueAt: new Date(),
                } as any,
            })
        }

        // 2. PAYMENT_REVIEW — revisão da conta a pagar (targetRole: FINANCEIRO)
        await prisma.notification.create({
            data: {
                userId: tenantId,
                type: "PAYMENT_REVIEW",
                targetRole: "FINANCEIRO",
                title: `Conta a pagar — ${invoiceLabel}`,
                description: `Revise o vencimento da compra de mercadoria (${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalCost)}).`,
                purchaseInvoiceId: invoiceId,
                expectedAmount: totalCost,
                status: "PENDING",
                dueAt: new Date(),
            } as any,
        })

        revalidatePath("/dashboard/estoque/entrada")
        revalidatePath("/dashboard/cadastros/produtos")
        revalidatePath("/dashboard/financeiro")
        revalidatePath("/dashboard/financeiro/transacoes")
        revalidatePath("/dashboard/notificacoes")

        return { success: true }
    } catch (error) {
        console.error("Erro ao criar nota de entrada:", error)
        return { error: `Erro ao criar nota de entrada: ${(error as Error).message}` }
    }
}

export async function getPurchaseInvoices() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { invoices: [], total: 0 }

    try {
        const invoices = await (prisma as any).purchaseInvoice.findMany({
            where: { userId: tenantId },
            include: {
                supplier: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true } },
                    },
                },
                _count: { select: { items: true, transactions: true } },
            },
            orderBy: { entryDate: "desc" },
        })

        const serialized = invoices.map((inv: any) => ({
            ...inv,
            subtotal: Number(inv.subtotal),
            freightCost: Number(inv.freightCost),
            taxPercent: Number(inv.taxPercent),
            otherCosts: Number(inv.otherCosts),
            totalCost: Number(inv.totalCost),
            items: inv.items.map((item: any) => ({
                ...item,
                unitCost: Number(item.unitCost),
                rawUnitCost: Number(item.rawUnitCost),
            })),
        }))

        return { invoices: serialized, total: invoices.length }
    } catch (error) {
        console.error("Erro ao buscar notas de entrada:", error)
        return { invoices: [], total: 0 }
    }
}

export async function getPurchaseInvoice(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    try {
        const invoice = await (prisma as any).purchaseInvoice.findFirst({
            where: { id, userId: tenantId },
            include: {
                supplier: true,
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true } },
                    },
                },
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
                    },
                },
            },
        })

        if (!invoice) return null

        return {
            ...invoice,
            subtotal: Number(invoice.subtotal),
            freightCost: Number(invoice.freightCost),
            taxPercent: Number(invoice.taxPercent),
            otherCosts: Number(invoice.otherCosts),
            totalCost: Number(invoice.totalCost),
            items: invoice.items.map((item: any) => ({
                ...item,
                unitCost: Number(item.unitCost),
                rawUnitCost: Number(item.rawUnitCost),
            })),
            transactions: invoice.transactions.map((t: any) => ({
                ...t,
                amount: Number(t.amount),
            })),
        }
    } catch (error) {
        console.error("Erro ao buscar nota de entrada:", error)
        return null
    }
}

export async function deletePurchaseInvoice(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        await prisma.$transaction(async (tx) => {
            const invoice = await (tx as any).purchaseInvoice.findFirst({
                where: { id, userId: tenantId },
                include: { items: true },
            })

            if (!invoice) throw new Error("Nota de entrada não encontrada")

            const affectedProductIds = new Set<string>()
            for (const item of invoice.items) {
                affectedProductIds.add(item.productId)
            }

            // Deletar transações vinculadas
            await tx.transaction.deleteMany({
                where: { purchaseInvoiceId: id } as any,
            })

            // Deletar a NF (cascade deleta StockEntries)
            await (tx as any).purchaseInvoice.delete({
                where: { id },
            })

            // Recalcular custo médio e estoque dos produtos afetados
            for (const productId of affectedProductIds) {
                await recalculateProductCost(tx, productId)
            }
        })

        revalidatePath("/dashboard/estoque/entrada")
        revalidatePath("/dashboard/cadastros/produtos")
        revalidatePath("/dashboard/financeiro")
        revalidatePath("/dashboard/financeiro/transacoes")

        return { success: true }
    } catch (error) {
        console.error("Erro ao excluir nota de entrada:", error)
        return { error: "Erro ao excluir nota de entrada." }
    }
}
