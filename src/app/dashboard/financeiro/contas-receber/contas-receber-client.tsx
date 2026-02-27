"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    format, isPast, isToday, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    isWithinInterval, addMonths, subMonths, eachDayOfInterval, isSameDay
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { confirmarPagamento } from "@/app/actions/transaction"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
    CheckCircle, Clock, AlertTriangle, AlertCircle, TrendingUp, CreditCard,
    Calendar, CalendarDays, List, Filter, ChevronLeft, ChevronRight,
} from "lucide-react"

// ── Tipos ──────────────────────────────────────────────────────────
interface ContaReceber {
    id: string
    description: string
    amount: number
    date: string
    categoryName?: string | null
    customerName?: string | null
    contaName?: string | null
    maquinaName?: string | null
    installmentNumber?: number | null
    installmentTotal?: number | null
    taxaAplicada?: number | null
    saleId?: string | null
}

type ViewMode = "all" | "month" | "week" | "today" | "3months" | "6months"

// ── Helpers ────────────────────────────────────────────────────────
function getStatusBadge(dateStr: string) {
    const date = new Date(dateStr + "T12:00:00")
    if (isPast(date) && !isToday(date)) {
        return <Badge variant="destructive" className="gap-1 text-xs"><AlertCircle className="h-3 w-3" /> Atrasada</Badge>
    }
    if (isToday(date)) {
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 gap-1 text-xs"><AlertTriangle className="h-3 w-3" /> Vence Hoje</Badge>
    }
    return <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 gap-1 text-xs"><Clock className="h-3 w-3" /> A Receber</Badge>
}

const formatBRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

// ── Componente Principal ───────────────────────────────────────────
export function ContasReceberClient({ contas }: { contas: ContaReceber[] }) {
    const router = useRouter()
    const [loading, setLoading] = useState<string | null>(null)

    // ── Filtros ──
    const [viewMode, setViewMode] = useState<ViewMode>("month")
    const [selectedMonth, setSelectedMonth] = useState(new Date())
    const [statusFilter, setStatusFilter] = useState<"all" | "overdue" | "upcoming">("all")
    const [selectedCardIndex, setSelectedCardIndex] = useState(0)
    const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode)
        setSelectedCardIndex(0)
        setSelectedDayIndex(null)
    }

    const handleConfirmar = async (id: string) => {
        setLoading(id)
        try {
            const result = await confirmarPagamento(id)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Recebimento confirmado!")
                router.refresh()
            }
        } finally {
            setLoading(null)
        }
    }

    // ── Date Range ──
    const getDateRange = useMemo(() => {
        if (viewMode === "month") {
            return { start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) }
        } else if (viewMode === "week") {
            return { start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) }
        } else if (viewMode === "3months") {
            const start = startOfMonth(selectedMonth)
            return { start, end: endOfMonth(addMonths(start, 2)) }
        } else if (viewMode === "6months") {
            const start = startOfMonth(selectedMonth)
            return { start, end: endOfMonth(addMonths(start, 5)) }
        }
        return null
    }, [viewMode, selectedMonth])

    // ── Filtragem ──
    const filteredContas = useMemo(() => {
        let result = [...contas]

        if (viewMode === "today") {
            const today = format(new Date(), "yyyy-MM-dd")
            result = result.filter(c => c.date === today)
        } else if (getDateRange) {
            result = result.filter(c => {
                const d = new Date(c.date + "T12:00:00")
                return isWithinInterval(d, getDateRange)
            })
        }

        if (statusFilter === "overdue") {
            result = result.filter(c => {
                const d = new Date(c.date + "T12:00:00")
                return isPast(d) && !isToday(d)
            })
        } else if (statusFilter === "upcoming") {
            result = result.filter(c => {
                const d = new Date(c.date + "T12:00:00")
                return !isPast(d) || isToday(d)
            })
        }

        return result
    }, [contas, viewMode, selectedMonth, statusFilter, getDateRange])

    const tableContas = useMemo(() => {
        if ((viewMode === "week" || viewMode === "month") && selectedDayIndex !== null && getDateRange) {
            const days = eachDayOfInterval(getDateRange)
            const selectedDay = days[selectedDayIndex]
            if (selectedDay) {
                const dayStr = format(selectedDay, "yyyy-MM-dd")
                return filteredContas.filter(c => c.date === dayStr)
            }
        }
        if (viewMode === "3months" || viewMode === "6months") {
            const cardMonth = addMonths(startOfMonth(selectedMonth), selectedCardIndex)
            const mStart = startOfMonth(cardMonth)
            const mEnd = endOfMonth(cardMonth)
            return filteredContas.filter(c => {
                const d = new Date(c.date + "T12:00:00")
                return isWithinInterval(d, { start: mStart, end: mEnd })
            })
        }
        return filteredContas
    }, [filteredContas, viewMode, selectedMonth, selectedCardIndex, selectedDayIndex, getDateRange])

    // ── Cards de período ──
    const periodCards = useMemo(() => {
        if (viewMode === "today" || viewMode === "all") return []

        if (viewMode === "week" && getDateRange) {
            const days = eachDayOfInterval(getDateRange)
            return days.map(day => {
                const dayStr = format(day, "yyyy-MM-dd")
                const dayContas = filteredContas.filter(c => c.date === dayStr)
                const total = dayContas.reduce((s, c) => s + c.amount, 0)
                return { label: format(day, "EEE", { locale: ptBR }), sublabel: format(day, "dd/MM"), total, count: dayContas.length, isToday: isSameDay(day, new Date()) }
            })
        }

        if (viewMode === "month" && getDateRange) {
            const days = eachDayOfInterval(getDateRange)
            return days.map(day => {
                const dayStr = format(day, "yyyy-MM-dd")
                const dayContas = filteredContas.filter(c => c.date === dayStr)
                const total = dayContas.reduce((s, c) => s + c.amount, 0)
                return { label: format(day, "dd"), sublabel: format(day, "EEE", { locale: ptBR }), total, count: dayContas.length, isToday: isSameDay(day, new Date()) }
            })
        }

        if ((viewMode === "3months" || viewMode === "6months") && getDateRange) {
            const numMonths = viewMode === "3months" ? 3 : 6
            return Array.from({ length: numMonths }, (_, i) => {
                const monthDate = addMonths(startOfMonth(selectedMonth), i)
                const mStart = startOfMonth(monthDate)
                const mEnd = endOfMonth(monthDate)
                const monthContas = filteredContas.filter(c => {
                    const d = new Date(c.date + "T12:00:00")
                    return isWithinInterval(d, { start: mStart, end: mEnd })
                })
                const total = monthContas.reduce((s, c) => s + c.amount, 0)
                return { label: format(monthDate, "MMM", { locale: ptBR }), sublabel: format(monthDate, "yyyy"), total, count: monthContas.length, isToday: isSameDay(startOfMonth(new Date()), mStart) }
            })
        }

        return []
    }, [viewMode, getDateRange, filteredContas, selectedMonth])

    const total = filteredContas.reduce((s, c) => s + c.amount, 0)
    const contasCartao = filteredContas.filter(c => c.maquinaName)
    const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: ptBR })

    const periodLabel = useMemo(() => {
        if (viewMode === "3months") {
            return `${format(selectedMonth, "MMM/yy", { locale: ptBR })} — ${format(addMonths(selectedMonth, 2), "MMM/yy", { locale: ptBR })}`
        }
        if (viewMode === "6months") {
            return `${format(selectedMonth, "MMM/yy", { locale: ptBR })} — ${format(addMonths(selectedMonth, 5), "MMM/yy", { locale: ptBR })}`
        }
        return monthLabel
    }, [viewMode, selectedMonth, monthLabel])

    return (
        <div className="space-y-4">
            {/* Resumo */}
            <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">
                        Total a Receber {viewMode === "month" ? `em ${monthLabel}` : viewMode === "week" ? "esta semana" : viewMode === "today" ? "hoje" : viewMode !== "all" ? `em ${periodLabel}` : ""}
                    </p>
                    <p className="text-2xl font-bold text-emerald-500">
                        {formatBRL(total)}
                    </p>
                </div>
                <div className="ml-auto flex gap-4 text-sm text-muted-foreground">
                    {contasCartao.length > 0 && (
                        <div className="flex items-center gap-1">
                            <CreditCard className="h-4 w-4" />
                            {contasCartao.length} parcela{contasCartao.length !== 1 ? "s" : ""} cartão
                        </div>
                    )}
                    <div>{tableContas.length} registro{tableContas.length !== 1 ? "s" : ""}</div>
                </div>
            </div>

            {/* ── Barra de filtros ── */}
            <div className="rounded-xl border bg-card px-4 py-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Filter className="h-4 w-4" />
                        <span className="font-medium">Visualizar:</span>
                    </div>

                    {/* Período */}
                    <div className="flex rounded-lg border overflow-hidden">
                        {([
                            { value: "today" as ViewMode, label: "Hoje", icon: <Calendar className="h-3.5 w-3.5" /> },
                            { value: "week" as ViewMode, label: "Semana", icon: <CalendarDays className="h-3.5 w-3.5" /> },
                            { value: "month" as ViewMode, label: "Mês", icon: <CalendarDays className="h-3.5 w-3.5" /> },
                            { value: "3months" as ViewMode, label: "3 Meses", icon: <CalendarDays className="h-3.5 w-3.5" /> },
                            { value: "6months" as ViewMode, label: "6 Meses", icon: <CalendarDays className="h-3.5 w-3.5" /> },
                            { value: "all" as ViewMode, label: "Tudo", icon: <List className="h-3.5 w-3.5" /> },
                        ]).map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => handleViewModeChange(opt.value)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === opt.value
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted text-muted-foreground"
                                    }`}
                            >
                                {opt.icon} {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Navegação de período */}
                    {(viewMode === "month" || viewMode === "3months" || viewMode === "6months") && (
                        <div className="flex items-center gap-1 ml-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedMonth(prev => subMonths(prev, viewMode === "6months" ? 6 : viewMode === "3months" ? 3 : 1))}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium min-w-[140px] text-center capitalize">{viewMode === "month" ? monthLabel : periodLabel}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedMonth(prev => addMonths(prev, viewMode === "6months" ? 6 : viewMode === "3months" ? 3 : 1))}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    <div className="h-5 w-px bg-border mx-1 hidden sm:block" />

                    {/* Status */}
                    <div className="flex rounded-lg border overflow-hidden">
                        {([
                            { value: "all" as const, label: "Todas" },
                            { value: "overdue" as const, label: "Vencidas" },
                            { value: "upcoming" as const, label: "A Vencer" },
                        ]).map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setStatusFilter(opt.value)}
                                className={`px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === opt.value
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted text-muted-foreground"
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <span className="ml-auto text-xs text-muted-foreground">{tableContas.length} registro{tableContas.length !== 1 ? "s" : ""}</span>
                </div>
            </div>

            {/* ── Cards de Período ── */}
            {periodCards.length > 0 && (
                <div className="grid gap-2"
                    style={{
                        gridTemplateColumns:
                            viewMode === "week" ? "repeat(7, minmax(0, 1fr))" :
                                viewMode === "3months" ? "repeat(3, minmax(0, 1fr))" :
                                    viewMode === "6months" ? "repeat(6, minmax(0, 1fr))" :
                                        "repeat(auto-fill, minmax(80px, 1fr))"
                    }}
                >
                    {periodCards.map((card, i) => {
                        const isMultiMonth = viewMode === "3months" || viewMode === "6months"
                        const isDaySelectable = viewMode === "week" || viewMode === "month"
                        const isSelectable = isMultiMonth || isDaySelectable
                        const isSelected = isMultiMonth
                            ? selectedCardIndex === i
                            : isDaySelectable
                                ? selectedDayIndex === i
                                : false

                        const handleCardClick = () => {
                            if (isMultiMonth) {
                                setSelectedCardIndex(i)
                            } else if (isDaySelectable) {
                                setSelectedDayIndex(prev => prev === i ? null : i)
                            }
                        }

                        if (card.isToday) {
                            return (
                                <div
                                    key={i}
                                    onClick={isSelectable ? handleCardClick : undefined}
                                    className={`rounded-xl border p-2 text-center transition-all shadow-md bg-blue-700 border-blue-700 dark:bg-white dark:border-gray-300 ${isSelectable ? "cursor-pointer" : ""} ${isSelected ? "ring-2 ring-offset-1" : ""}`}
                                >
                                    <p className="text-[10px] font-semibold uppercase text-white dark:text-slate-800">{card.label}</p>
                                    <p className="text-[9px] opacity-70 text-white dark:text-slate-800">{card.sublabel}</p>
                                    {card.total > 0 ? (
                                        <p className="text-xs font-bold mt-0.5 text-white dark:text-slate-800">{formatBRL(card.total)}</p>
                                    ) : (
                                        <p className="text-[10px] mt-0.5 opacity-50 text-white dark:text-slate-800">—</p>
                                    )}
                                </div>
                            )
                        }

                        return (
                            <div
                                key={i}
                                onClick={isSelectable ? handleCardClick : undefined}
                                className={`rounded-xl border p-2 text-center transition-all ${isSelectable ? "cursor-pointer hover:ring-1 hover:ring-primary/30" : ""
                                    } ${isSelected
                                        ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm"
                                        : card.total > 0
                                            ? "bg-emerald-500/5 border-emerald-500/20"
                                            : "bg-muted/30 border-muted"
                                    }`}
                            >
                                <p className={`text-[10px] font-semibold uppercase ${isSelected ? "text-primary" : "text-muted-foreground"
                                    }`}>
                                    {card.label}
                                </p>
                                <p className="text-[9px] text-muted-foreground">{card.sublabel}</p>
                                {card.total > 0 ? (
                                    <p className="text-xs font-bold text-emerald-500 mt-0.5">
                                        {formatBRL(card.total)}
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">—</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Lista */}
            {tableContas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground rounded-xl border bg-card">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                    <p className="text-lg font-medium">Nenhuma conta a receber!</p>
                    <p className="text-sm">
                        {viewMode === "all"
                            ? "Todas as suas receitas foram recebidas."
                            : `Nenhuma receita para ${viewMode === "month" ? monthLabel : viewMode === "week" ? "esta semana" : viewMode === "today" ? "hoje" : periodLabel}.`}
                    </p>
                </div>
            ) : (
                <div className="rounded-xl border bg-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Descrição</th>
                                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Valor</th>
                                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Vencimento</th>
                                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Maquininha</th>
                                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableContas.map((conta) => (
                                <tr key={conta.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${conta.saleId ? "cursor-pointer" : ""}`}>
                                    <td className="px-4 py-3">
                                        {conta.saleId ? (
                                            <Link href={`/dashboard/vendas/${conta.saleId}`} className="group">
                                                <div className="font-medium text-primary group-hover:underline">{conta.description}</div>
                                                {conta.customerName && (
                                                    <div className="text-xs text-muted-foreground">{conta.customerName}</div>
                                                )}
                                                {conta.installmentTotal && conta.installmentTotal > 1 && (
                                                    <div className="text-xs text-muted-foreground">
                                                        Parcela {conta.installmentNumber}/{conta.installmentTotal}
                                                    </div>
                                                )}
                                            </Link>
                                        ) : (
                                            <>
                                                <div className="font-medium">{conta.description}</div>
                                                {conta.customerName && (
                                                    <div className="text-xs text-muted-foreground">{conta.customerName}</div>
                                                )}
                                                {conta.installmentTotal && conta.installmentTotal > 1 && (
                                                    <div className="text-xs text-muted-foreground">
                                                        Parcela {conta.installmentNumber}/{conta.installmentTotal}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-emerald-500">
                                            {formatBRL(conta.amount)}
                                        </div>
                                        {conta.taxaAplicada && conta.taxaAplicada > 0 && (
                                            <div className="text-xs text-muted-foreground">
                                                Taxa: {(conta.taxaAplicada * 100).toFixed(2)}%
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {format(new Date(conta.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                                    </td>
                                    <td className="px-4 py-3">{getStatusBadge(conta.date)}</td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                        {conta.maquinaName || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleConfirmar(conta.id)}
                                            disabled={loading === conta.id}
                                            className="gap-1"
                                        >
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            {loading === conta.id ? "..." : "Receber"}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
