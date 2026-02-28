"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCreditCardInvoice } from "@/app/actions/conta-financeira"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    addMonths, subMonths, isWithinInterval, eachDayOfInterval,
    getDaysInMonth, isSameDay, isPast, isToday, addDays,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    CreditCard, ArrowLeft, ChevronLeft, ChevronRight, Receipt,
    Calendar, CalendarDays, List, Filter,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────

interface ContaInfo {
    id: string
    name: string
    cardBrand: string | null
    closingDay: number
    dueDay: number
    creditLimit: number | null
    balance: number
}

interface InvoiceItem {
    id: string
    description: string
    amount: number
    type: string
    status: string
    date: string
    categoryName: string | null
    supplierName: string | null
}

type ViewMode = "today" | "week" | "month" | "3months" | "6months" | "all"
type StatusFilter = "all" | "paid" | "pending"

const formatBRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

// ── Component ────────────────────────────────────────────────────────

export function FaturaClient({ conta, initialItems }: { conta: ContaInfo; initialItems: InvoiceItem[] }) {
    const router = useRouter()
    const [items] = useState<InvoiceItem[]>(initialItems)

    // ── Filtros ──
    const [viewMode, setViewMode] = useState<ViewMode>("month")
    const [selectedMonth, setSelectedMonth] = useState(new Date())
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
    const [selectedCardIndex, setSelectedCardIndex] = useState(0)
    const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode)
        setSelectedCardIndex(0)
        setSelectedDayIndex(null)
    }

    // ── Filtragem ──
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

    const filteredItems = useMemo(() => {
        let result = [...items]

        // Filtro por período
        if (viewMode === "today") {
            const today = format(new Date(), "yyyy-MM-dd")
            result = result.filter(c => c.date.startsWith(today))
        } else if (getDateRange) {
            result = result.filter(c => {
                const d = new Date(c.date)
                return isWithinInterval(d, getDateRange)
            })
        }

        // Filtro por status
        if (statusFilter === "paid") {
            result = result.filter(c => c.status === "paid")
        } else if (statusFilter === "pending") {
            result = result.filter(c => c.status !== "paid")
        }

        return result
    }, [items, viewMode, selectedMonth, statusFilter, getDateRange])

    const tableItems = useMemo(() => {
        if ((viewMode === "week" || viewMode === "month") && selectedDayIndex !== null && getDateRange) {
            const days = eachDayOfInterval(getDateRange)
            const selectedDay = days[selectedDayIndex]
            if (selectedDay) {
                const dayStr = format(selectedDay, "yyyy-MM-dd")
                return filteredItems.filter(c => c.date.startsWith(dayStr))
            }
        }
        if (viewMode === "3months" || viewMode === "6months") {
            const cardMonth = addMonths(startOfMonth(selectedMonth), selectedCardIndex)
            const mStart = startOfMonth(cardMonth)
            const mEnd = endOfMonth(cardMonth)
            return filteredItems.filter(c => {
                const d = new Date(c.date)
                return isWithinInterval(d, { start: mStart, end: mEnd })
            })
        }
        return filteredItems
    }, [filteredItems, viewMode, selectedMonth, selectedCardIndex, selectedDayIndex, getDateRange])

    // ── Cards de período ──
    const periodCards = useMemo(() => {
        if (viewMode === "today" || viewMode === "all") return []

        if (viewMode === "week" && getDateRange) {
            const days = eachDayOfInterval(getDateRange)
            return days.map(day => {
                const dayStr = format(day, "yyyy-MM-dd")
                const dayItems = filteredItems.filter(c => c.date.startsWith(dayStr))
                const total = dayItems.reduce((s, c) => s + c.amount, 0)
                return {
                    label: format(day, "EEE", { locale: ptBR }),
                    sublabel: format(day, "dd/MM"),
                    total,
                    count: dayItems.length,
                    isToday: isSameDay(day, new Date()),
                }
            })
        }

        if (viewMode === "month" && getDateRange) {
            const days = eachDayOfInterval(getDateRange)
            return days.map(day => {
                const dayStr = format(day, "yyyy-MM-dd")
                const dayItems = filteredItems.filter(c => c.date.startsWith(dayStr))
                const total = dayItems.reduce((s, c) => s + c.amount, 0)
                return {
                    label: format(day, "dd"),
                    sublabel: format(day, "EEE", { locale: ptBR }),
                    total,
                    count: dayItems.length,
                    isToday: isSameDay(day, new Date()),
                }
            })
        }

        if ((viewMode === "3months" || viewMode === "6months") && getDateRange) {
            const numMonths = viewMode === "3months" ? 3 : 6
            return Array.from({ length: numMonths }, (_, i) => {
                const monthDate = addMonths(startOfMonth(selectedMonth), i)
                const mStart = startOfMonth(monthDate)
                const mEnd = endOfMonth(monthDate)
                const monthItems = filteredItems.filter(c => {
                    const d = new Date(c.date)
                    return isWithinInterval(d, { start: mStart, end: mEnd })
                })
                const total = monthItems.reduce((s, c) => s + c.amount, 0)
                return {
                    label: format(monthDate, "MMM", { locale: ptBR }),
                    sublabel: format(monthDate, "yyyy"),
                    total,
                    count: monthItems.length,
                    isToday: isSameDay(startOfMonth(new Date()), mStart),
                }
            })
        }

        return []
    }, [viewMode, getDateRange, filteredItems, selectedMonth])

    const total = filteredItems.reduce((s, c) => s + c.amount, 0)
    const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: ptBR })
    const periodLabel = useMemo(() => {
        if (viewMode === "3months") {
            const start = format(selectedMonth, "MMM/yy", { locale: ptBR })
            const end = format(addMonths(selectedMonth, 2), "MMM/yy", { locale: ptBR })
            return `${start} — ${end}`
        }
        if (viewMode === "6months") {
            const start = format(selectedMonth, "MMM/yy", { locale: ptBR })
            const end = format(addMonths(selectedMonth, 5), "MMM/yy", { locale: ptBR })
            return `${start} — ${end}`
        }
        return monthLabel
    }, [viewMode, selectedMonth, monthLabel])

    return (
        <div className="space-y-4">
            {/* ── Header ── */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => router.push("/dashboard/financeiro/contas")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-violet-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                Fatura — {conta.name}
                                {conta.cardBrand && <Badge variant="outline" className="text-xs">{conta.cardBrand}</Badge>}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Melhor data de compra: dia {conta.closingDay} · Vencimento: dia {conta.dueDay}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Limite do cartão ── */}
            {conta.creditLimit != null && (
                <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Limite de Crédito</span>
                        <span className="font-semibold">{formatBRL(conta.creditLimit)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-violet-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, conta.creditLimit > 0 ? (Math.abs(conta.balance) / conta.creditLimit) * 100 : 0)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Usado: {formatBRL(Math.abs(conta.balance))}</span>
                        <span>Disponível: {formatBRL(Math.max(0, conta.creditLimit - Math.abs(conta.balance)))}</span>
                    </div>
                </div>
            )}

            {/* ── Resumo total ── */}
            <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                        <CreditCard className="h-6 w-6 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">Total da Fatura {viewMode === "month" ? `em ${monthLabel}` : viewMode === "week" ? "esta semana" : viewMode === "today" ? "hoje" : viewMode === "3months" || viewMode === "6months" ? `em ${periodLabel}` : ""}</p>
                        <p className="text-2xl font-bold text-violet-600">{formatBRL(total)}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{tableItems.length} lançamento{tableItems.length !== 1 ? "s" : ""}</span>
                </div>
            </div>

            {/* ── Barra de filtros (idêntica ao contas a pagar) ── */}
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
                            { value: "all" as const, label: "Todos" },
                            { value: "paid" as const, label: "Pagos" },
                            { value: "pending" as const, label: "Pendentes" },
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

                    <span className="ml-auto text-xs text-muted-foreground">{tableItems.length} registro{tableItems.length !== 1 ? "s" : ""}</span>
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
                                            ? "bg-violet-500/5 border-violet-500/20"
                                            : "bg-muted/30 border-muted"
                                    }`}
                            >
                                <p className={`text-[10px] font-semibold uppercase ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                                    {card.label}
                                </p>
                                <p className="text-[9px] text-muted-foreground">{card.sublabel}</p>
                                {card.total > 0 ? (
                                    <p className="text-xs font-bold text-violet-500 mt-0.5">{formatBRL(card.total)}</p>
                                ) : (
                                    <p className="text-[10px] mt-0.5 text-muted-foreground">—</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ── Tabela de lançamentos ── */}
            {tableItems.length > 0 ? (
                <div className="rounded-xl border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left p-3 font-medium">Data</th>
                                <th className="text-left p-3 font-medium">Descrição</th>
                                <th className="text-left p-3 font-medium">Categoria</th>
                                <th className="text-left p-3 font-medium">Fornecedor</th>
                                <th className="text-right p-3 font-medium">Valor</th>
                                <th className="text-center p-3 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableItems.map(item => (
                                <tr key={item.id} className="border-t hover:bg-muted/20 transition-colors">
                                    <td className="p-3 text-xs whitespace-nowrap">
                                        {new Date(item.date).toLocaleDateString("pt-BR")}
                                    </td>
                                    <td className="p-3">
                                        <span className="font-medium">{item.description}</span>
                                    </td>
                                    <td className="p-3 text-xs text-muted-foreground">{item.categoryName || "—"}</td>
                                    <td className="p-3 text-xs text-muted-foreground">{item.supplierName || "—"}</td>
                                    <td className="p-3 text-right font-semibold">{formatBRL(item.amount)}</td>
                                    <td className="p-3 text-center">
                                        <Badge
                                            variant={item.status === "paid" ? "default" : "secondary"}
                                            className="text-[10px]"
                                        >
                                            {item.status === "paid" ? "Pago" : "Pendente"}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Nenhum lançamento</p>
                    <p className="text-sm">Não há lançamentos neste período para o cartão {conta.name}.</p>
                </div>
            )}
        </div>
    )
}
