"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getTenantInfo } from "@/lib/auth-utils"

export async function getSupplierQuotes(supplierId: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    try {
        const quotes = await prisma.supplierQuote.findMany({
            where: { supplierId, userId: tenantId },
            include: { items: true },
            orderBy: { createdAt: "desc" },
        })
        return quotes
    } catch (error) {
        console.error("Erro ao buscar orçamentos do fornecedor:", error)
        return []
    }
}

export async function getSupplierQuote(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    try {
        return await prisma.supplierQuote.findFirst({
            where: { id, userId: tenantId },
            include: { items: true },
        })
    } catch (error) {
        console.error("Erro ao buscar orçamento:", error)
        return null
    }
}

interface QuoteItemInput {
    description: string
    quantity: number
    unitPrice: number
}

interface CreateQuoteInput {
    supplierId: string
    description?: string
    notes?: string
    validUntil?: string | null
    items: QuoteItemInput[]
}

export async function createSupplierQuote(data: CreateQuoteInput) {
    const { userId, tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

        await prisma.supplierQuote.create({
            data: {
                supplierId: data.supplierId,
                description: data.description || null,
                notes: data.notes || null,
                validUntil: data.validUntil ? new Date(data.validUntil) : null,
                totalAmount,
                userId: tenantId,
                createdById: userId || null,
                items: {
                    create: data.items.map(item => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.quantity * item.unitPrice,
                    })),
                },
            },
        })

        revalidatePath(`/dashboard/cadastros/fornecedores/${data.supplierId}`)
        return { success: true }
    } catch (error) {
        console.error("Erro ao criar orçamento:", error)
        return { error: `Erro ao criar orçamento: ${(error as Error).message}` }
    }
}

export async function updateSupplierQuote(id: string, data: CreateQuoteInput) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const existing = await prisma.supplierQuote.findFirst({
            where: { id, userId: tenantId },
        })
        if (!existing) return { error: "Orçamento não encontrado" }

        const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

        await prisma.$transaction([
            prisma.supplierQuoteItem.deleteMany({ where: { supplierQuoteId: id } }),
            prisma.supplierQuote.update({
                where: { id },
                data: {
                    description: data.description || null,
                    notes: data.notes || null,
                    validUntil: data.validUntil ? new Date(data.validUntil) : null,
                    totalAmount,
                    items: {
                        create: data.items.map(item => ({
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.quantity * item.unitPrice,
                        })),
                    },
                },
            }),
        ])

        revalidatePath(`/dashboard/cadastros/fornecedores/${data.supplierId}`)
        return { success: true }
    } catch (error) {
        console.error("Erro ao atualizar orçamento:", error)
        return { error: "Erro ao atualizar orçamento" }
    }
}

export async function updateSupplierQuoteStatus(id: string, status: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const quote = await prisma.supplierQuote.findFirst({
            where: { id, userId: tenantId },
        })
        if (!quote) return { error: "Orçamento não encontrado" }

        await prisma.supplierQuote.update({
            where: { id },
            data: { status },
        })

        revalidatePath(`/dashboard/cadastros/fornecedores/${quote.supplierId}`)
        return { success: true }
    } catch (error) {
        console.error("Erro ao atualizar status:", error)
        return { error: "Erro ao atualizar status" }
    }
}

export async function deleteSupplierQuote(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const quote = await prisma.supplierQuote.findFirst({
            where: { id, userId: tenantId },
        })
        if (!quote) return { error: "Orçamento não encontrado" }

        await prisma.supplierQuote.delete({ where: { id } })

        revalidatePath(`/dashboard/cadastros/fornecedores/${quote.supplierId}`)
        return { success: true }
    } catch (error) {
        console.error("Erro ao excluir orçamento:", error)
        return { error: "Erro ao excluir orçamento" }
    }
}
