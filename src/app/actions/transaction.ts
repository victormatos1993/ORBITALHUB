"use server"

import { revalidatePath } from "next/cache"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { getTenantInfo } from "@/lib/auth-utils"

const transactionSchema = z.object({
    description: z.string().min(2),
    amount: z.coerce.number().min(0.01),
    type: z.enum(["income", "expense"]),
    categoryId: z.string().optional(),
    customerId: z.string().optional(),
    supplierId: z.string().optional(),
    date: z.date(),
    status: z.enum(["pending", "paid"]),
})

export async function createTransaction(formData: z.infer<typeof transactionSchema>) {
    const { userId, tenantId } = await getTenantInfo()

    if (!tenantId) {
        return { error: "Não autorizado" }
    }

    const validatedFields = transactionSchema.safeParse(formData)

    if (!validatedFields.success) {
        return { error: "Campos inválidos" }
    }

    const { description, amount, type, categoryId, customerId, supplierId, date, status } = validatedFields.data

    try {
        await prisma.transaction.create({
            data: {
                description,
                amount,
                type,
                status,
                date,
                userId: tenantId,
                createdById: userId || null,
                categoryId: categoryId || null,
                customerId: customerId || null,
                supplierId: supplierId || null,
            },
        })

        revalidatePath("/dashboard/financeiro")
        revalidatePath("/dashboard/financeiro/transacoes")
        return { success: true }
    } catch (error) {
        console.error("Failed to create transaction:", error)
        return { error: "Erro ao criar transação" }
    }
}


export interface TransactionFilters {
    type?: 'income' | 'expense'
    status?: 'paid' | 'pending'
    categoryId?: string
    startDate?: string // YYYY-MM-DD format
    endDate?: string // YYYY-MM-DD format
    search?: string
    page?: number
    pageSize?: number
}

export async function getTransactions(filters?: TransactionFilters) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { transactions: [], total: 0 }

    try {
        const where: any = { userId: tenantId }

        if (filters?.type) {
            where.type = filters.type
        }

        if (filters?.status) {
            where.status = filters.status
        }

        if (filters?.categoryId) {
            where.categoryId = filters.categoryId
        }

        if (filters?.startDate || filters?.endDate) {
            where.date = {}
            if (filters.startDate) {
                where.date.gte = new Date(filters.startDate)
            }
            if (filters.endDate) {
                where.date.lte = new Date(filters.endDate)
            }
        }

        if (filters?.search) {
            where.description = {
                contains: filters.search,
                mode: 'insensitive'
            }
        }

        const total = await prisma.transaction.count({ where })
        const page = filters?.page || 1
        const pageSize = filters?.pageSize || 20
        const skip = (page - 1) * pageSize

        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { date: 'desc' },
            skip,
            take: pageSize,
            include: {
                customer: { select: { name: true, document: true } },
                supplier: { select: { name: true, document: true } },
                category: { select: { name: true } },
                event: true
            }
        })

        return {
            transactions: transactions.map(t => ({
                ...t,
                amount: Number(t.amount),
                date: t.date.toISOString().split('T')[0],
                customerName: t.customer?.name,
                customerDocument: t.customer?.document,
                supplierName: t.supplier?.name,
                supplierDocument: t.supplier?.document,
                categoryName: t.category?.name,
                // ID do evento vinculado — necessário para abrir o EventModal
                eventId: (t as any).event?.id ?? null,
                // Campos do evento vinculado — para o PDV montar a URL
                customerId: (t as any).event?.customerId ?? null,
                serviceId: (t as any).event?.serviceId ?? null,
                productId: (t as any).event?.productId ?? null,
            })),
            total
        }
    } catch (error) {
        console.error("Failed to fetch transactions:", error)
        return { transactions: [], total: 0 }
    }
}

export async function getFinancialSummary() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) {
        return {
            balance: 0,
            income: 0,
            expense: 0,
            pending: 0,
            pendingExpenses: 0,
            trends: {
                income: 0,
                expense: 0,
                balance: 0
            },
            metrics: {
                incomeCount: 0
            }
        }
    }

    const totalIncome = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userId: tenantId, type: "income", status: "paid" }
    })

    const totalExpense = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userId: tenantId, type: "expense", status: "paid" }
    })

    const totalPendingExpenses = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userId: tenantId, type: "expense", status: "pending" }
    })

    const totalPendingIncome = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userId: tenantId, type: "income", status: "pending" }
    })

    const income = Number(totalIncome._sum.amount) || 0
    const expense = Number(totalExpense._sum.amount) || 0
    const pendingExpenses = Number(totalPendingExpenses._sum.amount) || 0
    const pendingIncome = Number(totalPendingIncome._sum.amount) || 0
    const pending = pendingExpenses + pendingIncome

    const now = new Date()
    const currentMonthStart = startOfMonth(now)
    const currentMonthEnd = endOfMonth(now)
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    const lastMonthEnd = endOfMonth(subMonths(now, 1))

    const getMonthlyTotal = async (type: "income" | "expense", start: Date, end: Date) => {
        const result = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
                userId: tenantId,
                type,
                status: "paid",
                date: { gte: start, lte: end }
            }
        })
        return Number(result._sum.amount) || 0
    }

    const getMonthlyCount = async (type: "income" | "expense", start: Date, end: Date) => {
        return await prisma.transaction.count({
            where: {
                userId: tenantId,
                type,
                status: "paid",
                date: { gte: start, lte: end }
            }
        })
    }

    const currentIncome = await getMonthlyTotal("income", currentMonthStart, currentMonthEnd)
    const lastIncome = await getMonthlyTotal("income", lastMonthStart, lastMonthEnd)
    const currentExpense = await getMonthlyTotal("expense", currentMonthStart, currentMonthEnd)
    const lastExpense = await getMonthlyTotal("expense", lastMonthStart, lastMonthEnd)
    const currentIncomeCount = await getMonthlyCount("income", currentMonthStart, currentMonthEnd)

    const calculatePercentageChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0
        return ((current - previous) / previous) * 100
    }

    const currentMonthNet = currentIncome - currentExpense
    const currentBalance = income - expense
    const previousMonthBalance = currentBalance - currentMonthNet

    return {
        balance: currentBalance,
        income: currentIncome,
        expense: currentExpense,
        pending,
        pendingExpenses,
        pendingIncome,
        trends: {
            income: calculatePercentageChange(currentIncome, lastIncome),
            expense: calculatePercentageChange(currentExpense, lastExpense),
            balance: calculatePercentageChange(currentBalance, previousMonthBalance)
        },
        metrics: {
            incomeCount: currentIncomeCount
        }
    }
}

export async function getMonthlyChartData() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    const now = new Date()
    const sixMonthsAgo = subMonths(now, 5)

    const transactions = await prisma.transaction.findMany({
        where: {
            userId: tenantId,
            date: { gte: startOfMonth(sixMonthsAgo) },
            status: "paid"
        },
        orderBy: { date: 'asc' }
    })

    const monthlyData: Record<string, { name: string, income: number, expense: number }> = {}

    for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i)
        const monthKey = format(date, 'yyyy-MM')
        const monthName = format(date, 'MMM', { locale: ptBR })
        monthlyData[monthKey] = { name: monthName.charAt(0).toUpperCase() + monthName.slice(1), income: 0, expense: 0 }
    }

    transactions.forEach(t => {
        const monthKey = format(t.date, 'yyyy-MM')
        if (monthlyData[monthKey]) {
            if (t.type === 'income') {
                monthlyData[monthKey].income += Number(t.amount)
            } else {
                monthlyData[monthKey].expense += Number(t.amount)
            }
        }
    })

    return Object.values(monthlyData)
}

export async function deleteTransaction(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId || !id) return { error: "Não autorizado" }

    try {
        const transaction = await prisma.transaction.findFirst({
            where: { id, userId: tenantId }
        })

        if (!transaction) return { error: "Transação não encontrada" }

        await prisma.transaction.delete({
            where: { id }
        })

        revalidatePath("/dashboard/financeiro")
        revalidatePath("/dashboard/financeiro/transacoes")
        return { success: true }
    } catch (error) {
        console.error("Failed to delete transaction:", error)
        return { error: "Erro ao excluir transação" }
    }
}

export async function getTransaction(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    try {
        const transaction = await prisma.transaction.findFirst({
            where: { id, userId: tenantId }
        })
        return transaction
    } catch (error) {
        return null
    }
}

export async function updateTransaction(id: string, formData: z.infer<typeof transactionSchema>) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    const validatedFields = transactionSchema.safeParse(formData)
    if (!validatedFields.success) return { error: "Campos inválidos" }

    try {
        const transaction = await prisma.transaction.findFirst({
            where: { id, userId: tenantId }
        })

        if (!transaction) return { error: "Transação não encontrada" }

        await prisma.transaction.update({
            where: { id },
            data: {
                ...validatedFields.data,
                categoryId: validatedFields.data.categoryId || null,
                customerId: validatedFields.data.customerId || null,
                supplierId: validatedFields.data.supplierId || null,
            }
        })

        // Se a transação tem evento vinculado e foi marcada como "paid",
        // sincroniza o AgendaEvent automaticamente (baixa o agendamento)
        const beingPaid = validatedFields.data.status === "paid" && transaction.status !== "paid"
        if (beingPaid && transaction.eventId) {
            await prisma.agendaEvent.update({
                where: { id: transaction.eventId },
                data: {
                    notificationStatus: "ACTED_PDV",
                    notificationActedAt: new Date(),
                },
            })
        }

        revalidatePath("/dashboard/financeiro")
        revalidatePath("/dashboard/financeiro/transacoes")
        return { success: true }
    } catch (error) {
        console.error("Failed to update transaction:", error)
        return { error: "Erro ao atualizar transação" }
    }
}


