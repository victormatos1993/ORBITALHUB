"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth, subMonths } from "date-fns"
import { getTenantInfo } from "@/lib/auth-utils"

function pctChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
}

export interface DashboardData {
    // KPI cards
    totalRevenue: number
    totalRevenueTrend: number
    salesCount: number
    salesCountTrend: number
    totalExpenses: number
    totalExpensesTrend: number
    newCustomers: number
    newCustomersTrend: number
    // Bottom cards
    cashBalance: number
    accountsReceivable: number
    accountsReceivableCount: number
    accountsPayable: number
    accountsPayableCount: number
    // Recent activity
    recentActivity: {
        id: string
        type: "income" | "expense" | "sale" | "customer"
        title: string
        subtitle: string
        amount: number
        time: Date
    }[]
}

export async function getDashboardData(): Promise<DashboardData> {
    const { tenantId } = await getTenantInfo()

    const emptyData: DashboardData = {
        totalRevenue: 0,
        totalRevenueTrend: 0,
        salesCount: 0,
        salesCountTrend: 0,
        totalExpenses: 0,
        totalExpensesTrend: 0,
        newCustomers: 0,
        newCustomersTrend: 0,
        cashBalance: 0,
        accountsReceivable: 0,
        accountsReceivableCount: 0,
        accountsPayable: 0,
        accountsPayableCount: 0,
        recentActivity: [],
    }

    if (!tenantId) return emptyData

    const now = new Date()
    const currentMonthStart = startOfMonth(now)
    const currentMonthEnd = endOfMonth(now)
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    const lastMonthEnd = endOfMonth(subMonths(now, 1))

    try {
        // ════════════════════════════════════════════
        //  1. RECEITA DO MÊS (income transactions paid)
        // ════════════════════════════════════════════
        const [currentIncomeAgg, lastIncomeAgg] = await Promise.all([
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { userId: tenantId, type: "income", status: "paid", date: { gte: currentMonthStart, lte: currentMonthEnd } }
            }),
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { userId: tenantId, type: "income", status: "paid", date: { gte: lastMonthStart, lte: lastMonthEnd } }
            }),
        ])
        const totalRevenue = Number(currentIncomeAgg._sum.amount) || 0
        const lastRevenue = Number(lastIncomeAgg._sum.amount) || 0

        // ════════════════════════════════════════════
        //  2. VENDAS DO MÊS (sales count)
        // ════════════════════════════════════════════
        const [currentSalesCount, lastSalesCount] = await Promise.all([
            prisma.sale.count({
                where: { userId: tenantId, date: { gte: currentMonthStart, lte: currentMonthEnd } }
            }),
            prisma.sale.count({
                where: { userId: tenantId, date: { gte: lastMonthStart, lte: lastMonthEnd } }
            }),
        ])

        // ════════════════════════════════════════════
        //  3. DESPESAS DO MÊS (expense transactions paid)
        // ════════════════════════════════════════════
        const [currentExpenseAgg, lastExpenseAgg] = await Promise.all([
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { userId: tenantId, type: "expense", status: "paid", date: { gte: currentMonthStart, lte: currentMonthEnd } }
            }),
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { userId: tenantId, type: "expense", status: "paid", date: { gte: lastMonthStart, lte: lastMonthEnd } }
            }),
        ])
        const totalExpenses = Number(currentExpenseAgg._sum.amount) || 0
        const lastExpenses = Number(lastExpenseAgg._sum.amount) || 0

        // ════════════════════════════════════════════
        //  4. NOVOS CLIENTES DO MÊS
        // ════════════════════════════════════════════
        const [currentNewCustomers, lastNewCustomers] = await Promise.all([
            prisma.customer.count({
                where: { userId: tenantId, createdAt: { gte: currentMonthStart, lte: currentMonthEnd } }
            }),
            prisma.customer.count({
                where: { userId: tenantId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }
            }),
        ])

        // ════════════════════════════════════════════
        //  5. SALDO EM CAIXA (all-time income paid - expense paid)
        // ════════════════════════════════════════════
        const [allIncomeAgg, allExpenseAgg] = await Promise.all([
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { userId: tenantId, type: "income", status: "paid" }
            }),
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { userId: tenantId, type: "expense", status: "paid" }
            }),
        ])
        const cashBalance = (Number(allIncomeAgg._sum.amount) || 0) - (Number(allExpenseAgg._sum.amount) || 0)

        // ════════════════════════════════════════════
        //  6. CONTAS A RECEBER (income pending)
        // ════════════════════════════════════════════
        const [receivableAgg, receivableCount] = await Promise.all([
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { userId: tenantId, type: "income", status: "pending" }
            }),
            prisma.transaction.count({
                where: { userId: tenantId, type: "income", status: "pending" }
            }),
        ])

        // ════════════════════════════════════════════
        //  7. CONTAS A PAGAR (expense pending)
        // ════════════════════════════════════════════
        const [payableAgg, payableCount] = await Promise.all([
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { userId: tenantId, type: "expense", status: "pending" }
            }),
            prisma.transaction.count({
                where: { userId: tenantId, type: "expense", status: "pending" }
            }),
        ])

        // ════════════════════════════════════════════
        //  8. ATIVIDADE RECENTE (últimas 8 transações + vendas)
        // ════════════════════════════════════════════
        const [recentTransactions, recentSales] = await Promise.all([
            prisma.transaction.findMany({
                where: { userId: tenantId },
                orderBy: { createdAt: "desc" },
                take: 5,
                include: {
                    customer: { select: { name: true } },
                    supplier: { select: { name: true } },
                    category: { select: { name: true } },
                }
            }),
            prisma.sale.findMany({
                where: { userId: tenantId },
                orderBy: { createdAt: "desc" },
                take: 5,
                include: {
                    customer: { select: { name: true } },
                    items: { select: { quantity: true } },
                }
            }),
        ])

        const activity: DashboardData["recentActivity"] = []

        for (const t of recentTransactions) {
            const contactName = t.type === "income"
                ? (t.customer?.name || t.category?.name || "—")
                : (t.supplier?.name || t.category?.name || "—")

            activity.push({
                id: t.id,
                type: t.type as "income" | "expense",
                title: t.description,
                subtitle: contactName,
                amount: Number(t.amount),
                time: t.createdAt,
            })
        }

        for (const s of recentSales) {
            const itemCount = s.items.reduce((acc, i) => acc + i.quantity, 0)
            activity.push({
                id: s.id,
                type: "sale",
                title: `Venda #${s.id.slice(-4).toUpperCase()}`,
                subtitle: `${s.customer?.name || "Cliente avulso"} — ${itemCount} ${itemCount === 1 ? "item" : "itens"}`,
                amount: Number(s.totalAmount),
                time: s.createdAt,
            })
        }

        // Sort by time desc and take top 6
        activity.sort((a, b) => b.time.getTime() - a.time.getTime())
        const recentActivity = activity.slice(0, 6)

        return {
            totalRevenue,
            totalRevenueTrend: pctChange(totalRevenue, lastRevenue),
            salesCount: currentSalesCount,
            salesCountTrend: pctChange(currentSalesCount, lastSalesCount),
            totalExpenses,
            totalExpensesTrend: pctChange(totalExpenses, lastExpenses),
            newCustomers: currentNewCustomers,
            newCustomersTrend: pctChange(currentNewCustomers, lastNewCustomers),
            cashBalance,
            accountsReceivable: Number(receivableAgg._sum.amount) || 0,
            accountsReceivableCount: receivableCount,
            accountsPayable: Number(payableAgg._sum.amount) || 0,
            accountsPayableCount: payableCount,
            recentActivity,
        }
    } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error)
        return emptyData
    }
}
