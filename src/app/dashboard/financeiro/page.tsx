import { Metadata } from "next"
import { SummaryCards } from "@/components/finance/summary-cards"
import { RecentTransactions } from "@/components/finance/recent-transactions"
import { OverviewChart } from "@/components/finance/overview-chart"
import { getFinancialSummary, getTransactions, getMonthlyChartData } from "@/app/actions/transaction"
import { getCustomers } from "@/app/actions/customer"
import { getProducts } from "@/app/actions/product"
import { getServices } from "@/app/actions/service"

export const metadata: Metadata = {
    title: "Financeiro | Orbital Hub",
    description: "Gestão financeira completa",
}

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { ScheduledTransactions } from "@/components/finance/scheduled-transactions"

export default async function FinancialPage() {
    const summary = await getFinancialSummary()
    const { transactions } = await getTransactions({ pageSize: 100 })
    const chartData = await getMonthlyChartData()
    const { customers } = await getCustomers({ pageSize: 200 })
    const { products: rawProducts } = await getProducts({ pageSize: 200 })
    const services = await getServices()  // retorna array direto

    // getProducts retorna Decimal no price — converte para Number
    const products = rawProducts.map((p: any) => ({ ...p, price: Number(p.price) }))

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Filtrar transações futuras (agendamentos)
    const scheduledTransactions = transactions.filter(t => new Date(t.date) > today && t.status === "pending")
    // Transações recentes (passadas ou hoje)
    const recentTransactions = transactions.filter(t => new Date(t.date) <= today).slice(0, 6)

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
                <Button asChild>
                    <Link href="/dashboard/financeiro/transacoes/novo">
                        <Plus className="mr-2 h-4 w-4" /> Nova Transação
                    </Link>
                </Button>
            </div>

            <SummaryCards data={summary} />

            <div className="grid gap-6 lg:grid-cols-7">
                <div className="col-span-4 space-y-6">
                    <OverviewChart data={chartData} />
                    <ScheduledTransactions
                        data={scheduledTransactions}
                        customers={customers}
                        products={products}
                        services={services}
                    />
                </div>
                <RecentTransactions className="col-span-3" data={recentTransactions} />
            </div>
        </div>
    )
}
