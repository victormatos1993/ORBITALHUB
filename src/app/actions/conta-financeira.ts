"use server"

import { prisma } from "@/lib/prisma"
import { getTenantInfo } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"

// ── CRUD Contas Financeiras ──────────────────────────────────────────

export async function createContaFinanceira(data: {
    name: string
    type: string
    balance?: number
    isDefault?: boolean
}) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        // Se esta conta será padrão, remove o padrão das outras
        if (data.isDefault) {
            await prisma.contaFinanceira.updateMany({
                where: { userId: tenantId, isDefault: true },
                data: { isDefault: false },
            })
        }

        const conta = await prisma.contaFinanceira.create({
            data: {
                name: data.name,
                type: data.type,
                balance: data.balance || 0,
                isDefault: data.isDefault || false,
                userId: tenantId,
            },
        })

        revalidatePath("/dashboard/financeiro")
        return { success: true, conta }
    } catch (error) {
        console.error("Erro ao criar conta financeira:", error)
        return { error: "Erro ao criar conta financeira" }
    }
}

export async function getContasFinanceiras() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    try {
        const contas = await prisma.contaFinanceira.findMany({
            where: { userId: tenantId },
            orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        })
        return contas.map((c: any) => ({
            ...c,
            balance: Number(c.balance || 0),
        }))
    } catch (error) {
        console.error("Erro ao buscar contas financeiras:", error)
        return []
    }
}

export async function getContaFinanceiraDefault() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    try {
        return await prisma.contaFinanceira.findFirst({
            where: { userId: tenantId, isDefault: true },
        })
    } catch (error) {
        console.error("Erro ao buscar conta padrão:", error)
        return null
    }
}

export async function updateContaFinanceira(
    id: string,
    data: { name?: string; type?: string; balance?: number; isDefault?: boolean; active?: boolean }
) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        // Verificar que a conta pertence ao tenant
        const existing = await prisma.contaFinanceira.findFirst({
            where: { id, userId: tenantId },
        })
        if (!existing) return { error: "Conta não encontrada" }

        if (data.isDefault) {
            await prisma.contaFinanceira.updateMany({
                where: { userId: tenantId, isDefault: true },
                data: { isDefault: false },
            })
        }

        const conta = await prisma.contaFinanceira.update({
            where: { id },
            data,
        })

        revalidatePath("/dashboard/financeiro")
        return { success: true, conta }
    } catch (error) {
        console.error("Erro ao atualizar conta financeira:", error)
        return { error: "Erro ao atualizar conta financeira" }
    }
}

export async function deleteContaFinanceira(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const existing = await prisma.contaFinanceira.findFirst({
            where: { id, userId: tenantId },
            include: { _count: { select: { transactions: true } } },
        })
        if (!existing) return { error: "Conta não encontrada" }
        if (existing.isDefault) return { error: "Não é possível excluir a conta padrão" }
        if (existing._count.transactions > 0) {
            return { error: `Esta conta possui ${existing._count.transactions} transação(ões) vinculada(s). Mova-as antes de excluir.` }
        }

        await prisma.contaFinanceira.delete({ where: { id } })

        revalidatePath("/dashboard/financeiro")
        return { success: true }
    } catch (error) {
        console.error("Erro ao excluir conta financeira:", error)
        return { error: "Erro ao excluir conta financeira" }
    }
}
