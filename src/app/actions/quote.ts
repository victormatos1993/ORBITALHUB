"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getTenantInfo } from "@/lib/auth-utils"

export async function getQuotes() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    // Auto-expire quotes past validUntil
    await prisma.quote.updateMany({
        where: {
            userId: tenantId,
            status: { in: ["DRAFT", "SENT"] },
            validUntil: { lt: new Date() },
        },
        data: { status: "EXPIRED" },
    })

    const quotes = await prisma.quote.findMany({
        where: { userId: tenantId },
        include: {
            items: {
                include: {
                    service: { select: { id: true, name: true } },
                    product: { select: { id: true, name: true } }
                },
            },
        },
        orderBy: { createdAt: "desc" },
    })
    return quotes.map(q => ({
        ...q,
        totalAmount: Number(q.totalAmount),
        discount: Number(q.discount),
        items: q.items.map(i => ({
            ...i,
            unitPrice: Number(i.unitPrice),
            totalPrice: Number(i.totalPrice),
        })),
    }))
}

export async function getNextQuoteNumber() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return 1

    const lastQuote = await prisma.quote.findFirst({
        where: { userId: tenantId },
        orderBy: { number: "desc" },
        select: { number: true },
    })
    return (lastQuote?.number ?? 0) + 1
}

export async function createQuote(data: {
    clientName: string
    clientEmail?: string | null
    clientPhone?: string | null
    notes?: string | null
    validUntil?: string | null
    discount?: number
    isRecurring?: boolean
    installments?: number | null
    paymentMethod?: string | null
    paymentType?: string | null
    items: {
        description: string
        quantity: number
        unitPrice: number
        serviceId?: string | null
        productId?: string | null
    }[]
}) {
    const { userId, tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const nextNumber = await getNextQuoteNumber()

        const totalItems = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
        const totalAmount = totalItems - (data.discount || 0)

        const quote = await prisma.quote.create({
            data: {
                number: nextNumber,
                clientName: data.clientName,
                clientEmail: data.clientEmail || null,
                clientPhone: data.clientPhone || null,
                notes: data.notes || null,
                validUntil: data.validUntil ? new Date(data.validUntil) : null,
                discount: data.discount || 0,
                totalAmount: totalAmount > 0 ? totalAmount : 0,
                isRecurring: data.isRecurring || false,
                installments: data.installments || null,
                paymentMethod: data.paymentMethod || null,
                paymentType: data.paymentMethod ? "UPFRONT" : null,
                userId: tenantId,
                createdById: userId,
                items: {
                    create: data.items.map(item => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.quantity * item.unitPrice,
                        serviceId: item.serviceId || null,
                        productId: item.productId || null,
                    })),
                },
            },
            include: { items: true },
        })

        revalidatePath("/dashboard/servicos/orcamentos")
        return { success: true, quote: { id: quote.id, number: quote.number } }
    } catch (error) {
        console.error("Erro ao criar orçamento:", error)
        return { error: `Erro ao criar orçamento: ${(error as Error).message}` }
    }
}

export async function updateQuoteStatus(id: string, status: string) {
    const { userId, tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const quote = await prisma.quote.findFirst({
            where: { id, userId: tenantId },
            include: { items: true },
        })

        if (!quote) {
            return { error: "Orçamento não encontrado" }
        }

        const updatedQuote = await prisma.quote.update({
            where: { id },
            data: { status },
        })

        if (status === "APPROVED" && quote.status !== "APPROVED") {
            for (const item of quote.items) {
                if (item.productId) {
                    await prisma.product.update({
                        where: { id: item.productId },
                        data: { stockQuantity: { decrement: item.quantity } }
                    }).catch(err => console.error("Erro ao baixar estoque:", err))
                }
            }
        } else if ((status === "REJECTED" || status === "EXPIRED" || status === "DRAFT" || status === "SENT") && quote.status === "APPROVED") {
            for (const item of quote.items) {
                if (item.productId) {
                    await prisma.product.update({
                        where: { id: item.productId },
                        data: { stockQuantity: { increment: item.quantity } }
                    }).catch(err => console.error("Erro ao retornar estoque:", err))
                }
            }
        }

        if (status === "APPROVED") {
            let customerId: string | null = null

            try {
                let existingCustomer = null

                if (quote.clientPhone) {
                    existingCustomer = await prisma.customer.findFirst({
                        where: {
                            userId: tenantId,
                            phone: quote.clientPhone,
                        },
                    })
                }

                if (!existingCustomer && quote.clientEmail) {
                    existingCustomer = await prisma.customer.findFirst({
                        where: {
                            userId: tenantId,
                            email: quote.clientEmail,
                        },
                    })
                }

                if (!existingCustomer) {
                    existingCustomer = await prisma.customer.findFirst({
                        where: {
                            userId: tenantId,
                            name: quote.clientName,
                        },
                    })
                }

                if (existingCustomer) {
                    customerId = existingCustomer.id
                    const updateData: Record<string, string> = {}
                    if (!existingCustomer.email && quote.clientEmail) updateData.email = quote.clientEmail
                    if (!existingCustomer.phone && quote.clientPhone) updateData.phone = quote.clientPhone
                    if (Object.keys(updateData).length > 0) {
                        await prisma.customer.update({
                            where: { id: existingCustomer.id },
                            data: updateData,
                        })
                    }
                } else {
                    const newCustomer = await prisma.customer.create({
                        data: {
                            name: quote.clientName,
                            email: quote.clientEmail || null,
                            phone: quote.clientPhone || null,
                            userId: tenantId,
                            createdById: userId,
                        },
                    })
                    customerId = newCustomer.id
                }
            } catch (custError) {
                console.error("Erro ao criar/atualizar cliente:", custError)
            }

            try {
                const existingTransaction = await prisma.transaction.findFirst({
                    where: {
                        userId: tenantId,
                        quoteId: quote.id,
                    },
                })

                if (!existingTransaction) {
                    const quoteNumber = String(quote.number).padStart(4, "0")
                    const totalAmount = Number(quote.totalAmount)

                    if (quote.isRecurring && quote.installments && quote.installments > 1) {
                        const installmentAmount = totalAmount / quote.installments
                        for (let i = 0; i < quote.installments; i++) {
                            const installmentDate = new Date()
                            installmentDate.setMonth(installmentDate.getMonth() + i)

                            await prisma.transaction.create({
                                data: {
                                    description: `Orçamento #${quoteNumber} — ${quote.clientName} (Parcela ${i + 1}/${quote.installments})`,
                                    amount: installmentAmount,
                                    type: "income",
                                    date: installmentDate,
                                    status: "pending",
                                    userId: tenantId,
                                    createdById: userId,
                                    customerId,
                                    quoteId: quote.id,
                                },
                            })
                        }
                    } else {
                        await prisma.transaction.create({
                            data: {
                                description: `Orçamento #${quoteNumber} — ${quote.clientName}`,
                                amount: totalAmount,
                                type: "income",
                                date: new Date(),
                                status: "pending",
                                userId: tenantId,
                                createdById: userId,
                                customerId,
                                quoteId: quote.id,
                            },
                        })
                    }
                }
            } catch (txError) {
                console.error("Erro ao criar transação:", txError)
            }

            revalidatePath("/dashboard/servicos/orcamentos")
            revalidatePath("/dashboard/financeiro")
            revalidatePath("/dashboard/financeiro/transacoes")
            revalidatePath("/dashboard/cadastros/clientes")
            return {
                success: true,
                integration: {
                    customerCreated: !!customerId,
                    transactionCreated: true,
                },
            }
        }

        revalidatePath("/dashboard/servicos/orcamentos")
        return { success: true }
    } catch (error) {
        console.error("Erro ao atualizar status:", error)
        return { error: `Erro ao atualizar status: ${(error as Error).message}` }
    }
}

export async function deleteQuote(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const quote = await prisma.quote.findFirst({
            where: { id, userId: tenantId },
            include: { items: true },
        })

        if (!quote) return { error: "Orçamento não encontrado" }

        await prisma.quote.delete({
            where: { id },
        })

        if (quote.status === "APPROVED") {
            for (const item of quote.items) {
                if (item.productId) {
                    await prisma.product.update({
                        where: { id: item.productId },
                        data: { stockQuantity: { increment: item.quantity } }
                    }).catch(err => console.error("Erro ao retornar estoque no delete:", err))
                }
            }
        }

        revalidatePath("/dashboard/servicos/orcamentos")
        return { success: true }
    } catch (error) {
        console.error("Erro ao excluir orçamento:", error)
        return { error: `Erro ao excluir orçamento: ${(error as Error).message}` }
    }
}
