"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { format, isPast, isToday, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval, addMonths, subMonths, addDays, eachDayOfInterval, getDaysInMonth, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createExpenseRecurring, confirmarPagamento, deleteTransaction, updateTransaction } from "@/app/actions/transaction"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import CurrencyInput from "react-currency-input-field"
import {
    CheckCircle, Clock, AlertTriangle, AlertCircle, DollarSign,
    Plus, X, Receipt, Trash2, ChevronLeft, ChevronRight,
    Calendar, CalendarDays, List, Repeat, RefreshCw, CreditCard,
    Filter, Wallet, Building2, Pencil, ClipboardList,
} from "lucide-react"

// ── Tipos ──────────────────────────────────────────────────────────
interface ContaPagar {
    id: string
    description: string
    amount: number
    date: string
    categoryName?: string | null
    categoryCode?: string | null
    supplierName?: string | null
    contaName?: string | null
    installmentNumber?: number | null
    installmentTotal?: number | null
    categoryId?: string | null
    supplierId?: string | null
    contaFinanceiraId?: string | null
}

interface CategoryOption { id: string; name: string; code?: string | null; level?: number | null }
interface SupplierOption { id: string; name: string }
interface ContaOption { id: string; name: string; tipo: string; isDefault: boolean }

type ViewMode = "all" | "month" | "week" | "today" | "3months" | "6months"
type RecurrenceType = "unique" | "monthly" | "weekly" | "installment"

interface ContasPagarClientProps {
    contas: ContaPagar[]
    categories?: CategoryOption[]
    suppliers?: SupplierOption[]
    contasFinanceiras?: ContaOption[]
}

// ── Helpers ────────────────────────────────────────────────────────
function getStatusBadge(dateStr: string) {
    const date = new Date(dateStr + "T12:00:00")
    if (isPast(date) && !isToday(date)) {
        return <Badge variant="destructive" className="gap-1 text-xs"><AlertCircle className="h-3 w-3" /> Vencida</Badge>
    }
    if (isToday(date)) {
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 gap-1 text-xs"><AlertTriangle className="h-3 w-3" /> Vence Hoje</Badge>
    }
    return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30 gap-1 text-xs"><Clock className="h-3 w-3" /> A Vencer</Badge>
}

const formatBRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: "unique", label: "Única", icon: <Receipt className="h-4 w-4" />, desc: "Pagamento avulso, sem repetição" },
    { value: "monthly", label: "Mensal", icon: <Repeat className="h-4 w-4" />, desc: "Repete todo mês (mesmo valor)" },
    { value: "weekly", label: "Semanal", icon: <RefreshCw className="h-4 w-4" />, desc: "Repete toda semana (mesmo valor)" },
    { value: "installment", label: "Parcelado", icon: <CreditCard className="h-4 w-4" />, desc: "Valor total dividido em parcelas" },
]

// ── Componente Principal ───────────────────────────────────────────
export function ContasPagarClient({ contas, categories = [], suppliers = [], contasFinanceiras = [] }: ContasPagarClientProps) {
    const router = useRouter()
    const [loading, setLoading] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [editingConta, setEditingConta] = useState<ContaPagar | null>(null)
    const [showPendentes, setShowPendentes] = useState(false)
    const [saving, setSaving] = useState(false)

    // ── Filtros ──
    const [viewMode, setViewMode] = useState<ViewMode>("month")
    const [selectedMonth, setSelectedMonth] = useState(new Date())
    const [statusFilter, setStatusFilter] = useState<"all" | "overdue" | "upcoming">("all")
    const [categoryTab, setCategoryTab] = useState<string>("all")
    const [selectedCardIndex, setSelectedCardIndex] = useState(0)
    const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode)
        setSelectedCardIndex(0)
        setSelectedDayIndex(null)
    }

    // ── Dialog de Pagamento ──
    const [payingConta, setPayingConta] = useState<ContaPagar | null>(null)
    const [payContaFinanceiraId, setPayContaFinanceiraId] = useState("")

    // ── Formulário ──
    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [categoryId, setCategoryId] = useState("")
    const [supplierId, setSupplierId] = useState("")
    const [contaFinanceiraId, setContaFinanceiraId] = useState("")
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
    const [status, setStatus] = useState<"pending" | "paid">("pending")
    const [recurrence, setRecurrence] = useState<RecurrenceType>("unique")
    const [occurrences, setOccurrences] = useState("")

    // ── Ações ──
    const openPayDialog = (conta: ContaPagar) => {
        setPayingConta(conta)
        setPayContaFinanceiraId(conta.contaName ? "" : "")
    }

    const handleConfirmarPagamento = async () => {
        if (!payingConta) return
        if (!payContaFinanceiraId) {
            toast.error("Selecione a conta de onde sairá o pagamento")
            return
        }
        setLoading(payingConta.id)
        try {
            const result = await confirmarPagamento(payingConta.id, payContaFinanceiraId)
            if (result.error) toast.error(result.error)
            else {
                toast.success("Pagamento confirmado!")
                setPayingConta(null)
                setPayContaFinanceiraId("")
                router.refresh()
            }
        } finally { setLoading(null) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir esta despesa?")) return
        setLoading(id)
        try {
            const result = await deleteTransaction(id)
            if (result.success) { toast.success("Excluída"); router.refresh() }
            else toast.error("Erro ao excluir")
        } finally { setLoading(null) }
    }

    const resetForm = () => {
        setDescription(""); setAmount(""); setCategoryId(""); setSupplierId("")
        setContaFinanceiraId(""); setDate(format(new Date(), "yyyy-MM-dd"))
        setOccurrences("")
        setStatus("pending"); setRecurrence("unique")
        setShowForm(false); setEditingConta(null)
    }

    const openEditForm = (conta: ContaPagar) => {
        setEditingConta(conta)
        setDescription(conta.description)
        setAmount(String(conta.amount))
        setCategoryId(conta.categoryId || "")
        setSupplierId(conta.supplierId || "")
        setContaFinanceiraId(conta.contaFinanceiraId || "")
        setDate(conta.date)
        setStatus("pending")
        setRecurrence("unique")
        setShowForm(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const parsedAmount = parseFloat(amount.replace(/\./g, "").replace(",", ".") || "0")
        if (!description || parsedAmount <= 0) { toast.error("Preencha descrição e valor"); return }

        setSaving(true)
        try {
            if (editingConta) {
                // Modo edição
                const result = await updateTransaction(editingConta.id, {
                    description,
                    amount: parsedAmount,
                    type: "expense",
                    categoryId: categoryId || undefined,
                    supplierId: supplierId || undefined,
                    contaFinanceiraId: contaFinanceiraId || undefined,
                    date: new Date(date + "T12:00:00"),
                    status,
                })
                if (result.error) {
                    toast.error(result.error)
                } else {
                    toast.success("Despesa atualizada!")
                    resetForm()
                    router.refresh()
                }
            } else {
                // Modo criação
                const result = await createExpenseRecurring({
                    description,
                    amount: parsedAmount,
                    categoryId: categoryId || undefined,
                    supplierId: supplierId || undefined,
                    contaFinanceiraId: contaFinanceiraId || undefined,
                    date: new Date(date + "T12:00:00"),
                    status,
                    recurrence,
                    occurrences: parseInt(occurrences) || 2,
                })

                if (result.error) {
                    toast.error(result.error)
                } else {
                    const count = (result as any).count || 1
                    if (count > 1) {
                        toast.success(`${count} lançamentos criados!`)
                    } else {
                        toast.success("Despesa cadastrada!")
                    }
                    resetForm()
                    router.refresh()
                }
            }
        } finally { setSaving(false) }
    }

    // ── Filtragem de contas ──
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

    const filteredContas = useMemo(() => {
        let result = [...contas]

        // Filtro por período
        if (viewMode === "today") {
            const today = format(new Date(), "yyyy-MM-dd")
            result = result.filter(c => c.date === today)
        } else if (getDateRange) {
            result = result.filter(c => {
                const d = new Date(c.date + "T12:00:00")
                return isWithinInterval(d, getDateRange)
            })
        }

        // Filtro por status
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

        // Filtro por categoria
        if (categoryTab !== "all") {
            result = result.filter(c => {
                const code = c.categoryCode || ""
                switch (categoryTab) {
                    case "cmv": return code.startsWith("2.1")
                    case "fixas": return code.startsWith("3")
                    case "frete": return code.startsWith("2.4")
                    case "embalagem": return code.startsWith("2.5")
                    default: return true
                }
            })
        }

        return result
    }, [contas, viewMode, selectedMonth, statusFilter, categoryTab, getDateRange])

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
                return {
                    label: format(day, "EEE", { locale: ptBR }),
                    sublabel: format(day, "dd/MM"),
                    total,
                    count: dayContas.length,
                    isToday: isSameDay(day, new Date()),
                }
            })
        }

        if (viewMode === "month" && getDateRange) {
            const daysInMonth = getDaysInMonth(selectedMonth)
            const days = eachDayOfInterval(getDateRange)
            return days.map(day => {
                const dayStr = format(day, "yyyy-MM-dd")
                const dayContas = filteredContas.filter(c => c.date === dayStr)
                const total = dayContas.reduce((s, c) => s + c.amount, 0)
                return {
                    label: format(day, "dd"),
                    sublabel: format(day, "EEE", { locale: ptBR }),
                    total,
                    count: dayContas.length,
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
                const monthContas = filteredContas.filter(c => {
                    const d = new Date(c.date + "T12:00:00")
                    return isWithinInterval(d, { start: mStart, end: mEnd })
                })
                const total = monthContas.reduce((s, c) => s + c.amount, 0)
                return {
                    label: format(monthDate, "MMM", { locale: ptBR }),
                    sublabel: format(monthDate, "yyyy"),
                    total,
                    count: monthContas.length,
                    isToday: isSameDay(startOfMonth(new Date()), mStart),
                }
            })
        }

        return []
    }, [viewMode, getDateRange, filteredContas, selectedMonth])

    const total = filteredContas.reduce((s, c) => s + c.amount, 0)
    const overdueCount = filteredContas.filter(c => { const d = new Date(c.date + "T12:00:00"); return isPast(d) && !isToday(d) }).length
    const todayCount = filteredContas.filter(c => { const d = new Date(c.date + "T12:00:00"); return isToday(d) }).length

    // Contas que precisam de revisão (geradas automaticamente por NF)
    const pendentes = useMemo(() =>
        contas.filter(c => c.description.startsWith("Compra de Mercadoria") && !c.contaName)
        , [contas])

    const expenseCategories = categories.filter(c => {
        if (c.code) return c.code.startsWith("3") || c.code.startsWith("4")
        return true
    })

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
            {/* ── Header com resumo + botão ── */}
            <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                        <DollarSign className="h-6 w-6 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">Total Pendente {viewMode === "month" ? `em ${monthLabel}` : viewMode === "week" ? "esta semana" : viewMode === "today" ? "hoje" : viewMode === "3months" ? `em ${periodLabel}` : viewMode === "6months" ? `em ${periodLabel}` : ""}</p>
                        <p className="text-2xl font-bold text-red-500">{formatBRL(total)}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {overdueCount > 0 && (
                            <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" /> {overdueCount} vencida{overdueCount > 1 ? "s" : ""}
                            </Badge>
                        )}
                        {todayCount > 0 && (
                            <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 gap-1">
                                <AlertTriangle className="h-3 w-3" /> {todayCount} vence{todayCount > 1 ? "m" : ""} hoje
                            </Badge>
                        )}
                        <Button variant={pendentes.length > 0 ? "destructive" : "outline"} onClick={() => setShowPendentes(!showPendentes)} className="gap-1.5">
                            <ClipboardList className="h-4 w-4" />
                            {pendentes.length === 0
                                ? "0 Tarefas Pendentes"
                                : pendentes.length === 1
                                    ? "1 Tarefa Pendente"
                                    : `${pendentes.length} Tarefas Pendentes`
                            }
                        </Button>
                        <Button onClick={() => { if (showForm && !editingConta) { resetForm() } else { resetForm(); setShowForm(true) } }} className="gap-1.5">
                            {showForm && !editingConta ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            {showForm && !editingConta ? "Cancelar" : "Nova Despesa"}
                        </Button>
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

                    {/* Contagem de registros no filtro */}
                    <span className="ml-auto text-xs text-muted-foreground">{tableContas.length} registro{tableContas.length !== 1 ? "s" : ""}</span>
                </div>

                {/* Tabs de Categoria */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t flex-wrap">
                    <span className="text-xs text-muted-foreground font-medium">Categoria:</span>
                    <div className="flex rounded-lg border overflow-hidden">
                        {([
                            { value: "all", label: "Todas" },
                            { value: "cmv", label: "CMV" },
                            { value: "fixas", label: "Fixas" },
                            { value: "frete", label: "Frete" },
                            { value: "embalagem", label: "Embalagem" },
                        ]).map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setCategoryTab(opt.value)}
                                className={`px-3 py-1.5 text-xs font-medium transition-colors ${categoryTab === opt.value
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted text-muted-foreground"
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
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
                                            ? "bg-red-500/5 border-red-500/20"
                                            : "bg-muted/30 border-muted"
                                    }`}
                            >
                                <p className={`text-[10px] font-semibold uppercase ${isSelected ? "text-primary" : "text-muted-foreground"
                                    }`}>
                                    {card.label}
                                </p>
                                <p className="text-[9px] text-muted-foreground">{card.sublabel}</p>
                                {card.total > 0 ? (
                                    <p className="text-xs font-bold text-red-500 mt-0.5">
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

            {/* ── Formulário Nova Despesa ── */}
            {showForm && (
                <div className="rounded-xl border bg-card overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 px-6 py-4 border-b">
                        <div className="flex items-center gap-2">
                            {editingConta ? <Pencil className="h-5 w-5 text-orange-500" /> : <Receipt className="h-5 w-5 text-red-500" />}
                            <h3 className="font-semibold text-lg">{editingConta ? "Editar Despesa" : "Nova Despesa"}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {editingConta ? "Atualize os dados da despesa selecionada" : "Registre uma despesa única, recorrente ou parcelada"}
                        </p>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* ── Recorrência (só no modo criação) ── */}
                        {!editingConta && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Tipo de Lançamento</Label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {RECURRENCE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setRecurrence(opt.value)}
                                            className={`relative flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-all ${recurrence === opt.value
                                                ? "border-primary bg-primary/5 shadow-sm"
                                                : "border-muted hover:border-muted-foreground/30 hover:bg-muted/50"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={recurrence === opt.value ? "text-primary" : "text-muted-foreground"}>{opt.icon}</span>
                                                <span className={`text-sm font-medium ${recurrence === opt.value ? "text-primary" : ""}`}>{opt.label}</span>
                                            </div>
                                            <span className="text-[11px] text-muted-foreground leading-tight">{opt.desc}</span>
                                            {recurrence === opt.value && (
                                                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Descrição */}
                            <div className="md:col-span-2 space-y-1.5">
                                <Label htmlFor="desc">Descrição *</Label>
                                <Input id="desc" placeholder="Ex: Aluguel, Conta de Luz, Material..." value={description}
                                    onChange={e => setDescription(e.target.value)} required />
                            </div>

                            {/* Valor */}
                            <div className="space-y-1.5">
                                <Label htmlFor="amt">
                                    {recurrence === "installment" ? "Valor Total (será dividido)" : "Valor (R$)"} *
                                </Label>
                                <CurrencyInput id="amt"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    placeholder="R$ 0,00" decimalsLimit={2} decimalSeparator="," groupSeparator="." prefix="R$ "
                                    value={amount} onValueChange={v => setAmount(v || "")} />
                            </div>

                            {/* Data */}
                            <div className="space-y-1.5">
                                <Label htmlFor="dt">
                                    {recurrence === "unique" ? "Data / Vencimento" : "Primeiro Vencimento"}
                                </Label>
                                <Input id="dt" type="date" value={date} onChange={e => setDate(e.target.value)} />
                            </div>

                            {/* Ocorrências (só no modo criação) */}
                            {!editingConta && recurrence !== "unique" && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="occ">
                                        {recurrence === "installment" ? "Número de Parcelas" : "Número de Ocorrências"}
                                    </Label>
                                    <Input id="occ" type="number" min={2} max={60} placeholder="Ex: 6" value={occurrences}
                                        onChange={e => setOccurrences(e.target.value)} />
                                    {recurrence === "installment" && amount && parseInt(occurrences) > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            {occurrences}x de {formatBRL(parseFloat(amount.replace(/\./g, "").replace(",", ".") || "0") / parseInt(occurrences))}
                                        </p>
                                    )}
                                    {recurrence === "monthly" && occurrences && (
                                        <p className="text-xs text-muted-foreground">{occurrences} meses de {amount ? `R$ ${amount}` : "..."} cada</p>
                                    )}
                                    {recurrence === "weekly" && occurrences && (
                                        <p className="text-xs text-muted-foreground">{occurrences} semanas de {amount ? `R$ ${amount}` : "..."} cada</p>
                                    )}
                                </div>
                            )}

                            {/* Fornecedor */}
                            <div className="space-y-1.5">
                                <Label htmlFor="sup">Fornecedor</Label>
                                <select id="sup" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                                    <option value="">Selecione (opcional)</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            {/* Categoria */}
                            <div className="space-y-1.5">
                                <Label htmlFor="cat">Categoria</Label>
                                <select id="cat" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                                    <option value="">Selecione (opcional)</option>
                                    {expenseCategories.map(c => (
                                        <option key={c.id} value={c.id}>{c.code ? `${c.code} — ` : ""}{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Conta Financeira */}
                            <div className="space-y-1.5">
                                <Label htmlFor="cf">Conta Financeira</Label>
                                <select id="cf" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={contaFinanceiraId} onChange={e => setContaFinanceiraId(e.target.value)}>
                                    <option value="">Selecione (opcional)</option>
                                    {contasFinanceiras.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} {c.isDefault ? "⭐" : ""} ({c.tipo})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Status */}
                            <div className="space-y-1.5">
                                <Label htmlFor="st">Status da Primeira</Label>
                                <select id="st" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={status} onChange={e => setStatus(e.target.value as "pending" | "paid")}>
                                    <option value="pending">A Pagar (Pendente)</option>
                                    <option value="paid">Já Paga</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                            <Button type="submit" disabled={saving} className="gap-1.5">
                                <CheckCircle className="h-4 w-4" />
                                {saving ? "Salvando..." : editingConta
                                    ? "Salvar Alterações"
                                    : recurrence === "unique"
                                        ? (status === "paid" ? "Registrar como Paga" : "Cadastrar Despesa")
                                        : `Criar ${recurrence === "installment" ? occurrences + " Parcelas" : occurrences + " Lançamentos"}`}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Lista ── */}
            {tableContas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground rounded-xl border bg-card">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                    <p className="text-lg font-medium">Nenhuma conta pendente!</p>
                    <p className="text-sm">
                        {viewMode === "all"
                            ? "Todas as suas despesas estão quitadas."
                            : `Nenhuma despesa para ${viewMode === "month" ? monthLabel : viewMode === "week" ? "esta semana" : "hoje"}.`}
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
                                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Categoria</th>
                                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableContas.map((conta) => (
                                <tr key={conta.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium flex items-center gap-2">
                                            {conta.description}
                                            {conta.description.startsWith("Compra de Mercadoria") && !conta.contaName && (
                                                <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30 text-[10px] px-1.5 py-0">Revisar</Badge>
                                            )}
                                        </div>
                                        {conta.supplierName && (
                                            <div className="text-xs text-muted-foreground">{conta.supplierName}</div>
                                        )}
                                        {conta.installmentTotal && conta.installmentTotal > 1 && (
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Repeat className="h-3 w-3" />
                                                Parcela {conta.installmentNumber}/{conta.installmentTotal}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-red-500">{formatBRL(conta.amount)}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {format(new Date(conta.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                                    </td>
                                    <td className="px-4 py-3">{getStatusBadge(conta.date)}</td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">{conta.categoryName || "—"}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => openEditForm(conta)}
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600">
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => openPayDialog(conta)}
                                                disabled={loading === conta.id} className="gap-1 text-xs">
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                {loading === conta.id ? "..." : "Pagar"}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => handleDelete(conta.id)}
                                                disabled={loading === conta.id} className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Dialog de Confirmação de Pagamento ── */}
            {payingConta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setPayingConta(null); setPayContaFinanceiraId("") }} />
                    {/* Modal */}
                    <div className="relative bg-card rounded-xl border shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 px-6 py-4 rounded-t-xl border-b">
                            <div className="flex items-center gap-2">
                                <Wallet className="h-5 w-5 text-emerald-600" />
                                <h3 className="font-semibold text-lg">Confirmar Pagamento</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">De qual conta sairá o dinheiro?</p>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Info da despesa */}
                            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                                <p className="font-medium">{payingConta.description}</p>
                                <p className="text-lg font-bold text-red-500">{formatBRL(payingConta.amount)}</p>
                                {payingConta.supplierName && (
                                    <p className="text-xs text-muted-foreground">{payingConta.supplierName}</p>
                                )}
                            </div>

                            {/* Seleção da conta */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-1.5">
                                    <Building2 className="h-4 w-4" />
                                    Conta de Saída *
                                </Label>
                                <div className="grid gap-2">
                                    {contasFinanceiras.map(cf => (
                                        <button
                                            key={cf.id}
                                            type="button"
                                            onClick={() => setPayContaFinanceiraId(cf.id)}
                                            className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${payContaFinanceiraId === cf.id
                                                ? "border-primary bg-primary/5 shadow-sm"
                                                : "border-muted hover:border-muted-foreground/30"
                                                }`}
                                        >
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${payContaFinanceiraId === cf.id ? "bg-primary/10" : "bg-muted"
                                                }`}>
                                                {cf.tipo === "BANCO" ? (
                                                    <Building2 className={`h-4 w-4 ${payContaFinanceiraId === cf.id ? "text-primary" : "text-muted-foreground"}`} />
                                                ) : (
                                                    <Wallet className={`h-4 w-4 ${payContaFinanceiraId === cf.id ? "text-primary" : "text-muted-foreground"}`} />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium ${payContaFinanceiraId === cf.id ? "text-primary" : ""}`}>
                                                    {cf.name} {cf.isDefault ? "⭐" : ""}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{cf.tipo}</p>
                                            </div>
                                            {payContaFinanceiraId === cf.id && (
                                                <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {contasFinanceiras.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-2">Nenhuma conta financeira cadastrada.</p>
                                )}
                            </div>

                            {/* Ações */}
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <Button variant="outline" onClick={() => { setPayingConta(null); setPayContaFinanceiraId("") }}>
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleConfirmarPagamento}
                                    disabled={!payContaFinanceiraId || loading === payingConta.id}
                                    className="gap-1.5"
                                >
                                    <CheckCircle className="h-4 w-4" />
                                    {loading === payingConta.id ? "Processando..." : "Confirmar Pagamento"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Popup Tarefas Pendentes ── */}
            {showPendentes && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPendentes(false)} />
                    <div className="relative bg-card rounded-xl border shadow-2xl w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-6 py-4 rounded-t-xl border-b">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-purple-600" />
                                <h3 className="font-semibold text-lg">Tarefas Pendentes</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">Despesas que precisam de revisão</p>
                        </div>
                        <div className="p-4 max-h-[400px] overflow-y-auto space-y-2">
                            {pendentes.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CheckCircle className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
                                    <p className="font-medium">Tudo em dia!</p>
                                    <p className="text-sm">Nenhuma despesa pendente de revisão.</p>
                                </div>
                            ) : (
                                pendentes.map(conta => (
                                    <div key={conta.id} className="rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-sm truncate">{conta.description}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-sm font-semibold text-red-500">{formatBRL(conta.amount)}</span>
                                                    <span className="text-xs text-muted-foreground">Venc: {format(new Date(conta.date + "T12:00:00"), "dd/MM/yyyy")}</span>
                                                </div>
                                                {conta.supplierName && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">{conta.supplierName}</p>
                                                )}
                                            </div>
                                            <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0"
                                                onClick={() => { setShowPendentes(false); openEditForm(conta) }}>
                                                <Pencil className="h-3 w-3" /> Editar
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="px-6 py-3 border-t flex justify-end">
                            <Button variant="outline" onClick={() => setShowPendentes(false)}>Fechar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
