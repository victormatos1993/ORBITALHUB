"use client"

import { useState, useMemo } from "react"
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    isWithinInterval, addMonths, subMonths, eachDayOfInterval, isSameDay
} from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    TrendingUp, Calendar, CalendarDays, List, Filter,
    ChevronLeft, ChevronRight, Search, Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// ── Tipos ──
interface Receita {
    id: string
    description: string
    amount: number
    date: string
    paidAt: string | null
    categoryName?: string
    customerName?: string
    supplierName?: string
    saleId?: string | null
}

type ViewMode = "all" | "month" | "week" | "today" | "3months" | "6months"

const formatBRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

/** Regime de caixa: usa data de recebimento efetivo */
const getCashDate = (r: Receita): string => r.paidAt || r.date

// ── Componente Principal ──
export function ReceitasClient({ receitas }: { receitas: Receita[] }) {
    const [viewMode, setViewMode] = useState<ViewMode>("month")
    const [selectedMonth, setSelectedMonth] = useState(new Date())
    const [selectedCardIndex, setSelectedCardIndex] = useState(0)
    const [search, setSearch] = useState("")

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode)
        setSelectedCardIndex(0)
    }

    // ── Date Range ──
    const getDateRange = useMemo(() => {
        if (viewMode === "month") return { start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) }
        if (viewMode === "week") return { start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) }
        if (viewMode === "3months") { const s = startOfMonth(selectedMonth); return { start: s, end: endOfMonth(addMonths(s, 2)) } }
        if (viewMode === "6months") { const s = startOfMonth(selectedMonth); return { start: s, end: endOfMonth(addMonths(s, 5)) } }
        return null
    }, [viewMode, selectedMonth])

    // ── Filtragem (regime de caixa — usa paidAt) ──
    const filteredReceitas = useMemo(() => {
        let result = [...receitas]

        if (viewMode === "today") {
            const today = format(new Date(), "yyyy-MM-dd")
            result = result.filter(c => getCashDate(c) === today)
        } else if (getDateRange) {
            result = result.filter(c => {
                const d = new Date(getCashDate(c) + "T12:00:00")
                return isWithinInterval(d, getDateRange)
            })
        }

        if (search) {
            const s = search.toLowerCase()
            result = result.filter(c =>
                c.description.toLowerCase().includes(s) ||
                c.customerName?.toLowerCase().includes(s) ||
                c.categoryName?.toLowerCase().includes(s)
            )
        }

        return result
    }, [receitas, viewMode, selectedMonth, getDateRange, search])

    // ── Table data (sub-filter for 3m/6m) ──
    const tableReceitas = useMemo(() => {
        if (viewMode !== "3months" && viewMode !== "6months") return filteredReceitas
        const cardMonth = addMonths(startOfMonth(selectedMonth), selectedCardIndex)
        const mStart = startOfMonth(cardMonth)
        const mEnd = endOfMonth(cardMonth)
        return filteredReceitas.filter(c => {
            const d = new Date(getCashDate(c) + "T12:00:00")
            return isWithinInterval(d, { start: mStart, end: mEnd })
        })
    }, [filteredReceitas, viewMode, selectedMonth, selectedCardIndex])

    // ── Cards de período ──
    const periodCards = useMemo(() => {
        if (viewMode === "today" || viewMode === "all") return []

        if (viewMode === "week" && getDateRange) {
            return eachDayOfInterval(getDateRange).map(day => {
                const dayStr = format(day, "yyyy-MM-dd")
                const dayItems = filteredReceitas.filter(c => getCashDate(c) === dayStr)
                return { label: format(day, "EEE", { locale: ptBR }), sublabel: format(day, "dd/MM"), total: dayItems.reduce((s, c) => s + c.amount, 0), isToday: isSameDay(day, new Date()) }
            })
        }

        if (viewMode === "month" && getDateRange) {
            return eachDayOfInterval(getDateRange).map(day => {
                const dayStr = format(day, "yyyy-MM-dd")
                const dayItems = filteredReceitas.filter(c => getCashDate(c) === dayStr)
                return { label: format(day, "dd"), sublabel: format(day, "EEE", { locale: ptBR }), total: dayItems.reduce((s, c) => s + c.amount, 0), isToday: isSameDay(day, new Date()) }
            })
        }

        if ((viewMode === "3months" || viewMode === "6months") && getDateRange) {
            const n = viewMode === "3months" ? 3 : 6
            return Array.from({ length: n }, (_, i) => {
                const md = addMonths(startOfMonth(selectedMonth), i)
                const mS = startOfMonth(md), mE = endOfMonth(md)
                const items = filteredReceitas.filter(c => { const d = new Date(getCashDate(c) + "T12:00:00"); return isWithinInterval(d, { start: mS, end: mE }) })
                return { label: format(md, "MMM", { locale: ptBR }), sublabel: format(md, "yyyy"), total: items.reduce((s, c) => s + c.amount, 0), isToday: isSameDay(startOfMonth(new Date()), mS) }
            })
        }
        return []
    }, [viewMode, getDateRange, filteredReceitas, selectedMonth])

    const total = filteredReceitas.reduce((s, c) => s + c.amount, 0)
    const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: ptBR })
    const periodLabel = useMemo(() => {
        if (viewMode === "3months") return `${format(selectedMonth, "MMM/yy", { locale: ptBR })} — ${format(addMonths(selectedMonth, 2), "MMM/yy", { locale: ptBR })}`
        if (viewMode === "6months") return `${format(selectedMonth, "MMM/yy", { locale: ptBR })} — ${format(addMonths(selectedMonth, 5), "MMM/yy", { locale: ptBR })}`
        return monthLabel
    }, [viewMode, selectedMonth, monthLabel])

    const exportCSV = () => {
        const header = "Descrição;Valor;Data Vencimento;Data Recebimento;Categoria;Cliente\n"
        const rows = tableReceitas.map(r => `${r.description};${r.amount.toFixed(2)};${r.date};${r.paidAt || ""};${r.categoryName || ""};${r.customerName || ""}`).join("\n")
        const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a"); a.href = url; a.download = `receitas_${format(new Date(), "yyyy-MM-dd")}.csv`; a.click()
    }

    return (
        <div className="space-y-4">
            {/* Resumo */}
            <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">
                        Total Recebido {viewMode === "month" ? `em ${monthLabel}` : viewMode === "week" ? "esta semana" : viewMode === "today" ? "hoje" : viewMode !== "all" ? `em ${periodLabel}` : ""}
                    </p>
                    <p className="text-2xl font-bold text-emerald-500">{formatBRL(total)}</p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{tableReceitas.length} registro{tableReceitas.length !== 1 ? "s" : ""}</span>
                    <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1">
                        <Download className="h-3.5 w-3.5" /> Exportar
                    </Button>
                </div>
            </div>

            {/* Barra de filtros */}
            <div className="rounded-xl border bg-card px-4 py-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Filter className="h-4 w-4" />
                        <span className="font-medium">Período:</span>
                    </div>

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
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === opt.value ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                            >
                                {opt.icon} {opt.label}
                            </button>
                        ))}
                    </div>

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

                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Buscar..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-8 h-8 w-48 text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* Cards de Período */}
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
                        const isSelectable = viewMode === "3months" || viewMode === "6months"
                        const isSelected = isSelectable && selectedCardIndex === i
                        return (
                            <div
                                key={i}
                                onClick={isSelectable ? () => setSelectedCardIndex(i) : undefined}
                                className={`rounded-xl border p-2 text-center transition-all ${isSelectable ? "cursor-pointer hover:ring-1 hover:ring-primary/30" : ""} ${isSelected
                                        ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm"
                                        : card.isToday ? "border-primary/50 bg-primary/5"
                                            : card.total > 0 ? "bg-emerald-500/5 border-emerald-500/20"
                                                : "bg-muted/30 border-muted"
                                    }`}
                            >
                                <p className={`text-[10px] font-semibold uppercase ${isSelected || card.isToday ? "text-primary" : "text-muted-foreground"}`}>{card.label}</p>
                                <p className="text-[9px] text-muted-foreground">{card.sublabel}</p>
                                {card.total > 0 ? (
                                    <p className="text-xs font-bold text-emerald-500 mt-0.5">{formatBRL(card.total)}</p>
                                ) : (
                                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">—</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Tabela */}
            {tableReceitas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground rounded-xl border bg-card">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-emerald-500/30" />
                    <p className="text-lg font-medium">Nenhuma receita encontrada</p>
                    <p className="text-sm">Nenhum recebimento registrado para este período.</p>
                </div>
            ) : (
                <div className="rounded-xl border bg-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Descrição</th>
                                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Cliente</th>
                                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Categoria</th>
                                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Valor</th>
                                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Recebido em</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableReceitas.map((r) => (
                                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{r.description}</div>
                                        {r.saleId && <div className="text-xs text-muted-foreground">Venda #{r.saleId.slice(-6)}</div>}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.customerName || "—"}</td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.categoryName || "—"}</td>
                                    <td className="px-4 py-3 text-right font-medium text-emerald-500">{formatBRL(r.amount)}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {r.paidAt ? format(new Date(r.paidAt + "T12:00:00"), "dd/MM/yyyy") : format(new Date(r.date + "T12:00:00"), "dd/MM/yyyy")}
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
