"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns"
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
    // Financial
    cashBalance: number
    accountsReceivable: number
    accountsReceivableCount: number
    accountsPayable: number
    accountsPayableCount: number
    // Agenda
    todayEvents: {
        id: string
        title: string
        type: string
        startDate: Date
        endDate: Date
        customerName: string | null
        attendanceStatus: string | null
        paymentStatus: string | null
    }[]
    todayEventsCount: number
    weekEventsCount: number
    // Stock
    lowStockProducts: {
        id: string
        name: string
        stockQuantity: number
        price: number
    }[]
    lowStockCount: number
    totalProducts: number
    // Quotes
    openQuotes: {
        id: string
        number: number
        clientName: string
        totalAmount: number
        status: string
        createdAt: Date
    }[]
    openQuotesCount: number
    openQuotesValue: number
}

export async function getDashboardData(): Promise<DashboardData> {
    const { tenantId } = await getTenantInfo()

    const emptyData: DashboardData = {
        totalRevenue: 0, totalRevenueTrend: 0,
        salesCount: 0, salesCountTrend: 0,
        totalExpenses: 0, totalExpensesTrend: 0,
        newCustomers: 0, newCustomersTrend: 0,
        cashBalance: 0,
        accountsReceivable: 0, accountsReceivableCount: 0,
        accountsPayable: 0, accountsPayableCount: 0,
        todayEvents: [], todayEventsCount: 0, weekEventsCount: 0,
        lowStockProducts: [], lowStockCount: 0, totalProducts: 0,
        openQuotes: [], openQuotesCount: 0, openQuotesValue: 0,
    }

    if (!tenantId) return emptyData

    const now = new Date()
    const currentMonthStart = startOfMonth(now)
    const currentMonthEnd = endOfMonth(now)
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    const lastMonthEnd = endOfMonth(subMonths(now, 1))
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    // Week boundaries (Mon-Sun)
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - mondayOffset)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    try {
        // Run all queries in parallel for performance
        const [
            currentIncomeAgg, lastIncomeAgg,
            currentSalesCount, lastSalesCount,
            currentExpenseAgg, lastExpenseAgg,
            currentNewCustomers, lastNewCustomers,
            allIncomeAgg, allExpenseAgg,
            receivableAgg, receivableCount,
            payableAgg, payableCount,
            todayEvents, weekEventsCount,
            lowStockProducts, lowStockCount, totalProducts,
            openQuotes, openQuotesCount, openQuotesAgg,
        ] = await Promise.all([
            // 1. Revenue
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { userId: tenantId, type: "income", status: "paid", date: { gte: currentMonthStart, lte: currentMonthEnd } }
            }),
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { userId: tenantId, type: "income", status: "paid", date: { gte: lastMonthStart, lte: lastMonthEnd } }
            }),
            // 2. Sales count
            prisma.sale.count({
                where: { userId: tenantId, date: { gte: currentMonthStart, lte: currentMonthEnd } }
            }),
            prisma.sale.count({
                where: { userId: tenantId, date: { gte: lastMonthStart, lte: lastMonthEnd } }
            }),
            // 3. Expenses
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { userId: tenantId, type: "expense", status: "paid", date: { gte: currentMonthStart, lte: currentMonthEnd } }
            }),
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { userId: tenantId, type: "expense", status: "paid", date: { gte: lastMonthStart, lte: lastMonthEnd } }
            }),
            // 4. Customers
            prisma.customer.count({
                where: { userId: tenantId, createdAt: { gte: currentMonthStart, lte: currentMonthEnd } }
            }),
            prisma.customer.count({
                where: { userId: tenantId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }
            }),
            // 5. Cash balance
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { userId: tenantId, type: "income", status: "paid" }
            }),
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { userId: tenantId, type: "expense", status: "paid" }
            }),
            // 6. Receivables
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { userId: tenantId, type: "income", status: "pending" }
            }),
            prisma.transaction.count({
                where: { userId: tenantId, type: "income", status: "pending" }
            }),
            // 7. Payables
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: { userId: tenantId, type: "expense", status: "pending" }
            }),
            prisma.transaction.count({
                where: { userId: tenantId, type: "expense", status: "pending" }
            }),
            // 8. Today's agenda events
            prisma.agendaEvent.findMany({
                where: {
                    userId: tenantId,
                    startDate: { gte: todayStart, lte: todayEnd },
                    attendanceStatus: { notIn: ["CANCELLED", "NO_SHOW"] },
                },
                orderBy: { startDate: "asc" },
                select: {
                    id: true, title: true, type: true,
                    startDate: true, endDate: true,
                    customerName: true,
                    attendanceStatus: true,
                    paymentStatus: true,
                },
            }),
            // 9. Week events count
            prisma.agendaEvent.count({
                where: {
                    userId: tenantId,
                    startDate: { gte: weekStart, lte: weekEnd },
                    attendanceStatus: { notIn: ["CANCELLED", "NO_SHOW"] },
                },
            }),
            // 10. Low stock products
            prisma.product.findMany({
                where: { userId: tenantId, manageStock: true, stockQuantity: { lte: 5 } },
                orderBy: { stockQuantity: "asc" },
                take: 6,
                select: { id: true, name: true, stockQuantity: true, price: true },
            }),
            prisma.product.count({
                where: { userId: tenantId, manageStock: true, stockQuantity: { lte: 5 } },
            }),
            prisma.product.count({
                where: { userId: tenantId },
            }),
            // 11. Open quotes
            prisma.quote.findMany({
                where: { userId: tenantId, status: { in: ["DRAFT", "SENT"] } },
                orderBy: { createdAt: "desc" },
                take: 5,
                select: { id: true, number: true, clientName: true, totalAmount: true, status: true, createdAt: true },
            }),
            prisma.quote.count({
                where: { userId: tenantId, status: { in: ["DRAFT", "SENT"] } },
            }),
            prisma.quote.aggregate({
                _sum: { totalAmount: true },
                where: { userId: tenantId, status: { in: ["DRAFT", "SENT"] } },
            }),
        ])

        // Build revenue numbers
        const totalRevenue = Number(currentIncomeAgg._sum.amount) || 0
        const lastRevenue = Number(lastIncomeAgg._sum.amount) || 0
        const totalExpenses = Number(currentExpenseAgg._sum.amount) || 0
        const lastExpenses = Number(lastExpenseAgg._sum.amount) || 0
        const cashBalance = (Number(allIncomeAgg._sum.amount) || 0) - (Number(allExpenseAgg._sum.amount) || 0)

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
            todayEvents: todayEvents.map(e => ({
                ...e,
                price: 0,
            })),
            todayEventsCount: todayEvents.length,
            weekEventsCount,
            lowStockProducts: lowStockProducts.map(p => ({ ...p, price: Number(p.price) })),
            lowStockCount,
            totalProducts,
            openQuotes: openQuotes.map(q => ({ ...q, totalAmount: Number(q.totalAmount) })),
            openQuotesCount,
            openQuotesValue: Number(openQuotesAgg._sum.totalAmount) || 0,
        }
    } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error)
        return emptyData
    }
}
