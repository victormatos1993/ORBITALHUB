"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    isWithinInterval, addMonths, subMonths, eachDayOfInterval, isSameDay
} from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    ShoppingCart, Calendar, CalendarDays, List, Filter,
    ChevronLeft, ChevronRight, Search, Download, Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SaleActions } from "@/components/sales/sale-actions"

// ── Tipos ──
interface Sale {
    id: string
    date: string | Date
    totalAmount: any
    status: string
    customer?: { name: string } | null
    items?: { product?: { name: string } | null; service?: { name: string } | null; quantity: number }[]
}

type ViewMode = "all" | "month" | "week" | "today" | "3months" | "6months"

const formatBRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

const getSaleDate = (s: Sale): string => {
    const d = typeof s.date === "string" ? s.date : s.date.toISOString()
    return d.split("T")[0]
}

// ── Componente Principal ──
export function VendasClient({ sales }: { sales: Sale[] }) {
    const [viewMode, setViewMode] = useState<ViewMode>("month")
    const [selectedMonth, setSelectedMonth] = useState(new Date())
    const [selectedCardIndex, setSelectedCardIndex] = useState(0)
    const [search, setSearch] = useState("")

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode)
        setSelectedCardIndex(0)
    }

    const getDateRange = useMemo(() => {
        if (viewMode === "month") return { start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) }
        if (viewMode === "week") return { start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) }
        if (viewMode === "3months") { const s = startOfMonth(selectedMonth); return { start: s, end: endOfMonth(addMonths(s, 2)) } }
        if (viewMode === "6months") { const s = startOfMonth(selectedMonth); return { start: s, end: endOfMonth(addMonths(s, 5)) } }
        return null
    }, [viewMode, selectedMonth])

    const filteredSales = useMemo(() => {
        let result = [...sales]

        if (viewMode === "today") {
            const today = format(new Date(), "yyyy-MM-dd")
            result = result.filter(s => getSaleDate(s) === today)
        } else if (getDateRange) {
            result = result.filter(s => {
                const d = new Date(getSaleDate(s) + "T12:00:00")
                return isWithinInterval(d, getDateRange)
            })
        }

        if (search) {
            const q = search.toLowerCase()
            result = result.filter(s =>
                s.customer?.name?.toLowerCase().includes(q) ||
                s.id.toLowerCase().includes(q) ||
                s.items?.some(i => i.product?.name?.toLowerCase().includes(q) || i.service?.name?.toLowerCase().includes(q))
            )
        }

        return result
    }, [sales, viewMode, selectedMonth, getDateRange, search])

    const tableSales = useMemo(() => {
        if (viewMode !== "3months" && viewMode !== "6months") return filteredSales
        const cardMonth = addMonths(startOfMonth(selectedMonth), selectedCardIndex)
        const mStart = startOfMonth(cardMonth)
        const mEnd = endOfMonth(cardMonth)
        return filteredSales.filter(s => {
            const d = new Date(getSaleDate(s) + "T12:00:00")
            return isWithinInterval(d, { start: mStart, end: mEnd })
        })
    }, [filteredSales, viewMode, selectedMonth, selectedCardIndex])

    const periodCards = useMemo(() => {
        if (viewMode === "today" || viewMode === "all") return []

        if (viewMode === "week" && getDateRange) {
            return eachDayOfInterval(getDateRange).map(day => {
                const dayStr = format(day, "yyyy-MM-dd")
                const dayItems = filteredSales.filter(s => getSaleDate(s) === dayStr)
                return { label: format(day, "EEE", { locale: ptBR }), sublabel: format(day, "dd/MM"), total: dayItems.reduce((sum, s) => sum + Number(s.totalAmount), 0), count: dayItems.length, isToday: isSameDay(day, new Date()) }
            })
        }

        if (viewMode === "month" && getDateRange) {
            return eachDayOfInterval(getDateRange).map(day => {
                const dayStr = format(day, "yyyy-MM-dd")
                const dayItems = filteredSales.filter(s => getSaleDate(s) === dayStr)
                return { label: format(day, "dd"), sublabel: format(day, "EEE", { locale: ptBR }), total: dayItems.reduce((sum, s) => sum + Number(s.totalAmount), 0), count: dayItems.length, isToday: isSameDay(day, new Date()) }
            })
        }

        if ((viewMode === "3months" || viewMode === "6months") && getDateRange) {
            const n = viewMode === "3months" ? 3 : 6
            return Array.from({ length: n }, (_, i) => {
                const md = addMonths(startOfMonth(selectedMonth), i)
                const mS = startOfMonth(md), mE = endOfMonth(md)
                const items = filteredSales.filter(s => { const d = new Date(getSaleDate(s) + "T12:00:00"); return isWithinInterval(d, { start: mS, end: mE }) })
                return { label: format(md, "MMM", { locale: ptBR }), sublabel: format(md, "yyyy"), total: items.reduce((sum, s) => sum + Number(s.totalAmount), 0), count: items.length, isToday: isSameDay(startOfMonth(new Date()), mS) }
            })
        }
        return []
    }, [viewMode, getDateRange, filteredSales, selectedMonth])

    const total = filteredSales.reduce((sum, s) => sum + Number(s.totalAmount), 0)
    const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: ptBR })
    const periodLabel = useMemo(() => {
        if (viewMode === "3months") return `${format(selectedMonth, "MMM/yy", { locale: ptBR })} — ${format(addMonths(selectedMonth, 2), "MMM/yy", { locale: ptBR })}`
        if (viewMode === "6months") return `${format(selectedMonth, "MMM/yy", { locale: ptBR })} — ${format(addMonths(selectedMonth, 5), "MMM/yy", { locale: ptBR })}`
        return monthLabel
    }, [viewMode, selectedMonth, monthLabel])

    const exportCSV = () => {
        const header = "ID;Data;Cliente;Status;Total\n"
        const rows = tableSales.map(s => `#${s.id.slice(-6).toUpperCase()};${getSaleDate(s)};${s.customer?.name || "N/I"};${s.status};${Number(s.totalAmount).toFixed(2)}`).join("\n")
        const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a"); a.href = url; a.download = `vendas_${format(new Date(), "yyyy-MM-dd")}.csv`; a.click()
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Histórico de Vendas</h1>
                    <p className="text-muted-foreground text-sm">Registro de todas as vendas realizadas</p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/vendas/pdv">
                        <Plus className="mr-2 h-4 w-4" /> Nova Venda (PDV)
                    </Link>
                </Button>
            </div>

            {/* Resumo */}
            <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">
                        Total em Vendas {viewMode === "month" ? `em ${monthLabel}` : viewMode === "week" ? "esta semana" : viewMode === "today" ? "hoje" : viewMode !== "all" ? `em ${periodLabel}` : ""}
                    </p>
                    <p className="text-2xl font-bold text-blue-500">{formatBRL(total)}</p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{tableSales.length} venda{tableSales.length !== 1 ? "s" : ""}</span>
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
                            placeholder="Buscar cliente, ID ou produto..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-8 h-8 w-56 text-xs"
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
                                            : card.total > 0 ? "bg-blue-500/5 border-blue-500/20"
                                                : "bg-muted/30 border-muted"
                                    }`}
                            >
                                <p className={`text-[10px] font-semibold uppercase ${isSelected || card.isToday ? "text-primary" : "text-muted-foreground"}`}>{card.label}</p>
                                <p className="text-[9px] text-muted-foreground">{card.sublabel}</p>
                                {card.total > 0 ? (
                                    <p className="text-xs font-bold text-blue-500 mt-0.5">{formatBRL(card.total)}</p>
                                ) : (
                                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">—</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Tabela */}
            {tableSales.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground rounded-xl border bg-card">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-blue-500/30" />
                    <p className="text-lg font-medium">Nenhuma venda encontrada</p>
                    <p className="text-sm">Nenhuma venda registrada neste período.</p>
                </div>
            ) : (
                <div className="rounded-xl border bg-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">ID</th>
                                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Data</th>
                                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Cliente</th>
                                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Itens</th>
                                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</th>
                                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground w-[80px]">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableSales.map((sale) => (
                                <tr key={sale.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <Link href={`/dashboard/vendas/${sale.id}`} className="font-medium text-primary hover:underline">
                                            #{sale.id.slice(-6).toUpperCase()}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{format(new Date(getSaleDate(sale) + "T12:00:00"), "dd/MM/yyyy")}</td>
                                    <td className="px-4 py-3 text-sm">{sale.customer?.name || "Cliente Não Identificado"}</td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                        {sale.items && sale.items.length > 0
                                            ? sale.items.map(i => i.product?.name || i.service?.name || "Item").join(", ")
                                            : "—"
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-blue-500">{formatBRL(Number(sale.totalAmount))}</td>
                                    <td className="px-4 py-3 text-right">
                                        <SaleActions saleId={sale.id} />
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
