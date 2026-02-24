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
    FileText,
    Minus,
    CalendarDays,
    AlertTriangle,
} from "lucide-react"
import { getDashboardData } from "@/app/actions/dashboard"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// ─── Helpers ─────────────────────────────────────────
function formatCurrency(value: number): string {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatTrend(value: number): string {
    const sign = value >= 0 ? "+" : ""
    return `${sign}${value.toFixed(1)}%`
}

function greeting(): string {
    const h = new Date().getHours()
    if (h < 12) return "Bom dia"
    if (h < 18) return "Boa tarde"
    return "Boa noite"
}

// ─── Sub-components ──────────────────────────────────
function StatCard({
    title, value, change, changeLabel, icon: Icon, trend, gradient,
}: {
    title: string; value: string; change: string; changeLabel: string
    icon: React.ElementType; trend: "up" | "down" | "neutral"; gradient: string
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
                                <ArrowUpRight className="h-3.5 w-3.5" />{change}
                            </div>
                        ) : trend === "down" ? (
                            <div className="flex items-center gap-0.5 text-destructive text-xs font-medium">
                                <ArrowDownRight className="h-3.5 w-3.5" />{change}
                            </div>
                        ) : (
                            <div className="flex items-center gap-0.5 text-muted-foreground text-xs font-medium">
                                <Minus className="h-3.5 w-3.5" />{change}
                            </div>
                        )}
                        <span className="text-xs text-muted-foreground">{changeLabel}</span>
                    </div>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${gradient} text-white shadow-lg shadow-primary/10 transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
            </div>
            <div className={`absolute -bottom-8 -right-8 h-24 w-24 rounded-full ${gradient} opacity-5 blur-2xl transition-opacity duration-300 group-hover:opacity-10`} />
        </div>
    )
}

function FinanceCard({
    label, value, count, countLabel, dot, color, href,
}: {
    label: string; value: string; count: number; countLabel: string
    dot: string; color: string; href: string
}) {
    return (
        <a href={href} className="rounded-2xl border bg-card p-5 card-hover block group">
            <div className="flex items-center gap-3 mb-3">
                <div className={`h-2 w-2 rounded-full ${dot}`} />
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
            </div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">
                {count === 0 ? "Nenhuma pendência" : `${count} ${countLabel}`}
            </p>
        </a>
    )
}

function QuickAction({
    title, description, icon: Icon, href,
}: {
    title: string; description: string; icon: React.ElementType; href: string
}) {
    return (
        <a href={href} className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
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

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    SCHEDULED: { label: "Agendado", color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-500/20" },
    CONFIRMED: { label: "Confirmado", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-500/20" },
    COMPLETED: { label: "Concluído", color: "text-green-600", bg: "bg-green-100 dark:bg-green-500/20" },
}

// ─── Page ────────────────────────────────────────────
export default async function DashboardPage() {
    const data = await getDashboardData()

    const trendDirection = (val: number): "up" | "down" | "neutral" =>
        val > 0 ? "up" : val < 0 ? "down" : "neutral"
    const expenseTrendDirection = (val: number): "up" | "down" | "neutral" =>
        val < 0 ? "up" : val > 0 ? "down" : "neutral"

    return (
        <div className="flex flex-col gap-6">
            {/* ═══════ Header ═══════ */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight">{greeting()}, aqui está o resumo do seu negócio</h1>
                <p className="text-sm text-muted-foreground">
                    {new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
            </div>

            {/* ═══════ KPI Cards Row ═══════ */}
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

            {/* ═══════ Financial Strip ═══════ */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Saldo em Caixa */}
                <div className="rounded-2xl border bg-card p-5 card-hover relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`h-2 w-2 rounded-full ${data.cashBalance >= 0 ? "bg-success" : "bg-destructive"} animate-pulse-soft`} />
                        <span className="text-sm font-medium text-muted-foreground">Saldo em Caixa</span>
                    </div>
                    <p className={`text-xl font-bold ${data.cashBalance >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatCurrency(data.cashBalance)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Receitas − Despesas (pagas)</p>
                    <div className={`absolute top-0 right-0 h-full w-1 ${data.cashBalance >= 0 ? "bg-success/30" : "bg-destructive/30"}`} />
                </div>

                <FinanceCard
                    label="Contas a Receber"
                    value={formatCurrency(data.accountsReceivable)}
                    count={data.accountsReceivableCount}
                    countLabel={data.accountsReceivableCount === 1 ? "fatura pendente" : "faturas pendentes"}
                    dot={data.accountsReceivableCount > 0 ? "bg-warning animate-pulse-soft" : "bg-muted-foreground"}
                    color="text-warning"
                    href="/dashboard/financeiro/contas-receber"
                />

                <FinanceCard
                    label="Contas a Pagar"
                    value={formatCurrency(data.accountsPayable)}
                    count={data.accountsPayableCount}
                    countLabel={data.accountsPayableCount === 1 ? "fatura pendente" : "faturas pendentes"}
                    dot={data.accountsPayableCount > 0 ? "bg-destructive animate-pulse-soft" : "bg-muted-foreground"}
                    color="text-destructive"
                    href="/dashboard/financeiro/contas-pagar"
                />

                {/* Orçamentos em Aberto */}
                <a href="/dashboard/servicos/orcamentos" className="rounded-2xl border bg-card p-5 card-hover block group">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`h-2 w-2 rounded-full ${data.openQuotesCount > 0 ? "bg-primary animate-pulse-soft" : "bg-muted-foreground"}`} />
                        <span className="text-sm font-medium text-muted-foreground">Orçamentos em Aberto</span>
                    </div>
                    <p className="text-xl font-bold text-primary">
                        {formatCurrency(data.openQuotesValue)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {data.openQuotesCount === 0 ? "Nenhum orçamento pendente" : `${data.openQuotesCount} orçamento${data.openQuotesCount > 1 ? "s" : ""} aguardando`}
                    </p>
                </a>
            </div>

            {/* ═══════ Mid Section: Agenda + Stock ═══════ */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Agenda de Hoje */}
                <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-primary" strokeWidth={2} />
                            <h2 className="text-base font-semibold">Agenda de Hoje</h2>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                {data.todayEventsCount} compromisso{data.todayEventsCount !== 1 ? "s" : ""}
                            </span>
                        </div>
                        <a href="/dashboard/agenda" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                            Ver agenda →
                        </a>
                    </div>

                    {data.todayEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                                <CalendarDays className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">Nenhum compromisso hoje</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {data.weekEventsCount > 0 ? `${data.weekEventsCount} evento${data.weekEventsCount > 1 ? "s" : ""} nesta semana` : "Sua agenda está livre esta semana"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {data.todayEvents.map((ev) => {
                                const status = STATUS_LABELS[ev.attendanceStatus || ""] || STATUS_LABELS.SCHEDULED
                                return (
                                    <a key={ev.id} href="/dashboard/agenda" className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted/50 transition-colors group">
                                        {/* Time */}
                                        <div className="flex flex-col items-center shrink-0 w-14">
                                            <span className="text-sm font-bold font-mono">
                                                {format(new Date(ev.startDate), "HH:mm")}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                {format(new Date(ev.endDate), "HH:mm")}
                                            </span>
                                        </div>
                                        {/* Divider */}
                                        <div className="w-0.5 h-10 bg-primary/20 rounded-full shrink-0" />
                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{ev.title}</p>
                                            {ev.customerName && (
                                                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                                    <Users className="h-3 w-3" /> {ev.customerName}
                                                </p>
                                            )}
                                        </div>
                                        {/* Status badge */}
                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${status.bg} ${status.color}`}>
                                            {status.label}
                                        </span>
                                    </a>
                                )
                            })}
                            {data.weekEventsCount > data.todayEventsCount && (
                                <p className="text-xs text-muted-foreground text-center pt-2">
                                    + {data.weekEventsCount - data.todayEventsCount} evento{(data.weekEventsCount - data.todayEventsCount) > 1 ? "s" : ""} esta semana
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Alertas de Estoque */}
                <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" strokeWidth={2} />
                            <h2 className="text-base font-semibold">Estoque</h2>
                            {data.lowStockCount > 0 && (
                                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" /> {data.lowStockCount} baixo{data.lowStockCount > 1 ? "s" : ""}
                                </span>
                            )}
                        </div>
                        <a href="/dashboard/cadastros/produtos" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                            Ver produtos →
                        </a>
                    </div>

                    {data.lowStockProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 mb-3">
                                <Package className="h-6 w-6 text-success" />
                            </div>
                            <p className="text-sm font-medium text-success">Estoque saudável!</p>
                            <p className="text-xs text-muted-foreground mt-1">{data.totalProducts} produto{data.totalProducts !== 1 ? "s" : ""} cadastrado{data.totalProducts !== 1 ? "s" : ""}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data.lowStockProducts.map((p) => {
                                const pct = Math.min((p.stockQuantity / 10) * 100, 100)
                                const barColor = p.stockQuantity === 0 ? "bg-destructive" : p.stockQuantity <= 2 ? "bg-destructive" : "bg-warning"
                                return (
                                    <div key={p.id} className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {p.stockQuantity === 0 && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                                                <span className="text-sm font-medium truncate">{p.name}</span>
                                            </div>
                                            <span className={`text-xs font-bold shrink-0 ${p.stockQuantity === 0 ? "text-destructive" : p.stockQuantity <= 2 ? "text-destructive" : "text-warning"}`}>
                                                {p.stockQuantity} un
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                            {data.lowStockCount > data.lowStockProducts.length && (
                                <p className="text-xs text-muted-foreground text-center pt-1">
                                    + {data.lowStockCount - data.lowStockProducts.length} produto{(data.lowStockCount - data.lowStockProducts.length) > 1 ? "s" : ""} com estoque baixo
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════ Bottom Section: Quick Actions ═══════ */}
            <div className="rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-primary" strokeWidth={2} />
                    <h2 className="text-base font-semibold">Ações Rápidas</h2>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <QuickAction
                        title="Nova Venda"
                        description="Registrar venda no PDV"
                        icon={ShoppingCart}
                        href="/dashboard/vendas/pdv"
                    />
                    <QuickAction
                        title="Novo Agendamento"
                        description="Agendar atendimento"
                        icon={CalendarDays}
                        href="/dashboard/agenda"
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
    )
}
