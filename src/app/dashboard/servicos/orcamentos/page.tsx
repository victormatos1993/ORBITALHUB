"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { toast } from "sonner"
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    isWithinInterval, addMonths, subMonths, eachDayOfInterval, isSameDay
} from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    FileText,
    Plus,
    Search,
    Trash2,
    MoreHorizontal,
    Loader2,
    Send,
    ThumbsUp,
    ThumbsDown,
    Eye,
    User,
    Hash,
    CalendarClock,
    AlertTriangle,
    ArrowLeft,
    CreditCard,
    Mail,
    Phone,
    Printer,
    Calendar,
    CalendarDays,
    List,
    Filter,
    ChevronLeft,
    ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { getQuotes, updateQuoteStatus, deleteQuote } from "@/app/actions/quote"
import { getServices } from "@/app/actions/service"
import { getProducts } from "@/app/actions/product"
import { getCompany } from "@/app/actions/company"
import { getCustomers } from "@/app/actions/customer"

import { QuoteModal, type ServiceOption, type ProductOption, type CustomerOption } from "@/components/quotes/quote-modal"

// ═══════ TYPES ═══════

type QuoteItem = {
    id?: string
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
    serviceId: string | null
    productId: string | null
}

type QuoteData = {
    id: string
    number: number
    clientName: string
    clientEmail: string | null
    clientPhone: string | null
    status: string
    totalAmount: number
    discount: number
    notes: string | null
    validUntil: Date | string | null
    paymentMethod: string | null
    paymentType: string | null
    installments: number | null
    createdAt: Date | string
    items: QuoteItem[]
}

// ═══════ HELPERS ═══════

const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

const STATUS_COLORS: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    EXPIRED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
}

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Rascunho",
    SENT: "Enviado",
    APPROVED: "Aprovado",
    REJECTED: "Rejeitado",
    EXPIRED: "Vencido",
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] || ""}`}>
            {STATUS_LABELS[status] || status}
        </span>
    )
}

function formatDateBR(date: Date | string | null) {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("pt-BR")
}

function daysUntil(date: Date | string | null) {
    if (!date) return null
    const d = new Date(date)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    d.setHours(0, 0, 0, 0)
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// ═══════ PAGE ═══════

export default function OrcamentosPage() {
    const [quotes, setQuotes] = useState<QuoteData[]>([])
    const [services, setServices] = useState<ServiceOption[]>([])
    const [products, setProducts] = useState<ProductOption[]>([])
    const [customers, setCustomers] = useState<CustomerOption[]>([])
    const [company, setCompany] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [showExpired, setShowExpired] = useState(false)

    // Period filter state
    type ViewMode = "all" | "month" | "week" | "today" | "3months" | "6months"
    const [viewMode, setViewMode] = useState<ViewMode>("all")
    const [selectedMonth, setSelectedMonth] = useState(new Date())
    const [selectedCardIndex, setSelectedCardIndex] = useState(0)
    const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode)
        setSelectedCardIndex(0)
        setSelectedDayIndex(null)
    }

    // QuoteModal (avulso)
    const [quoteModalOpen, setQuoteModalOpen] = useState(false)
    const [initialClientName, setInitialClientName] = useState("")
    const [initialClientEmail, setInitialClientEmail] = useState("")
    const [initialClientPhone, setInitialClientPhone] = useState("")

    // View/Delete
    const [viewQuote, setViewQuote] = useState<QuoteData | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        try {
            const [quotesData, servicesData, productsData, companyData, customersData] = await Promise.all([
                getQuotes(),
                getServices(),
                getProducts(),
                getCompany(),
                getCustomers(),
            ])
            setQuotes(quotesData as unknown as QuoteData[])
            setServices(servicesData.map((s: any) => ({ id: s.id, name: s.name, price: Number(s.price) })))
            setProducts(productsData.products.map((p: any) => ({ id: p.id, name: p.name, price: Number(p.price) })))
            setCustomers(customersData.customers.map((c: any) => ({ id: c.id, name: c.name, email: c.email, phone: c.phone })))
            if (companyData && "data" in companyData && companyData.data) setCompany(companyData.data)
        } catch {
            toast.error("Erro ao carregar dados")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()

        // Suporte a abertura via URL (?new=true&clientName=...)
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search)
            if (params.get("new") === "true") {
                setInitialClientName(params.get("clientName") || "")
                setInitialClientEmail(params.get("clientEmail") || "")
                setInitialClientPhone(params.get("clientPhone") || "")
                setQuoteModalOpen(true)
                window.history.replaceState({}, document.title, window.location.pathname)
            }
        }
    }, [loadData])

    const handleOpenCreate = () => {
        setInitialClientName("")
        setInitialClientEmail("")
        setInitialClientPhone("")
        setQuoteModalOpen(true)
    }

    const activeQuotes = quotes.filter(q => q.status !== "EXPIRED")
    const expiredQuotes = quotes.filter(q => q.status === "EXPIRED")
    const displayedQuotes = showExpired ? expiredQuotes : activeQuotes

    const getQuoteDate = (q: QuoteData): string => {
        const d = typeof q.createdAt === "string" ? q.createdAt : (q.createdAt as Date).toISOString()
        return d.split("T")[0]
    }

    const getDateRange = useMemo(() => {
        if (viewMode === "month") return { start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) }
        if (viewMode === "week") return { start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) }
        if (viewMode === "3months") { const s = startOfMonth(selectedMonth); return { start: s, end: endOfMonth(addMonths(s, 2)) } }
        if (viewMode === "6months") { const s = startOfMonth(selectedMonth); return { start: s, end: endOfMonth(addMonths(s, 5)) } }
        return null
    }, [viewMode, selectedMonth])

    const dateFilteredQuotes = useMemo(() => {
        let result = [...displayedQuotes]
        if (viewMode === "today") {
            const today = format(new Date(), "yyyy-MM-dd")
            result = result.filter(q => getQuoteDate(q) === today)
        } else if (getDateRange) {
            result = result.filter(q => {
                const d = new Date(getQuoteDate(q) + "T12:00:00")
                return isWithinInterval(d, getDateRange)
            })
        }
        return result
    }, [displayedQuotes, viewMode, selectedMonth, getDateRange])

    const filteredQuotes = dateFilteredQuotes.filter(q =>
        q.clientName.toLowerCase().includes(search.toLowerCase()) ||
        String(q.number).includes(search)
    )

    const tableQuotes = useMemo(() => {
        if ((viewMode === "week" || viewMode === "month") && selectedDayIndex !== null && getDateRange) {
            const days = eachDayOfInterval(getDateRange)
            const selectedDay = days[selectedDayIndex]
            if (selectedDay) {
                const dayStr = format(selectedDay, "yyyy-MM-dd")
                return filteredQuotes.filter(q => getQuoteDate(q) === dayStr)
            }
        }
        if (viewMode === "3months" || viewMode === "6months") {
            const cardMonth = addMonths(startOfMonth(selectedMonth), selectedCardIndex)
            const mStart = startOfMonth(cardMonth)
            const mEnd = endOfMonth(cardMonth)
            return filteredQuotes.filter(q => {
                const d = new Date(getQuoteDate(q) + "T12:00:00")
                return isWithinInterval(d, { start: mStart, end: mEnd })
            })
        }
        return filteredQuotes
    }, [filteredQuotes, viewMode, selectedMonth, selectedCardIndex, selectedDayIndex, getDateRange])

    const periodCards = useMemo(() => {
        if (viewMode === "today" || viewMode === "all") return []
        if (viewMode === "week" && getDateRange) {
            return eachDayOfInterval(getDateRange).map(day => {
                const dayStr = format(day, "yyyy-MM-dd")
                const items = filteredQuotes.filter(q => getQuoteDate(q) === dayStr)
                return { label: format(day, "EEE", { locale: ptBR }), sublabel: format(day, "dd/MM"), count: items.length, total: items.reduce((s, q) => s + q.totalAmount, 0), isToday: isSameDay(day, new Date()) }
            })
        }
        if (viewMode === "month" && getDateRange) {
            return eachDayOfInterval(getDateRange).map(day => {
                const dayStr = format(day, "yyyy-MM-dd")
                const items = filteredQuotes.filter(q => getQuoteDate(q) === dayStr)
                return { label: format(day, "dd"), sublabel: format(day, "EEE", { locale: ptBR }), count: items.length, total: items.reduce((s, q) => s + q.totalAmount, 0), isToday: isSameDay(day, new Date()) }
            })
        }
        if ((viewMode === "3months" || viewMode === "6months") && getDateRange) {
            const n = viewMode === "3months" ? 3 : 6
            return Array.from({ length: n }, (_, i) => {
                const md = addMonths(startOfMonth(selectedMonth), i)
                const mS = startOfMonth(md), mE = endOfMonth(md)
                const items = filteredQuotes.filter(q => { const d = new Date(getQuoteDate(q) + "T12:00:00"); return isWithinInterval(d, { start: mS, end: mE }) })
                return { label: format(md, "MMM", { locale: ptBR }), sublabel: format(md, "yyyy"), count: items.length, total: items.reduce((s, q) => s + q.totalAmount, 0), isToday: isSameDay(startOfMonth(new Date()), mS) }
            })
        }
        return []
    }, [viewMode, getDateRange, filteredQuotes, selectedMonth])

    const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: ptBR })
    const periodLabel = useMemo(() => {
        if (viewMode === "3months") return `${format(selectedMonth, "MMM/yy", { locale: ptBR })} — ${format(addMonths(selectedMonth, 2), "MMM/yy", { locale: ptBR })}`
        if (viewMode === "6months") return `${format(selectedMonth, "MMM/yy", { locale: ptBR })} — ${format(addMonths(selectedMonth, 5), "MMM/yy", { locale: ptBR })}`
        return monthLabel
    }, [viewMode, selectedMonth, monthLabel])

    const displayQuotes = tableQuotes

    const handleStatusChange = async (quoteId: string, status: string) => {
        const res = await updateQuoteStatus(quoteId, status)
        if (res.error) {
            toast.error(res.error)
        } else {
            if (status === "APPROVED" && "integration" in res) {
                toast.success("Orçamento aprovado! Cliente cadastrado e transação criada no financeiro.", { duration: 5000 })
            } else {
                toast.success(`Status alterado para "${STATUS_LABELS[status] || status}"`)
            }
            loadData()
        }
    }

    const handleDelete = async () => {
        if (!deletingId) return
        const res = await deleteQuote(deletingId)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Orçamento excluído")
            loadData()
        }
        setDeleteDialogOpen(false)
        setDeletingId(null)
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">
                        {showExpired ? "Orçamentos Vencidos" : "Orçamentos"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {showExpired
                            ? "Orçamentos que passaram da data de validade"
                            : "Crie e gerencie orçamentos de serviços"
                        }
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {showExpired ? (
                        <Button variant="outline" onClick={() => setShowExpired(false)} className="rounded-xl gap-2">
                            <ArrowLeft className="h-4 w-4" /> Voltar
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setShowExpired(true)}
                                className="rounded-xl gap-2"
                            >
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                Vencidos
                                {expiredQuotes.length > 0 && (
                                    <Badge variant="secondary" className="ml-1 rounded-full h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                                        {expiredQuotes.length}
                                    </Badge>
                                )}
                            </Button>
                            <Button
                                className="rounded-xl gradient-primary text-white hover:opacity-90 gap-2"
                                onClick={handleOpenCreate}
                            >
                                <Plus className="h-4 w-4" /> Novo Orçamento
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Period Filter Bar */}
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
                            placeholder="Buscar cliente ou número..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-8 h-8 w-56 text-xs"
                        />
                    </div>

                    <Badge variant="secondary" className="rounded-lg px-3 py-1.5 text-xs whitespace-nowrap">
                        {filteredQuotes.length} orçamento{filteredQuotes.length !== 1 ? "s" : ""}
                    </Badge>
                </div>
            </div>

            {/* Period Cards */}
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
                                        <p className="text-xs font-bold mt-0.5 text-white dark:text-slate-800">{card.count} orç.</p>
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
                                className={`rounded-xl border p-2 text-center transition-all ${isSelectable ? "cursor-pointer hover:ring-1 hover:ring-primary/30" : ""} ${isSelected
                                    ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm"
                                    : card.count > 0 ? "bg-primary/5 border-primary/20"
                                        : "bg-muted/30 border-muted"
                                    }`}
                            >
                                <p className={`text-[10px] font-semibold uppercase ${isSelected ? "text-primary" : "text-muted-foreground"}`}>{card.label}</p>
                                <p className="text-[9px] text-muted-foreground">{card.sublabel}</p>
                                {card.count > 0 ? (
                                    <p className="text-xs font-bold text-primary mt-0.5">{card.count} orç.</p>
                                ) : (
                                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">—</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Cards Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : displayQuotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 rounded-2xl border bg-card">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                        {showExpired ? <AlertTriangle className="h-8 w-8 text-amber-500" /> : <FileText className="h-8 w-8 text-primary" />}
                    </div>
                    <h3 className="text-lg font-semibold mb-1">
                        {showExpired ? "Nenhum orçamento vencido" : search ? "Nenhum orçamento encontrado" : "Nenhum orçamento criado"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        {showExpired
                            ? "Todos os orçamentos estão dentro da validade."
                            : search ? "Tente buscar por outro termo." : "Crie seu primeiro orçamento de serviço."
                        }
                    </p>
                    {!search && !showExpired && (
                        <Button onClick={handleOpenCreate} className="rounded-xl gradient-primary text-white hover:opacity-90 gap-2">
                            <Plus className="h-4 w-4" /> Criar Primeiro Orçamento
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {displayQuotes.map(quote => {
                        const days = daysUntil(quote.validUntil)
                        const isUrgent = days !== null && days <= 3 && days >= 0
                        const isExpired = quote.status === "EXPIRED"

                        return (
                            <div
                                key={quote.id}
                                className={`group relative rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-lg hover:border-primary/20 cursor-pointer ${isExpired ? "opacity-70 border-amber-500/30" : isUrgent ? "border-amber-400/50" : ""}`}
                                onClick={() => setViewQuote(quote)}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-mono text-muted-foreground">
                                        #{String(quote.number).padStart(4, "0")}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <StatusBadge status={quote.status} />
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost" size="sm"
                                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-xl w-44">
                                                <DropdownMenuItem onClick={e => { e.stopPropagation(); setViewQuote(quote) }} className="gap-2">
                                                    <Eye className="h-3.5 w-3.5" /> Visualizar
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {quote.status === "DRAFT" && (
                                                    <DropdownMenuItem onClick={e => { e.stopPropagation(); handleStatusChange(quote.id, "SENT") }} className="gap-2">
                                                        <Send className="h-3.5 w-3.5" /> Marcar Enviado
                                                    </DropdownMenuItem>
                                                )}
                                                {(quote.status === "SENT" || quote.status === "DRAFT") && (
                                                    <>
                                                        <DropdownMenuItem onClick={e => { e.stopPropagation(); handleStatusChange(quote.id, "APPROVED") }} className="gap-2 text-emerald-600">
                                                            <ThumbsUp className="h-3.5 w-3.5" /> Aprovar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={e => { e.stopPropagation(); handleStatusChange(quote.id, "REJECTED") }} className="gap-2 text-red-600">
                                                            <ThumbsDown className="h-3.5 w-3.5" /> Rejeitar
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={e => { e.stopPropagation(); setDeletingId(quote.id); setDeleteDialogOpen(true) }}
                                                    className="gap-2 text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <User className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-sm truncate">{quote.clientName}</h3>
                                </div>

                                <p className="text-lg font-bold text-primary mb-2">{formatBRL(quote.totalAmount)}</p>

                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <CalendarClock className="h-3 w-3" />
                                        <span>
                                            {quote.validUntil ? `Vence: ${formatDateBR(quote.validUntil)}` : "Sem vencimento"}
                                        </span>
                                        {isUrgent && (
                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-400 text-amber-600 rounded-md ml-auto">
                                                {days === 0 ? "Hoje" : `${days}d`}
                                            </Badge>
                                        )}
                                    </div>
                                    {(quote.paymentMethod || quote.paymentType || quote.installments) && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                            <CreditCard className="h-3 w-3" />
                                            <span>
                                                {quote.paymentMethod || "Pagamento"}:{" "}
                                                {quote.paymentType === "INSTALLMENT" && quote.installments
                                                    ? `${quote.installments}x parcelas`
                                                    : "À vista"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ─── QuoteModal avulso ─── */}
            <QuoteModal
                open={quoteModalOpen}
                onOpenChange={setQuoteModalOpen}
                services={services}
                products={products}
                customers={customers}
                initialClientName={initialClientName}
                initialClientEmail={initialClientEmail}
                initialClientPhone={initialClientPhone}
                onSaved={() => loadData()}
            />

            {/* ─── View Quote Dialog ─── */}
            <Dialog open={!!viewQuote} onOpenChange={open => { if (!open) setViewQuote(null) }}>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto rounded-2xl">
                    {viewQuote && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                                        <Hash className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <span>Orçamento #{String(viewQuote.number).padStart(4, "0")}</span>
                                        <div className="mt-1"><StatusBadge status={viewQuote.status} /></div>
                                    </div>
                                </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4 py-4 px-2">
                                {/* Print */}
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline" size="sm"
                                        className="rounded-xl gap-2 text-xs"
                                        onClick={() => {
                                            const printWindow = window.open("", "_blank")
                                            if (!printWindow || !viewQuote) return
                                            const itemsHtml = viewQuote.items.map(item =>
                                                `<tr>
                                                    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px">${item.description}</td>
                                                    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:13px">${item.quantity}</td>
                                                    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px">${formatBRL(item.unitPrice)}</td>
                                                    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;font-weight:600">${formatBRL(item.totalPrice)}</td>
                                                </tr>`
                                            ).join("")
                                            printWindow.document.write(`<!DOCTYPE html><html><head><title>Orçamento #${String(viewQuote.number).padStart(4, "0")}</title>
                                            <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;color:#1a1a2e;padding:40px;max-width:800px;margin:0 auto}
                                            .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #3b82f6}
                                            .header h1{font-size:22px;color:#1e40af}.info{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin-bottom:24px;font-size:13px}
                                            .label{color:#64748b;font-size:11px;text-transform:uppercase;margin-bottom:2px}.value{font-weight:500}
                                            table{width:100%;border-collapse:collapse;margin-bottom:24px}th{background:#f1f5f9;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#475569}
                                            .total-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}.total-row.grand{font-size:18px;font-weight:700;color:#1e40af;border-top:2px solid #e2e8f0;padding-top:8px}
                                            .footer{text-align:center;font-size:11px;color:#94a3b8;padding-top:20px;border-top:1px solid #e2e8f0}</style></head><body>
                                            <div class="header"><div><h1>ORÇAMENTO</h1><div>#${String(viewQuote.number).padStart(4, "0")}</div></div><div>${STATUS_LABELS[viewQuote.status] || viewQuote.status}</div></div>
                                            <div class="info"><div><div class="label">Cliente</div><div class="value">${viewQuote.clientName}</div></div>
                                            <div><div class="label">Data</div><div class="value">${formatDateBR(viewQuote.createdAt)}</div></div>
                                            ${viewQuote.validUntil ? `<div><div class="label">Válido até</div><div class="value">${formatDateBR(viewQuote.validUntil)}</div></div>` : ""}</div>
                                            <table><thead><tr><th>Descrição</th><th>Qtd</th><th>Unitário</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
                                            <div style="display:flex;justify-content:flex-end"><div style="width:240px">
                                            ${viewQuote.discount > 0 ? `<div class="total-row"><span>Subtotal</span><span>${formatBRL(viewQuote.totalAmount + viewQuote.discount)}</span></div><div class="total-row" style="color:#dc2626"><span>Desconto</span><span>-${formatBRL(viewQuote.discount)}</span></div>` : ""}
                                            <div class="total-row grand"><span>Total</span><span>${formatBRL(viewQuote.totalAmount)}</span></div></div></div>
                                            ${viewQuote.notes ? `<div style="background:#f8fafc;border-radius:8px;padding:16px"><p style="font-size:12px;color:#64748b;margin-bottom:6px">OBSERVAÇÕES</p><p style="font-size:13px">${viewQuote.notes}</p></div>` : ""}
                                            <div class="footer">Documento gerado em ${new Date().toLocaleDateString("pt-BR")}</div>
                                            </body></html>`)
                                            printWindow.document.close()
                                            printWindow.focus()
                                            setTimeout(() => printWindow.print(), 300)
                                        }}
                                    >
                                        <Printer className="h-3.5 w-3.5" /> Imprimir / PDF
                                    </Button>
                                </div>

                                {/* Info */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground text-xs mb-0.5">Cliente</p>
                                        <p className="font-medium">{viewQuote.clientName}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs mb-0.5">Data</p>
                                        <p className="font-medium">{formatDateBR(viewQuote.createdAt)}</p>
                                    </div>
                                    {viewQuote.clientEmail && (
                                        <div>
                                            <p className="text-muted-foreground text-xs mb-0.5 flex items-center gap-1"><Mail className="h-3 w-3" /> E-mail</p>
                                            <p className="font-medium">{viewQuote.clientEmail}</p>
                                        </div>
                                    )}
                                    {viewQuote.clientPhone && (
                                        <div>
                                            <p className="text-muted-foreground text-xs mb-0.5 flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</p>
                                            <p className="font-medium">{viewQuote.clientPhone}</p>
                                        </div>
                                    )}
                                    {viewQuote.validUntil && (
                                        <div>
                                            <p className="text-muted-foreground text-xs mb-0.5">Válido até</p>
                                            <p className="font-medium">{formatDateBR(viewQuote.validUntil)}</p>
                                        </div>
                                    )}
                                    {(viewQuote.paymentMethod || viewQuote.paymentType || viewQuote.installments) && (
                                        <div>
                                            <p className="text-muted-foreground text-xs mb-0.5">Pagamento</p>
                                            <p className="font-medium flex items-center gap-1.5">
                                                <CreditCard className="h-3.5 w-3.5 text-primary" />
                                                {viewQuote.paymentMethod || "Pagamento"}:{" "}
                                                {viewQuote.paymentType === "INSTALLMENT" && viewQuote.installments
                                                    ? `${viewQuote.installments}x de ${formatBRL(viewQuote.totalAmount / viewQuote.installments)}`
                                                    : "À vista"
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Items */}
                                <div className="rounded-xl border overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent text-xs">
                                                <TableHead className="h-8">Descrição</TableHead>
                                                <TableHead className="h-8 w-[50px] text-center">Qtd</TableHead>
                                                <TableHead className="h-8 w-[100px] text-right">Unit.</TableHead>
                                                <TableHead className="h-8 w-[100px] text-right">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {viewQuote.items.map((item, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="text-sm">{item.description}</TableCell>
                                                    <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                                                    <TableCell className="text-right text-sm">{formatBRL(item.unitPrice)}</TableCell>
                                                    <TableCell className="text-right text-sm font-medium">{formatBRL(item.totalPrice)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Totals */}
                                <div className="flex justify-end">
                                    <div className="w-56 space-y-1 text-sm">
                                        {viewQuote.discount > 0 && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Subtotal</span>
                                                    <span>{formatBRL(viewQuote.totalAmount + viewQuote.discount)}</span>
                                                </div>
                                                <div className="flex justify-between text-red-500">
                                                    <span>Desconto</span>
                                                    <span>-{formatBRL(viewQuote.discount)}</span>
                                                </div>
                                            </>
                                        )}
                                        <div className="flex justify-between pt-1 border-t font-bold text-lg">
                                            <span>Total</span>
                                            <span className="text-primary">{formatBRL(viewQuote.totalAmount)}</span>
                                        </div>
                                    </div>
                                </div>

                                {viewQuote.notes && (
                                    <div className="rounded-xl bg-muted/50 p-3">
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
                                        <p className="text-sm whitespace-pre-wrap">{viewQuote.notes}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O orçamento e seus itens serão removidos permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
