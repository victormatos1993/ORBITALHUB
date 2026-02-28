"use server"

import { prisma } from "@/lib/prisma"
import { getTenantInfo } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"

// ── Tipos ────────────────────────────────────────────────────────────

interface CreateContaData {
    name: string
    type: string               // CAIXA | BANCO | CARTEIRA_DIGITAL
    purpose: string            // RECEBIMENTO | PAGAMENTO
    subType?: string | null    // CONTA_BANCARIA | CARTAO_CREDITO
    balance?: number
    isDefault?: boolean
    // Campos de cartão de crédito
    closingDay?: number | null
    dueDay?: number | null
    cardBrand?: string | null
    creditLimit?: number | null
}

interface UpdateContaData {
    name?: string
    type?: string
    purpose?: string
    subType?: string | null
    balance?: number
    isDefault?: boolean
    active?: boolean
    closingDay?: number | null
    dueDay?: number | null
    cardBrand?: string | null
    creditLimit?: number | null
}

// ── Helpers ──────────────────────────────────────────────────────────

function serializeConta(c: any) {
    return {
        ...c,
        balance: Number(c.balance || 0),
        creditLimit: c.creditLimit ? Number(c.creditLimit) : null,
    }
}

// ── CRUD ─────────────────────────────────────────────────────────────

export async function createContaFinanceira(data: CreateContaData) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        // Se esta conta será padrão, remove o padrão das outras com mesmo purpose
        if (data.isDefault) {
            await prisma.contaFinanceira.updateMany({
                where: { userId: tenantId, isDefault: true, purpose: data.purpose },
                data: { isDefault: false },
            })
        }

        const conta = await prisma.contaFinanceira.create({
            data: {
                name: data.name,
                type: data.type,
                purpose: data.purpose,
                subType: data.subType || null,
                balance: data.balance || 0,
                isDefault: data.isDefault || false,
                userId: tenantId,
                closingDay: data.closingDay || null,
                dueDay: data.dueDay || null,
                cardBrand: data.cardBrand || null,
                creditLimit: data.creditLimit || null,
            },
        })

        revalidatePath("/dashboard/financeiro")
        return { success: true, conta: serializeConta(conta) }
    } catch (error) {
        console.error("Erro ao criar conta financeira:", error)
        return { error: "Erro ao criar conta financeira" }
    }
}

export async function getContasFinanceiras(purpose?: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    try {
        const where: any = { userId: tenantId }
        if (purpose) where.purpose = purpose

        const contas = await prisma.contaFinanceira.findMany({
            where,
            orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        })
        return contas.map(serializeConta)
    } catch (error) {
        console.error("Erro ao buscar contas financeiras:", error)
        return []
    }
}

/** Contas de recebimento ativas (para PDV) */
export async function getContasRecebimento() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    try {
        const contas = await prisma.contaFinanceira.findMany({
            where: { userId: tenantId, purpose: "RECEBIMENTO", active: true },
            orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        })
        return contas.map(serializeConta)
    } catch (error) {
        console.error("Erro ao buscar contas de recebimento:", error)
        return []
    }
}

/** Contas de pagamento ativas (para contas a pagar) */
export async function getContasPagamento() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    try {
        const contas = await prisma.contaFinanceira.findMany({
            where: { userId: tenantId, purpose: "PAGAMENTO", active: true },
            orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        })
        return contas.map(serializeConta)
    } catch (error) {
        console.error("Erro ao buscar contas de pagamento:", error)
        return []
    }
}

export async function getContaFinanceiraDefault() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    try {
        return await prisma.contaFinanceira.findFirst({
            where: { userId: tenantId, isDefault: true, purpose: "RECEBIMENTO" },
        })
    } catch (error) {
        console.error("Erro ao buscar conta padrão:", error)
        return null
    }
}

export async function updateContaFinanceira(id: string, data: UpdateContaData) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const existing = await prisma.contaFinanceira.findFirst({
            where: { id, userId: tenantId },
        })
        if (!existing) return { error: "Conta não encontrada" }

        if (data.isDefault) {
            const purpose = data.purpose || existing.purpose
            await prisma.contaFinanceira.updateMany({
                where: { userId: tenantId, isDefault: true, purpose },
                data: { isDefault: false },
            })
        }

        const conta = await prisma.contaFinanceira.update({
            where: { id },
            data,
        })

        revalidatePath("/dashboard/financeiro")
        return { success: true, conta: serializeConta(conta) }
    } catch (error) {
        console.error("Erro ao atualizar conta financeira:", error)
        return { error: "Erro ao atualizar conta financeira" }
    }
}

/** Toggle ativar/desativar conta */
export async function toggleContaFinanceira(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const existing = await prisma.contaFinanceira.findFirst({
            where: { id, userId: tenantId },
        })
        if (!existing) return { error: "Conta não encontrada" }

        const conta = await prisma.contaFinanceira.update({
            where: { id },
            data: { active: !existing.active },
        })

        revalidatePath("/dashboard/financeiro")
        return { success: true, active: conta.active }
    } catch (error) {
        console.error("Erro ao alternar conta:", error)
        return { error: "Erro ao alternar status da conta" }
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

// ── Extrato da Conta ─────────────────────────────────────────────────

export async function getContaExtrato(contaId: string, startDate?: Date, endDate?: Date) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado", transactions: [] }

    try {
        const conta = await prisma.contaFinanceira.findFirst({
            where: { id: contaId, userId: tenantId },
        })
        if (!conta) return { error: "Conta não encontrada", transactions: [] }

        const where: any = { contaFinanceiraId: contaId }
        if (startDate && endDate) {
            where.date = { gte: startDate, lte: endDate }
        }

        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { date: "desc" },
            include: {
                category: { select: { name: true, code: true } },
                customer: { select: { name: true } },
                supplier: { select: { name: true } },
            },
        })

        return {
            conta: serializeConta(conta),
            transactions: transactions.map((t: any) => ({
                id: t.id,
                description: t.description,
                amount: Number(t.amount),
                type: t.type,
                status: t.status,
                date: t.date.toISOString(),
                categoryName: t.category?.name || null,
                customerName: t.customer?.name || null,
                supplierName: t.supplier?.name || null,
            })),
        }
    } catch (error) {
        console.error("Erro ao buscar extrato:", error)
        return { error: "Erro ao buscar extrato", transactions: [] }
    }
}

// ── Fatura do Cartão de Crédito ──────────────────────────────────────

export async function getCreditCardInvoice(contaId: string, month: number, year: number) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const conta = await prisma.contaFinanceira.findFirst({
            where: { id: contaId, userId: tenantId, subType: "CARTAO_CREDITO" },
        })
        if (!conta) return { error: "Cartão não encontrado" }

        const closingDay = conta.closingDay || 25
        const dueDay = conta.dueDay || 10

        // Período da fatura: do dia closingDay+1 do mês anterior até closingDay deste mês
        let prevMonth = month - 1
        let prevYear = year
        if (prevMonth < 0) { prevMonth = 11; prevYear-- }

        const maxPrev = new Date(prevYear, prevMonth + 1, 0).getDate()
        const maxCurr = new Date(year, month + 1, 0).getDate()

        const periodStart = new Date(prevYear, prevMonth, Math.min(closingDay + 1, maxPrev))
        const periodEnd = new Date(year, month, Math.min(closingDay, maxCurr), 23, 59, 59)

        // Buscar todas as transações do cartão neste período
        const transactions = await prisma.transaction.findMany({
            where: {
                contaFinanceiraId: contaId,
                date: { gte: periodStart, lte: periodEnd },
            },
            orderBy: { date: "asc" },
            include: {
                category: { select: { name: true } },
                supplier: { select: { name: true } },
            },
        })

        const items = transactions.map((t: any) => ({
            id: t.id,
            description: t.description,
            amount: Number(t.amount),
            type: t.type,
            status: t.status,
            date: t.date.toISOString(),
            categoryName: t.category?.name || null,
            supplierName: t.supplier?.name || null,
        }))

        const total = items.reduce((sum: number, t: any) => sum + t.amount, 0)
        const allPaid = items.length > 0 && items.every((t: any) => t.status === "paid")

        const dueDateObj = new Date(year, month, Math.min(dueDay, maxCurr))

        return {
            conta: serializeConta(conta),
            invoice: {
                month,
                year,
                periodStart: periodStart.toISOString(),
                periodEnd: periodEnd.toISOString(),
                dueDate: dueDateObj.toISOString(),
                closingDay,
                dueDay,
                total,
                itemCount: items.length,
                status: items.length === 0 ? "empty" : allPaid ? "paid" : "open",
                items,
            },
        }
    } catch (error) {
        console.error("Erro ao buscar fatura:", error)
        return { error: "Erro ao buscar fatura do cartão" }
    }
}

// ── Depósito ─────────────────────────────────────────────────────────

export async function depositoConta(contaId: string, amount: number, justification: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }
    if (amount <= 0) return { error: "Valor deve ser positivo" }
    if (!justification.trim()) return { error: "Justificativa é obrigatória" }

    try {
        const conta = await prisma.contaFinanceira.findFirst({
            where: { id: contaId, userId: tenantId },
        })
        if (!conta) return { error: "Conta não encontrada" }

        await prisma.$transaction([
            prisma.contaFinanceira.update({
                where: { id: contaId },
                data: { balance: { increment: amount } },
            }),
            prisma.transaction.create({
                data: {
                    description: `Depósito: ${justification}`,
                    amount,
                    type: "income",
                    status: "paid",
                    date: new Date(),
                    userId: tenantId,
                    contaFinanceiraId: contaId,
                },
            }),
        ])

        revalidatePath("/dashboard/financeiro")
        return { success: true }
    } catch (error) {
        console.error("Erro ao depositar:", error)
        return { error: "Erro ao realizar depósito" }
    }
}

// ── Retirada ─────────────────────────────────────────────────────────

export async function retiradaConta(contaId: string, amount: number, justification: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }
    if (amount <= 0) return { error: "Valor deve ser positivo" }
    if (!justification.trim()) return { error: "Justificativa é obrigatória" }

    try {
        const conta = await prisma.contaFinanceira.findFirst({
            where: { id: contaId, userId: tenantId },
        })
        if (!conta) return { error: "Conta não encontrada" }

        await prisma.$transaction([
            prisma.contaFinanceira.update({
                where: { id: contaId },
                data: { balance: { decrement: amount } },
            }),
            prisma.transaction.create({
                data: {
                    description: `Retirada: ${justification}`,
                    amount,
                    type: "expense",
                    status: "paid",
                    date: new Date(),
                    userId: tenantId,
                    contaFinanceiraId: contaId,
                },
            }),
        ])

        revalidatePath("/dashboard/financeiro")
        return { success: true }
    } catch (error) {
        console.error("Erro ao retirar:", error)
        return { error: "Erro ao realizar retirada" }
    }
}

// ── Transferência entre contas ───────────────────────────────────────

export async function transferenciaConta(
    origemId: string,
    destinoId: string,
    amount: number,
    justification: string
) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }
    if (amount <= 0) return { error: "Valor deve ser positivo" }
    if (!justification.trim()) return { error: "Justificativa é obrigatória" }
    if (origemId === destinoId) return { error: "Conta de origem e destino devem ser diferentes" }

    try {
        const [origem, destino] = await Promise.all([
            prisma.contaFinanceira.findFirst({ where: { id: origemId, userId: tenantId } }),
            prisma.contaFinanceira.findFirst({ where: { id: destinoId, userId: tenantId } }),
        ])
        if (!origem) return { error: "Conta de origem não encontrada" }
        if (!destino) return { error: "Conta de destino não encontrada" }

        const now = new Date()
        const desc = justification.trim() || "Transferência entre contas"

        await prisma.$transaction([
            // Debita origem
            prisma.contaFinanceira.update({
                where: { id: origemId },
                data: { balance: { decrement: amount } },
            }),
            // Credita destino
            prisma.contaFinanceira.update({
                where: { id: destinoId },
                data: { balance: { increment: amount } },
            }),
            // Transação de saída na origem
            prisma.transaction.create({
                data: {
                    description: `Transferência para ${(destino as any).name}: ${desc}`,
                    amount,
                    type: "expense",
                    status: "paid",
                    date: now,
                    userId: tenantId,
                    contaFinanceiraId: origemId,
                },
            }),
            // Transação de entrada no destino
            prisma.transaction.create({
                data: {
                    description: `Transferência de ${(origem as any).name}: ${desc}`,
                    amount,
                    type: "income",
                    status: "paid",
                    date: now,
                    userId: tenantId,
                    contaFinanceiraId: destinoId,
                },
            }),
        ])

        revalidatePath("/dashboard/financeiro")
        return { success: true }
    } catch (error) {
        console.error("Erro ao transferir:", error)
        return { error: "Erro ao realizar transferência" }
    }
}
