"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { depositoConta, retiradaConta, transferenciaConta } from "@/app/actions/conta-financeira"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import CurrencyInput from "react-currency-input-field"
import { toast } from "sonner"
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    addMonths, subMonths, isWithinInterval, eachDayOfInterval,
    isSameDay,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    ArrowLeft, ChevronLeft, ChevronRight, Receipt, Landmark,
    Calendar, CalendarDays, List, Filter, ArrowDownLeft, ArrowUpRight,
    Plus, Minus, ArrowLeftRight, Wallet,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────

interface ContaInfo {
    id: string
    name: string
    type: string
    balance: number
}

interface OutraConta {
    id: string
    name: string
    type: string
    subType: string | null
}

interface ExtratoItem {
    id: string
    description: string
    amount: number
    type: string
    status: string
    date: string
    categoryName: string | null
    customerName: string | null
    supplierName: string | null
    origin: string
}

type ViewMode = "today" | "week" | "month" | "3months" | "6months" | "all"
type StatusFilter = "all" | "paid" | "pending"
type TxDialogType = "deposito" | "retirada" | "transferencia" | null

const formatBRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

// ── Component ────────────────────────────────────────────────────────

export function ExtratoClient({
    conta,
    initialItems,
    outrasContas = [],
}: {
    conta: ContaInfo
    initialItems: ExtratoItem[]
    outrasContas?: OutraConta[]
}) {
    const router = useRouter()
    const [items] = useState<ExtratoItem[]>(initialItems)

    // ── Filtros ──
    const [viewMode, setViewMode] = useState<ViewMode>("month")
    const [selectedMonth, setSelectedMonth] = useState(new Date())
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
    const [selectedCardIndex, setSelectedCardIndex] = useState(0)
    const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)

    // ── Transaction Dialog ──
    const [txDialog, setTxDialog] = useState<TxDialogType>(null)
    const [txAmount, setTxAmount] = useState("")
    const [txJustification, setTxJustification] = useState("")
    const [txDestino, setTxDestino] = useState("")
    const [txLoading, setTxLoading] = useState(false)

    const openTxDialog = (type: TxDialogType) => {
        setTxDialog(type)
        setTxAmount("")
        setTxJustification("")
        setTxDestino("")
    }

    const handleTxSubmit = async () => {
        const parsedAmount = parseFloat(txAmount.replace(/\./g, "").replace(",", ".") || "0")
        if (parsedAmount <= 0) { toast.error("Informe um valor válido"); return }
        if (!txJustification.trim()) { toast.error("Informe a justificativa"); return }
        if (txDialog === "transferencia" && !txDestino) { toast.error("Selecione a conta de destino"); return }

        setTxLoading(true)
        try {
            let result
            if (txDialog === "deposito") {
                result = await depositoConta(conta.id, parsedAmount, txJustification)
            } else if (txDialog === "retirada") {
                result = await retiradaConta(conta.id, parsedAmount, txJustification)
            } else if (txDialog === "transferencia") {
                result = await transferenciaConta(conta.id, txDestino, parsedAmount, txJustification)
            }

            if (result?.error) {
                toast.error(result.error)
            } else {
                const labels = { deposito: "Depósito", retirada: "Retirada", transferencia: "Transferência" }
                toast.success(`${labels[txDialog!]} realizado com sucesso!`)
                setTxDialog(null)
                router.refresh()
            }
        } finally {
            setTxLoading(false)
        }
    }

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

        if (viewMode === "today") {
            const today = format(new Date(), "yyyy-MM-dd")
            result = result.filter(c => c.date.startsWith(today))
        } else if (getDateRange) {
            result = result.filter(c => {
                const d = new Date(c.date)
                return isWithinInterval(d, getDateRange)
            })
        }

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
                const income = dayItems.filter(c => c.type === "income").reduce((s, c) => s + c.amount, 0)
                const expense = dayItems.filter(c => c.type !== "income").reduce((s, c) => s + c.amount, 0)
                return {
                    label: format(day, "EEE", { locale: ptBR }),
                    sublabel: format(day, "dd/MM"),
                    total: income - expense,
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
                const income = dayItems.filter(c => c.type === "income").reduce((s, c) => s + c.amount, 0)
                const expense = dayItems.filter(c => c.type !== "income").reduce((s, c) => s + c.amount, 0)
                return {
                    label: format(day, "dd"),
                    sublabel: format(day, "EEE", { locale: ptBR }),
                    total: income - expense,
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
                const income = monthItems.filter(c => c.type === "income").reduce((s, c) => s + c.amount, 0)
                const expense = monthItems.filter(c => c.type !== "income").reduce((s, c) => s + c.amount, 0)
                return {
                    label: format(monthDate, "MMM", { locale: ptBR }),
                    sublabel: format(monthDate, "yyyy"),
                    total: income - expense,
                    count: monthItems.length,
                    isToday: isSameDay(startOfMonth(new Date()), mStart),
                }
            })
        }

        return []
    }, [viewMode, getDateRange, filteredItems, selectedMonth])

    const totalIncome = filteredItems.filter(c => c.type === "income").reduce((s, c) => s + c.amount, 0)
    const totalExpense = filteredItems.filter(c => c.type !== "income").reduce((s, c) => s + c.amount, 0)
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

    const txDialogTitle = txDialog === "deposito" ? "Depósito" : txDialog === "retirada" ? "Retirada" : "Transferência"
    const txDialogColor = txDialog === "deposito" ? "text-emerald-600" : txDialog === "retirada" ? "text-red-500" : "text-blue-600"

    return (
        <div className="space-y-4">
            {/* ── Header ── */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => router.push("/dashboard/financeiro/contas")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Landmark className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Extrato — {conta.name}</h1>
                            <p className="text-sm text-muted-foreground">
                                Saldo atual: {formatBRL(conta.balance)}
                            </p>
                        </div>
                    </div>
                </div>
                {/* ── Transaction buttons ── */}
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-1.5 rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950" onClick={() => openTxDialog("deposito")}>
                        <Plus className="h-4 w-4" /> Depósito
                    </Button>
                    <Button variant="outline" className="gap-1.5 rounded-xl text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950" onClick={() => openTxDialog("retirada")}>
                        <Minus className="h-4 w-4" /> Retirada
                    </Button>
                    <Button variant="outline" className="gap-1.5 rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950" onClick={() => openTxDialog("transferencia")}>
                        <ArrowLeftRight className="h-4 w-4" /> Transferência
                    </Button>
                </div>
            </div>

            {/* ── Resumo ── */}
            <div className="rounded-xl border bg-card p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Entradas</p>
                            <p className="text-lg font-bold text-emerald-600">{formatBRL(totalIncome)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                            <ArrowUpRight className="h-5 w-5 text-red-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Saídas</p>
                            <p className="text-lg font-bold text-red-500">{formatBRL(totalExpense)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Landmark className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Resultado do Período</p>
                            <p className={`text-lg font-bold ${totalIncome - totalExpense >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                {formatBRL(totalIncome - totalExpense)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Barra de filtros ── */}
            <div className="rounded-xl border bg-card px-4 py-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Filter className="h-4 w-4" />
                        <span className="font-medium">Visualizar:</span>
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
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === opt.value
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted text-muted-foreground"
                                    }`}
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
                                    {card.count > 0 ? (
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
                                        : card.count > 0
                                            ? card.total >= 0
                                                ? "bg-emerald-500/5 border-emerald-500/20"
                                                : "bg-red-500/5 border-red-500/20"
                                            : "bg-muted/30 border-muted"
                                    }`}
                            >
                                <p className={`text-[10px] font-semibold uppercase ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                                    {card.label}
                                </p>
                                <p className="text-[9px] text-muted-foreground">{card.sublabel}</p>
                                {card.count > 0 ? (
                                    <p className={`text-xs font-bold mt-0.5 ${card.total >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                        {formatBRL(card.total)}
                                    </p>
                                ) : (
                                    <p className="text-[10px] mt-0.5 text-muted-foreground">—</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ── Tabela de transações ── */}
            {tableItems.length > 0 ? (
                <div className="rounded-xl border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left p-3 font-medium">Data</th>
                                <th className="text-left p-3 font-medium">Descrição</th>
                                <th className="text-left p-3 font-medium">Categoria</th>
                                <th className="text-left p-3 font-medium">Origem</th>
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
                                    <td className="p-3">
                                        {(() => {
                                            const colors: Record<string, string> = {
                                                "PDV": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
                                                "Depósito": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                                                "Retirada": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                                "Transferência": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                                "Pagamento": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                                                "Manual": "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
                                            }
                                            return (
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors[item.origin] || colors["Manual"]}`}>
                                                    {item.origin}
                                                </span>
                                            )
                                        })()}
                                    </td>
                                    <td className={`p-3 text-right font-semibold ${item.type === "income" ? "text-emerald-600" : "text-destructive"}`}>
                                        {item.type === "income" ? "+" : "-"}{formatBRL(item.amount)}
                                    </td>
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
                    <p className="text-lg font-medium">Nenhuma transação</p>
                    <p className="text-sm">Não há transações neste período para a conta {conta.name}.</p>
                </div>
            )}

            {/* ═══━━━ DIALOG: DEPÓSITO / RETIRADA / TRANSFERÊNCIA ━━━═══ */}
            <Dialog open={txDialog !== null} onOpenChange={(open) => !open && setTxDialog(null)}>
                <DialogContent className="sm:!max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className={`flex items-center gap-2 ${txDialogColor}`}>
                            {txDialog === "deposito" && <Plus className="h-5 w-5" />}
                            {txDialog === "retirada" && <Minus className="h-5 w-5" />}
                            {txDialog === "transferencia" && <ArrowLeftRight className="h-5 w-5" />}
                            {txDialogTitle}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        {/* Conta de origem */}
                        <div className="rounded-xl bg-muted/50 p-3 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Wallet className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Conta</p>
                                <p className="font-medium text-sm">{conta.name}</p>
                            </div>
                            <p className="ml-auto text-sm font-medium">{formatBRL(conta.balance)}</p>
                        </div>

                        {/* Conta de destino (só transferência) */}
                        {txDialog === "transferencia" && (
                            <div className="space-y-1.5">
                                <Label>Conta de Destino *</Label>
                                <Select value={txDestino} onValueChange={setTxDestino}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="Selecione a conta..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {outrasContas.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Valor */}
                        <div className="space-y-1.5">
                            <Label>Valor *</Label>
                            <CurrencyInput
                                placeholder="R$ 0,00"
                                decimalsLimit={2}
                                prefix="R$ "
                                value={txAmount}
                                onValueChange={v => setTxAmount(v || "")}
                                className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>

                        {/* Justificativa */}
                        <div className="space-y-1.5">
                            <Label>Justificativa *</Label>
                            <textarea
                                value={txJustification}
                                onChange={e => setTxJustification(e.target.value)}
                                placeholder="Descreva o motivo da transação..."
                                rows={3}
                                className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                            />
                        </div>

                        {/* Botão */}
                        <Button
                            onClick={handleTxSubmit}
                            disabled={txLoading}
                            className={`w-full rounded-xl gap-2 ${txDialog === "deposito" ? "bg-emerald-600 hover:bg-emerald-700" :
                                txDialog === "retirada" ? "bg-red-500 hover:bg-red-600" :
                                    "bg-blue-600 hover:bg-blue-700"
                                }`}
                        >
                            {txLoading ? "Processando..." : `Confirmar ${txDialogTitle}`}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
