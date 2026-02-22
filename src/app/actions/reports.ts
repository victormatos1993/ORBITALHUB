"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function getReportsData(startDate?: Date, endDate?: Date) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { error: "Não autorizado" }
        }

        const userId = session.user.id

        // Define date range
        let dateFilter = {}
        if (startDate || endDate) {
            dateFilter = {
                date: {
                    ...(startDate ? { gte: startDate } : {}),
                    ...(endDate ? { lte: endDate } : {}),
                }
            }
        }

        let createdAtFilter = {}
        if (startDate || endDate) {
            createdAtFilter = {
                createdAt: {
                    ...(startDate ? { gte: startDate } : {}),
                    ...(endDate ? { lte: endDate } : {}),
                }
            }
        }

        // 1. Financeiro (DRE / Fluxo de Caixa simplificado)
        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                ...dateFilter
            },
            include: {
                category: true
            }
        })

        let totalIncome = 0
        let totalExpense = 0
        const expensesByCategory: Record<string, number> = {}

        transactions.forEach(t => {
            const amount = Number(t.amount)
            if (t.type === "INCOME") {
                if (t.status === "COMPLETED") totalIncome += amount
            } else if (t.type === "EXPENSE") {
                if (t.status === "COMPLETED") totalExpense += amount

                const catName = t.category?.name || "Sem categoria"
                expensesByCategory[catName] = (expensesByCategory[catName] || 0) + amount
            }
        })

        // 2. Vendas
        const sales = await prisma.sale.findMany({
            where: {
                userId,
                status: "COMPLETED",
                ...dateFilter
            },
            include: {
                items: {
                    include: {
                        product: true,
                        service: true
                    }
                }
            }
        })

        const totalSalesAmount = sales.reduce((acc, s) => acc + Number(s.totalAmount), 0)

        // Curva ABC (Produtos mais vendidos)
        const productSales: Record<string, { quantity: number; revenue: number; name: string }> = {}
        sales.forEach(sale => {
            sale.items.forEach(item => {
                if (item.product) {
                    const pid = item.product.id
                    if (!productSales[pid]) {
                        productSales[pid] = { quantity: 0, revenue: 0, name: item.product.name }
                    }
                    productSales[pid].quantity += item.quantity
                    productSales[pid].revenue += Number(item.totalPrice)
                }
            })
        })

        const topProducts = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)

        // 3. CRM E Clientes
        const customers = await prisma.customer.count({
            where: { userId, ...createdAtFilter }
        })

        return {
            financeiro: {
                totalIncome,
                totalExpense,
                balance: totalIncome - totalExpense,
                expensesByCategory
            },
            vendas: {
                totalSales: sales.length,
                totalSalesAmount,
                topProducts
            },
            crm: {
                newCustomers: customers
            }
        }

    } catch (error) {
        console.error("Erro ao gerar relatórios:", error)
        return { error: "Erro interno ao gerar relatórios" }
    }
}
