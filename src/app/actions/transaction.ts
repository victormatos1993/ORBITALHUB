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
    contaFinanceiraId: z.string().optional(),
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

    const { description, amount, type, categoryId, customerId, supplierId, contaFinanceiraId, date, status } = validatedFields.data

    try {
        const paidAt = status === 'paid' ? date : null
        await prisma.transaction.create({
            data: {
                description,
                amount,
                type,
                status,
                date,
                paidAt,
                competenceDate: date,
                userId: tenantId,
                createdById: userId || null,
                categoryId: categoryId || null,
                customerId: customerId || null,
                supplierId: supplierId || null,
                contaFinanceiraId: contaFinanceiraId || null,
            },
        })

        revalidatePath("/dashboard/financeiro")
        revalidatePath("/dashboard/financeiro/transacoes")
        revalidatePath("/dashboard/financeiro/contas-pagar")
        revalidatePath("/dashboard/financeiro/contas-receber")
        return { success: true }
    } catch (error) {
        console.error("Failed to create transaction:", error)
        return { error: "Erro ao criar transação" }
    }
}

/**
 * Cria despesa com suporte a recorrência e parcelamento.
 * recurrence: 'unique' | 'monthly' | 'weekly' | 'installment'
 * occurrences: número de parcelas/ocorrências (para parcelado e recorrente)
 */
export async function createExpenseRecurring(data: {
    description: string
    amount: number
    categoryId?: string
    supplierId?: string
    contaFinanceiraId?: string
    date: Date
    status: 'pending' | 'paid'
    recurrence: 'unique' | 'monthly' | 'weekly' | 'installment'
    occurrences: number
}) {
    const { userId, tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const count = data.recurrence === 'unique' ? 1 : Math.max(1, data.occurrences)
        const transactions: any[] = []

        for (let i = 0; i < count; i++) {
            const installmentDate = new Date(data.date)

            if (data.recurrence === 'monthly') {
                installmentDate.setMonth(installmentDate.getMonth() + i)
            } else if (data.recurrence === 'weekly') {
                installmentDate.setDate(installmentDate.getDate() + (i * 7))
            } else if (data.recurrence === 'installment') {
                installmentDate.setMonth(installmentDate.getMonth() + i)
            }

            // Descrição com sufixo de parcela
            let desc = data.description
            if (count > 1) {
                desc = `${data.description} (${i + 1}/${count})`
            }

            // Somente a primeira pode estar paga, se status=paid
            const isFirstAndPaid = i === 0 && data.status === 'paid'
            const txStatus = isFirstAndPaid ? 'paid' : 'pending'

            transactions.push({
                description: desc,
                amount: data.recurrence === 'installment' ? data.amount / count : data.amount,
                type: 'expense' as const,
                status: txStatus,
                date: installmentDate,
                paidAt: isFirstAndPaid ? installmentDate : null,
                competenceDate: installmentDate,
                userId: tenantId,
                createdById: userId || null,
                categoryId: data.categoryId || null,
                supplierId: data.supplierId || null,
                contaFinanceiraId: data.contaFinanceiraId || null,
                installmentNumber: count > 1 ? i + 1 : null,
                installmentTotal: count > 1 ? count : null,
            })
        }

        // Cria todas de uma vez
        for (const tx of transactions) {
            await prisma.transaction.create({ data: tx })
        }

        revalidatePath("/dashboard/financeiro")
        revalidatePath("/dashboard/financeiro/transacoes")
        revalidatePath("/dashboard/financeiro/contas-pagar")
        return { success: true, count }
    } catch (error) {
        console.error("Failed to create recurring expense:", error)
        return { error: "Erro ao criar despesa" }
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
                paidAt: t.paidAt ? t.paidAt.toISOString().split('T')[0] : null,
                competenceDate: t.competenceDate ? t.competenceDate.toISOString().split('T')[0] : null,
                customerName: t.customer?.name,
                customerDocument: t.customer?.document,
                supplierName: t.supplier?.name,
                supplierDocument: t.supplier?.document,
                categoryName: t.category?.name,
                // ID da venda vinculada — para linkar ao cupom fiscal
                saleId: t.saleId ?? null,
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

// ═══════════════════════════════════════════════════════════════════════
// NOVAS AÇÕES FINANCEIRAS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Confirma o pagamento/recebimento de uma transação.
 * Move do regime de competência para o regime de caixa.
 */
export async function confirmarPagamento(transactionId: string, contaFinanceiraId?: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const tx = await prisma.transaction.findFirst({
            where: { id: transactionId, userId: tenantId },
        })
        if (!tx) return { error: "Transação não encontrada" }
        if (tx.status === 'paid') return { error: "Transação já está paga" }

        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'paid',
                paidAt: new Date(),
                ...(contaFinanceiraId ? { contaFinanceiraId } : {}),
            },
        })

        revalidatePath("/dashboard/financeiro")
        revalidatePath("/dashboard/financeiro/transacoes")
        revalidatePath("/dashboard/financeiro/contas-pagar")
        revalidatePath("/dashboard/financeiro/contas-receber")
        return { success: true }
    } catch (error) {
        console.error("Erro ao confirmar pagamento:", error)
        return { error: "Erro ao confirmar pagamento" }
    }
}

/**
 * Busca transações pendentes (Contas a Pagar).
 */
export async function getContasAPagar() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    try {
        const transactions = await prisma.transaction.findMany({
            where: { userId: tenantId, type: 'expense', status: 'pending' },
            include: {
                category: { select: { name: true, code: true } },
                supplier: { select: { name: true } },
                contaFinanceira: { select: { name: true } },
            },
            orderBy: { date: 'asc' },
        })

        return transactions.map((t) => ({
            ...t,
            amount: Number(t.amount),
            taxaAplicada: t.taxaAplicada ? Number(t.taxaAplicada) : null,
            date: t.date.toISOString().split('T')[0],
            categoryName: t.category?.name,
            categoryCode: t.category?.code,
            supplierName: t.supplier?.name,
            contaName: t.contaFinanceira?.name,
        }))
    } catch (error) {
        console.error("Erro ao buscar contas a pagar:", error)
        return []
    }
}

/**
 * Busca transações de receita pendentes (Contas a Receber).
 */
export async function getContasAReceber() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    try {
        const transactions = await prisma.transaction.findMany({
            where: { userId: tenantId, type: 'income', status: 'pending' },
            include: {
                category: { select: { name: true, code: true } },
                customer: { select: { name: true } },
                contaFinanceira: { select: { name: true } },
                maquinaCartao: { select: { name: true } },
            },
            orderBy: { date: 'asc' },
        })

        return transactions.map((t) => ({
            ...t,
            amount: Number(t.amount),
            taxaAplicada: t.taxaAplicada ? Number(t.taxaAplicada) : null,
            date: t.date.toISOString().split('T')[0],
            categoryName: t.category?.name,
            categoryCode: t.category?.code,
            customerName: t.customer?.name,
            contaName: t.contaFinanceira?.name,
            maquinaName: t.maquinaCartao?.name,
            saleId: t.saleId ?? null,
        }))
    } catch (error) {
        console.error("Erro ao buscar contas a receber:", error)
        return []
    }
}

/**
 * Relatório Regime de Competência — DRE simplificado.
 * Usa competenceDate ou date para agrupar (o que importa é quando o fato gerador aconteceu).
 */
export async function getRelatorioCompetencia(month: number, year: number) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    const start = new Date(year, month - 1, 1)
    const end = endOfMonth(start)

    try {
        // Todas as transações cuja competência cai no período (independente de estarem pagas)
        const transactions = await prisma.transaction.findMany({
            where: {
                userId: tenantId,
                OR: [
                    { competenceDate: { gte: start, lte: end } },
                    { competenceDate: null, date: { gte: start, lte: end } },
                ],
            },
            include: { category: { select: { code: true, name: true, type: true } } },
        })

        let faturamentoBruto = 0
        let cmv = 0
        let impostos = 0
        let taxasCartao = 0
        let fretes = 0
        let despesasFixas = 0
        let outrasReceitas = 0
        let outrasDespesas = 0

        for (const t of transactions) {
            const valor = Number(t.amount)
            const code = t.category?.code || ''

            if (t.type === 'income') {
                if (code.startsWith('1.1') || code.startsWith('1.2')) {
                    faturamentoBruto += valor
                } else {
                    outrasReceitas += valor
                }
            } else {
                if (code === '2.1') cmv += valor
                else if (code === '2.2') impostos += valor
                else if (code === '2.3') taxasCartao += valor
                else if (code === '2.4') fretes += valor
                else if (code.startsWith('3')) despesasFixas += valor
                else outrasDespesas += valor
            }
        }

        const custosVariaveis = cmv + impostos + taxasCartao + fretes
        const margemContribuicao = faturamentoBruto - custosVariaveis
        const lucroLiquido = margemContribuicao - despesasFixas + outrasReceitas - outrasDespesas
        const margemLucro = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0

        return {
            faturamentoBruto,
            cmv,
            impostos,
            taxasCartao,
            fretes,
            custosVariaveis,
            margemContribuicao,
            despesasFixas,
            outrasReceitas,
            outrasDespesas,
            lucroLiquido,
            margemLucro,
        }
    } catch (error) {
        console.error("Erro no relatório de competência:", error)
        return null
    }
}

/**
 * Relatório Regime de Caixa — fluxo real de dinheiro.
 * Usa paidAt para receitas/despesas efetivadas.
 */
export async function getRelatorioCaixa(month: number, year: number) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    const start = new Date(year, month - 1, 1)
    const end = endOfMonth(start)

    try {
        // Transações efetivamente pagas no período
        const transactions = await prisma.transaction.findMany({
            where: {
                userId: tenantId,
                status: 'paid',
                OR: [
                    { paidAt: { gte: start, lte: end } },
                    { paidAt: null, date: { gte: start, lte: end }, status: 'paid' },
                ],
            },
        })

        let entradasReais = 0
        let saidasReais = 0

        for (const t of transactions) {
            const valor = Number(t.amount)
            if (t.type === 'income') entradasReais += valor
            else saidasReais += valor
        }

        return {
            entradasReais,
            saidasReais,
            saldoPeriodo: entradasReais - saidasReais,
        }
    } catch (error) {
        console.error("Erro no relatório de caixa:", error)
        return null
    }
}

/**
 * Projeção de fluxo de caixa para os próximos N dias.
 * Retorna entradas e saídas previstas por período.
 */
export async function getProjecaoFluxoCaixa() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    const now = new Date()
    const d30 = new Date(now); d30.setDate(d30.getDate() + 30)
    const d60 = new Date(now); d60.setDate(d60.getDate() + 60)
    const d90 = new Date(now); d90.setDate(d90.getDate() + 90)

    try {
        const pendentes = await prisma.transaction.findMany({
            where: {
                userId: tenantId,
                status: 'pending',
                date: { gte: now, lte: d90 },
            },
        })

        const calcPeriodo = (inicio: Date, fim: Date) => {
            const txs = pendentes.filter(t => t.date >= inicio && t.date <= fim)
            let entradas = 0, saidas = 0
            txs.forEach(t => {
                const v = Number(t.amount)
                if (t.type === 'income') entradas += v
                else saidas += v
            })
            return { entradas, saidas, saldo: entradas - saidas }
        }

        // Saldo atual (soma de todas as transações pagas)
        const totalPago = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { userId: tenantId, type: 'income', status: 'paid' },
        })
        const totalDespesaPaga = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { userId: tenantId, type: 'expense', status: 'paid' },
        })
        const saldoAtual = (Number(totalPago._sum.amount) || 0) - (Number(totalDespesaPaga._sum.amount) || 0)

        const proj30 = calcPeriodo(now, d30)
        const proj60 = calcPeriodo(d30, d60)
        const proj90 = calcPeriodo(d60, d90)

        // Alerta de furo de caixa
        const saldoProjetado30 = saldoAtual + proj30.saldo
        const furoCaixa = saldoProjetado30 < 0

        return {
            saldoAtual,
            periodos: [
                { label: 'Próximos 30 dias', ...proj30 },
                { label: '30-60 dias', ...proj60 },
                { label: '60-90 dias', ...proj90 },
            ],
            saldoProjetado30,
            furoCaixa,
        }
    } catch (error) {
        console.error("Erro na projeção de fluxo:", error)
        return null
    }
}
