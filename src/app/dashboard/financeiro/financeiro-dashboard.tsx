"use client"

import { useState } from "react"
import { SummaryCards } from "@/components/finance/summary-cards"
import { RecentTransactions } from "@/components/finance/recent-transactions"
import { OverviewChart } from "@/components/finance/overview-chart"
import { ScheduledTransactions } from "@/components/finance/scheduled-transactions"
import { TrendingUp, TrendingDown, AlertTriangle, BarChart3, Wallet, FileText } from "lucide-react"

interface FinanceiroDashboardProps {
    summary: any
    competencia: any
    caixa: any
    projecao: any
    chartData: any
    recentTransactions: any
    scheduledTransactions: any
    customers: any
    products: any
    services: any
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

export function FinanceiroDashboard({
    summary,
    competencia,
    caixa,
    projecao,
    chartData,
    recentTransactions,
    scheduledTransactions,
    customers,
    products,
    services,
}: FinanceiroDashboardProps) {
    const [tab, setTab] = useState<"caixa" | "competencia">("caixa")

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
                <button
                    onClick={() => setTab("caixa")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === "caixa"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <Wallet className="h-4 w-4" />
                    Regime de Caixa
                </button>
                <button
                    onClick={() => setTab("competencia")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === "competencia"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <FileText className="h-4 w-4" />
                    Regime de Competência
                </button>
            </div>

            {/* Conteúdo */}
            {tab === "caixa" ? (
                <CaixaView summary={summary} caixa={caixa} projecao={projecao} />
            ) : (
                <CompetenciaView competencia={competencia} />
            )}

            {/* Cards e gráfico (sempre visível) */}
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

// ─── Regime de Caixa ─────────────────────────────────────────────────

function CaixaView({ summary, caixa, projecao }: { summary: any; caixa: any; projecao: any }) {
    return (
        <div className="space-y-4">
            {/* Fluxo de Caixa do mês */}
            {caixa && (
                <div className="rounded-xl border bg-card p-5">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
                        Fluxo de Caixa — Mês Atual
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground">Entradas Reais</p>
                            <p className="text-xl font-bold text-emerald-500">{formatCurrency(caixa.entradasReais)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Saídas Reais</p>
                            <p className="text-xl font-bold text-red-500">{formatCurrency(caixa.saidasReais)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Saldo do Período</p>
                            <p className={`text-xl font-bold ${caixa.saldoPeriodo >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                {formatCurrency(caixa.saldoPeriodo)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Projeção de Fluxo */}
            {projecao && (
                <div className="rounded-xl border bg-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                            Projeção de Fluxo de Caixa
                        </h3>
                        {projecao.furoCaixa && (
                            <div className="flex items-center gap-2 text-red-500 text-sm font-medium animate-pulse">
                                <AlertTriangle className="h-4 w-4" />
                                Alerta: Furo de Caixa Detectado!
                            </div>
                        )}
                    </div>

                    <div className="mb-4">
                        <p className="text-xs text-muted-foreground">Saldo Atual</p>
                        <p className={`text-2xl font-bold ${projecao.saldoAtual >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                            {formatCurrency(projecao.saldoAtual)}
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {projecao.periodos.map((p: any, i: number) => (
                            <div key={i} className="rounded-lg bg-muted/50 p-3">
                                <p className="text-xs text-muted-foreground font-medium">{p.label}</p>
                                <div className="mt-2 space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Entradas</span>
                                        <span className="text-emerald-500 font-medium">{formatCurrency(p.entradas)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Saídas</span>
                                        <span className="text-red-500 font-medium">{formatCurrency(p.saidas)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm border-t pt-1">
                                        <span className="font-medium">Saldo</span>
                                        <span className={`font-bold ${p.saldo >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                            {formatCurrency(p.saldo)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 pt-3 border-t flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Saldo Projetado (30 dias)</span>
                        <span className={`font-bold ${projecao.saldoProjetado30 >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                            {formatCurrency(projecao.saldoProjetado30)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Regime de Competência ───────────────────────────────────────────

function CompetenciaView({ competencia }: { competencia: any }) {
    if (!competencia) return <p className="text-muted-foreground">Carregando DRE...</p>

    const lines = [
        { label: "Faturamento Bruto", value: competencia.faturamentoBruto, bold: true, color: "text-emerald-500" },
        { label: "  (−) CMV", value: -competencia.cmv, indent: true },
        { label: "  (−) Impostos sobre Vendas", value: -competencia.impostos, indent: true },
        { label: "  (−) Taxas de Cartão", value: -competencia.taxasCartao, indent: true },
        { label: "  (−) Fretes e Logística", value: -competencia.fretes, indent: true },
        { label: "= Custos Variáveis", value: -competencia.custosVariaveis, bold: true, color: "text-orange-500" },
        { label: "= Margem de Contribuição", value: competencia.margemContribuicao, bold: true, color: competencia.margemContribuicao >= 0 ? "text-emerald-500" : "text-red-500" },
        { label: "  (−) Despesas Fixas", value: -competencia.despesasFixas, indent: true },
        { label: "  (+) Outras Receitas", value: competencia.outrasReceitas, indent: true },
        { label: "  (−) Outras Despesas", value: -competencia.outrasDespesas, indent: true },
        { label: "= Lucro Líquido", value: competencia.lucroLiquido, bold: true, color: competencia.lucroLiquido >= 0 ? "text-emerald-500" : "text-red-500", highlight: true },
    ]

    return (
        <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    DRE Simplificado — Mês Atual
                </h3>
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Regime de Competência</span>
                </div>
            </div>

            <div className="space-y-1">
                {lines.map((line, i) => (
                    <div
                        key={i}
                        className={`flex justify-between items-center py-1.5 px-2 rounded ${line.highlight ? "bg-muted/50 border" : ""
                            } ${line.bold && !line.highlight ? "border-t pt-2 mt-1" : ""}`}
                    >
                        <span className={`text-sm ${line.bold ? "font-semibold" : "text-muted-foreground"} ${line.indent ? "pl-2" : ""}`}>
                            {line.label}
                        </span>
                        <span className={`text-sm font-mono ${line.bold ? `font-bold ${line.color}` : ""}`}>
                            {formatCurrency(Math.abs(line.value))}
                            {line.value < 0 && !line.bold ? "" : ""}
                        </span>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-3 border-t flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Margem de Lucro</span>
                <span className={`font-bold text-lg ${competencia.margemLucro >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {competencia.margemLucro.toFixed(1)}%
                </span>
            </div>
        </div>
    )
}
