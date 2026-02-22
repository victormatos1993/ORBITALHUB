import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    ShoppingCart,
    Users,
    ArrowUpRight,
    ArrowDownRight,
    Package,
    BarChart3,
    Activity,
    FileText,
    Minus,
} from "lucide-react"
import { getDashboardData } from "@/app/actions/dashboard"

// ─── Helpers ─────────────────────────────────────────
function formatCurrency(value: number): string {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatTrend(value: number): string {
    const sign = value >= 0 ? "+" : ""
    return `${sign}${value.toFixed(1)}%`
}

function relativeTime(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return "Agora"
    if (diffMin < 60) return `Há ${diffMin}min`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `Há ${diffH}h`
    const diffD = Math.floor(diffH / 24)
    if (diffD === 1) return "Ontem"
    if (diffD < 7) return `Há ${diffD} dias`
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

// ─── Sub-components ──────────────────────────────────
function StatCard({
    title,
    value,
    change,
    changeLabel,
    icon: Icon,
    trend,
    gradient,
}: {
    title: string
    value: string
    change: string
    changeLabel: string
    icon: React.ElementType
    trend: "up" | "down" | "neutral"
    gradient: string
}) {
    return (
        <div className="group relative overflow-hidden rounded-2xl border bg-card p-5 card-hover">
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground">{title}</span>
                    <span className="text-2xl font-bold tracking-tight">{value}</span>
                    <div className="flex items-center gap-1.5 mt-1">
                        {trend === "up" ? (
                            <div className="flex items-center gap-0.5 text-success text-xs font-medium">
                                <ArrowUpRight className="h-3.5 w-3.5" />
                                {change}
                            </div>
                        ) : trend === "down" ? (
                            <div className="flex items-center gap-0.5 text-destructive text-xs font-medium">
                                <ArrowDownRight className="h-3.5 w-3.5" />
                                {change}
                            </div>
                        ) : (
                            <div className="flex items-center gap-0.5 text-muted-foreground text-xs font-medium">
                                <Minus className="h-3.5 w-3.5" />
                                {change}
                            </div>
                        )}
                        <span className="text-xs text-muted-foreground">{changeLabel}</span>
                    </div>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${gradient} text-white shadow-lg shadow-primary/10 transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
            </div>
            {/* Decorative gradient blur */}
            <div className={`absolute -bottom-8 -right-8 h-24 w-24 rounded-full ${gradient} opacity-5 blur-2xl transition-opacity duration-300 group-hover:opacity-10`} />
        </div>
    )
}

function QuickAction({
    title,
    description,
    icon: Icon,
    href,
}: {
    title: string
    description: string
    icon: React.ElementType
    href: string
}) {
    return (
        <a
            href={href}
            className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
        >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{title}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
            </div>
            <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground/40 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
    )
}

function RecentActivityItem({
    icon: Icon,
    title,
    subtitle,
    amount,
    type,
    time,
}: {
    icon: React.ElementType
    title: string
    subtitle: string
    amount: string
    type: "income" | "expense" | "neutral"
    time: string
}) {
    return (
        <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${type === "income" ? "bg-success/10 text-success" :
                type === "expense" ? "bg-destructive/10 text-destructive" :
                    "bg-muted text-muted-foreground"
                }`}>
                <Icon className="h-4 w-4" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{title}</p>
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            </div>
            <div className="text-right shrink-0">
                <p className={`text-sm font-semibold ${type === "income" ? "text-success" :
                    type === "expense" ? "text-destructive" :
                        "text-foreground"
                    }`}>
                    {type === "income" ? "+" : type === "expense" ? "-" : ""}{amount}
                </p>
                <p className="text-xs text-muted-foreground">{time}</p>
            </div>
        </div>
    )
}

function EmptyActivityState() {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                <Activity className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Nenhuma atividade recente</p>
            <p className="text-xs text-muted-foreground mt-1">
                Registre vendas, transações ou cadastre clientes para ver a atividade aqui.
            </p>
        </div>
    )
}

// ─── Icon map for activity types ─────────────────────
function getActivityIcon(type: string) {
    switch (type) {
        case "sale": return ShoppingCart
        case "income": return TrendingUp
        case "expense": return TrendingDown
        default: return DollarSign
    }
}

function getActivityDisplayType(type: string): "income" | "expense" | "neutral" {
    switch (type) {
        case "sale": return "income"
        case "income": return "income"
        case "expense": return "expense"
        default: return "neutral"
    }
}

// ─── Page ────────────────────────────────────────────
export default async function DashboardPage() {
    const data = await getDashboardData()

    const trendDirection = (val: number): "up" | "down" | "neutral" =>
        val > 0 ? "up" : val < 0 ? "down" : "neutral"

    // For expenses, inverted trend: going down is good (up arrow green)
    const expenseTrendDirection = (val: number): "up" | "down" | "neutral" =>
        val < 0 ? "up" : val > 0 ? "down" : "neutral"

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                    Visão geral do seu negócio. Hoje é {new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Receita do Mês"
                    value={formatCurrency(data.totalRevenue)}
                    change={formatTrend(data.totalRevenueTrend)}
                    changeLabel="vs mês anterior"
                    icon={DollarSign}
                    trend={trendDirection(data.totalRevenueTrend)}
                    gradient="gradient-primary"
                />
                <StatCard
                    title="Vendas do Mês"
                    value={data.salesCount.toString()}
                    change={formatTrend(data.salesCountTrend)}
                    changeLabel="vs mês anterior"
                    icon={ShoppingCart}
                    trend={trendDirection(data.salesCountTrend)}
                    gradient="gradient-success"
                />
                <StatCard
                    title="Despesas do Mês"
                    value={formatCurrency(data.totalExpenses)}
                    change={formatTrend(data.totalExpensesTrend)}
                    changeLabel="vs mês anterior"
                    icon={TrendingDown}
                    trend={expenseTrendDirection(data.totalExpensesTrend)}
                    gradient="gradient-warning"
                />
                <StatCard
                    title="Novos Clientes"
                    value={data.newCustomers.toString()}
                    change={formatTrend(data.newCustomersTrend)}
                    changeLabel="vs mês anterior"
                    icon={Users}
                    trend={trendDirection(data.newCustomersTrend)}
                    gradient="gradient-primary"
                />
            </div>

            {/* Main content grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Recent Activity */}
                <div className="lg:col-span-2 rounded-2xl border bg-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" strokeWidth={2} />
                            <h2 className="text-base font-semibold">Atividade Recente</h2>
                        </div>
                        <a href="/dashboard/financeiro/transacoes" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                            Ver tudo →
                        </a>
                    </div>
                    {data.recentActivity.length === 0 ? (
                        <EmptyActivityState />
                    ) : (
                        <div className="flex flex-col">
                            {data.recentActivity.map((item) => (
                                <RecentActivityItem
                                    key={item.id}
                                    icon={getActivityIcon(item.type)}
                                    title={item.title}
                                    subtitle={item.subtitle}
                                    amount={formatCurrency(item.amount)}
                                    type={getActivityDisplayType(item.type)}
                                    time={relativeTime(item.time)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="h-5 w-5 text-primary" strokeWidth={2} />
                        <h2 className="text-base font-semibold">Ações Rápidas</h2>
                    </div>
                    <div className="flex flex-col gap-2">
                        <QuickAction
                            title="Nova Venda"
                            description="Registrar venda no PDV"
                            icon={ShoppingCart}
                            href="/dashboard/vendas/pdv"
                        />
                        <QuickAction
                            title="Novo Cliente"
                            description="Cadastrar novo cliente"
                            icon={Users}
                            href="/dashboard/cadastros/clientes"
                        />
                        <QuickAction
                            title="Nova Transação"
                            description="Lançar receita ou despesa"
                            icon={DollarSign}
                            href="/dashboard/financeiro/transacoes"
                        />
                        <QuickAction
                            title="Novo Orçamento"
                            description="Criar orçamento para cliente"
                            icon={FileText}
                            href="/dashboard/servicos/orcamentos"
                        />
                        <QuickAction
                            title="Novo Produto"
                            description="Cadastrar produto ou serviço"
                            icon={Package}
                            href="/dashboard/cadastros/produtos"
                        />
                    </div>
                </div>
            </div>

            {/* Bottom overview */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border bg-card p-5 card-hover">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`h-2 w-2 rounded-full ${data.cashBalance >= 0 ? "bg-success" : "bg-destructive"} animate-pulse-soft`} />
                        <span className="text-sm font-medium text-muted-foreground">Saldo em Caixa</span>
                    </div>
                    <p className={`text-xl font-bold ${data.cashBalance >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatCurrency(data.cashBalance)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Receitas − Despesas (pagas)</p>
                </div>
                <div className="rounded-2xl border bg-card p-5 card-hover">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`h-2 w-2 rounded-full ${data.accountsReceivableCount > 0 ? "bg-warning animate-pulse-soft" : "bg-muted-foreground"}`} />
                        <span className="text-sm font-medium text-muted-foreground">Contas a Receber</span>
                    </div>
                    <p className="text-xl font-bold text-warning">
                        {formatCurrency(data.accountsReceivable)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {data.accountsReceivableCount === 0
                            ? "Nenhuma pendência"
                            : `${data.accountsReceivableCount} ${data.accountsReceivableCount === 1 ? "fatura pendente" : "faturas pendentes"}`
                        }
                    </p>
                </div>
                <div className="rounded-2xl border bg-card p-5 card-hover">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`h-2 w-2 rounded-full ${data.accountsPayableCount > 0 ? "bg-destructive animate-pulse-soft" : "bg-muted-foreground"}`} />
                        <span className="text-sm font-medium text-muted-foreground">Contas a Pagar</span>
                    </div>
                    <p className="text-xl font-bold text-destructive">
                        {formatCurrency(data.accountsPayable)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {data.accountsPayableCount === 0
                            ? "Nenhuma pendência"
                            : `${data.accountsPayableCount} ${data.accountsPayableCount === 1 ? "fatura pendente" : "faturas pendentes"}`
                        }
                    </p>
                </div>
            </div>
        </div>
    )
}
