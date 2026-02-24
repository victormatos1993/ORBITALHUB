import { Metadata } from "next"
import { SummaryCards } from "@/components/finance/summary-cards"
import { RecentTransactions } from "@/components/finance/recent-transactions"
import { OverviewChart } from "@/components/finance/overview-chart"
import { getFinancialSummary, getTransactions, getMonthlyChartData, getRelatorioCompetencia, getRelatorioCaixa, getProjecaoFluxoCaixa } from "@/app/actions/transaction"
import { getCustomers } from "@/app/actions/customer"
import { getProducts } from "@/app/actions/product"
import { getServices } from "@/app/actions/service"
import { FinanceiroDashboard } from "./financeiro-dashboard"

export const metadata: Metadata = {
    title: "Financeiro | Orbital Hub",
    description: "Gestão financeira completa",
}


import { ScheduledTransactions } from "@/components/finance/scheduled-transactions"

export default async function FinancialPage() {
    const summary = await getFinancialSummary()
    const { transactions } = await getTransactions({ pageSize: 100 })
    const chartData = await getMonthlyChartData()
    const { customers } = await getCustomers({ pageSize: 200 })
    const { products: rawProducts } = await getProducts({ pageSize: 200 })
    const services = await getServices()

    // Relatórios para o mês atual
    const now = new Date()
    const competencia = await getRelatorioCompetencia(now.getMonth() + 1, now.getFullYear())
    const caixa = await getRelatorioCaixa(now.getMonth() + 1, now.getFullYear())
    const projecao = await getProjecaoFluxoCaixa()

    const products = rawProducts.map((p: any) => ({ ...p, price: Number(p.price) }))

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const scheduledTransactions = transactions.filter(t => new Date(t.date) > today && t.status === "pending")
    const recentTransactions = transactions.filter(t => new Date(t.date) <= today).slice(0, 6)

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
            </div>

            <FinanceiroDashboard
                summary={summary}
                competencia={competencia}
                caixa={caixa}
                projecao={projecao}
                chartData={chartData}
                recentTransactions={recentTransactions}
                scheduledTransactions={scheduledTransactions}
                customers={customers}
                products={products}
                services={services}
            />
        </div>
    )
}
