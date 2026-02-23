import Link from "next/link"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, TrendingDown, CalendarClock } from "lucide-react"

export function SummaryCards({
    data: {
        balance,
        income,
        expense,
        pendingExpenses,
        pendingIncome = 0,
        trends,
        metrics
    }
}: {
    data: {
        balance: number,
        income: number,
        expense: number,
        pendingExpenses: number,
        pendingIncome?: number,
        trends: { income: number, expense: number, balance: number },
        metrics?: { incomeCount: number }
    }
}) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    const formatTrend = (value: number) => {
        if (value === 0) return "0% em relação ao mês anterior"
        const formatted = value.toFixed(1).replace('.', ',')
        const direction = value > 0 ? "+" : ""
        return `${direction}${formatted}% em relação ao mês anterior`
    }

    const monthBalance = income - expense

    const now = new Date()
    const startDate = format(startOfMonth(now), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(now), 'yyyy-MM-dd')

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Saldo Total */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-2">
                        <div>
                            <span className="text-xs text-muted-foreground uppercase">Conta Corrente</span>
                            <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
                        </div>
                        <div className="pt-2 border-t">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Saldo do Mês</span>
                                <span className={`text-sm font-semibold ${monthBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatCurrency(monthBalance)}
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Receita Mês */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Receita Mês</CardTitle>
                    <Link href={`/dashboard/financeiro/transacoes?type=income&status=paid&startDate=${startDate}&endDate=${endDate}`}>
                        <TrendingUp className="h-4 w-4 text-emerald-500 cursor-pointer hover:opacity-75 transition-opacity" />
                    </Link>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(income)}</div>
                    <p className="text-xs text-muted-foreground">
                        {metrics?.incomeCount || 0} vendas realizadas no mês
                    </p>
                </CardContent>
            </Card>

            {/* Despesas Mês */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Despesas Mês</CardTitle>
                    <Link href={`/dashboard/financeiro/transacoes?type=expense&status=paid&startDate=${startDate}&endDate=${endDate}`}>
                        <TrendingDown className="h-4 w-4 text-red-500 cursor-pointer hover:opacity-75 transition-opacity" />
                    </Link>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(expense)}</div>
                    <p className="text-xs text-muted-foreground">
                        {formatTrend(trends.expense)}
                    </p>
                </CardContent>
            </Card>

            {/* Contas a Receber — receitas pendentes geradas pela agenda */}
            <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        Contas a Receber
                    </CardTitle>
                    <Link href="/dashboard/financeiro/transacoes?type=income&status=pending">
                        <CalendarClock className="h-4 w-4 text-emerald-500 cursor-pointer hover:opacity-75 transition-opacity" />
                    </Link>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(pendingIncome)}
                    </div>
                    <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70">
                        Agendamentos com faturamento previsto
                    </p>
                    {pendingExpenses > 0 && (
                        <div className="mt-2 pt-2 border-t border-emerald-500/20 flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Contas a Pagar</span>
                            <Link
                                href="/dashboard/financeiro/transacoes?type=expense&status=pending"
                                className="text-xs font-semibold text-red-600 hover:underline"
                            >
                                {formatCurrency(pendingExpenses)}
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
