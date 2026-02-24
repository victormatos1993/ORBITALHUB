"use client"

import { useState, useMemo } from "react"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    CalendarClock, ShoppingCart, CalendarSearch, X,
    Calendar, CalendarDays, List, ChevronLeft, ChevronRight, Filter,
    Receipt, TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cancelEventAndTransaction } from "@/app/actions/agenda"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval, addMonths, subMonths, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Transaction {
    id: string
    description: string
    amount: number
    status: string
    date: string
    type: string
    eventId?: string | null
    customerId?: string | null
    serviceId?: string | null
    productId?: string | null
}

interface ScheduledTransactionsProps {
    data: Transaction[]
    className?: string
    customers?: any[]
    products?: any[]
    services?: any[]
}

type ViewMode = "month" | "week" | "today" | "all"

export function ScheduledTransactions({
    data,
    className,
}: ScheduledTransactionsProps) {
    const router = useRouter()
    const [cancelling, setCancelling] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<ViewMode>("month")
    const [selectedMonth, setSelectedMonth] = useState(new Date())
    const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all")

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-"
        const [year, month, day] = dateStr.split("-")
        return `${day}/${month}/${year}`
    }

    const handleOpenPDV = (transaction: Transaction) => {
        const params = new URLSearchParams()
        if (transaction.customerId) params.set("customerId", transaction.customerId)
        if (transaction.serviceId) params.set("serviceId", transaction.serviceId)
        if (transaction.productId) params.set("productId", transaction.productId)
        if (transaction.eventId) params.set("eventId", transaction.eventId)
        window.location.href = `/dashboard/vendas/pdv?${params.toString()}`
    }

    const handleOpenAgenda = (transaction: Transaction) => {
        if (!transaction.eventId) {
            toast.error("Este agendamento não possui um evento vinculado.")
            return
        }
        router.push(`/dashboard/agenda?eventId=${transaction.eventId}`)
    }

    const handleCancel = async (transaction: Transaction) => {
        if (!transaction.eventId) return
        setCancelling(transaction.id)
        const res = await cancelEventAndTransaction(transaction.eventId)
        if (res?.success) {
            toast.info("Agendamento cancelado")
            router.refresh()
        } else {
            toast.error("Erro ao cancelar agendamento")
        }
        setCancelling(null)
    }

    // ── Filtragem ──
    const filtered = useMemo(() => {
        let result = [...data]

        // Filtro por tipo
        if (typeFilter !== "all") {
            result = result.filter(t => t.type === typeFilter)
        }

        // Filtro por período
        if (viewMode === "month") {
            const start = startOfMonth(selectedMonth)
            const end = endOfMonth(selectedMonth)
            result = result.filter(t => {
                const d = new Date(t.date + "T12:00:00")
                return isWithinInterval(d, { start, end })
            })
        } else if (viewMode === "week") {
            const start = startOfWeek(new Date(), { weekStartsOn: 1 })
            const end = endOfWeek(new Date(), { weekStartsOn: 1 })
            result = result.filter(t => {
                const d = new Date(t.date + "T12:00:00")
                return isWithinInterval(d, { start, end })
            })
        } else if (viewMode === "today") {
            const today = format(new Date(), "yyyy-MM-dd")
            result = result.filter(t => t.date === today)
        }

        return result
    }, [data, viewMode, selectedMonth, typeFilter])

    const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: ptBR })
    const incomeCount = filtered.filter(t => t.type === "income").length
    const expenseCount = filtered.filter(t => t.type === "expense").length

    return (
        <Card className={className}>
            <CardHeader className="pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <CalendarClock className="h-5 w-5 text-primary" strokeWidth={2.5} />
                        Transações Agendadas
                    </CardTitle>
                    <CardDescription>Eventos futuros que gerarão receita ou despesa.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* ── Filtros ── */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Filter className="h-3.5 w-3.5" />
                    </div>

                    {/* Período */}
                    <div className="flex rounded-lg border overflow-hidden text-xs">
                        {([
                            { value: "today" as ViewMode, label: "Hoje", icon: <Calendar className="h-3 w-3" /> },
                            { value: "week" as ViewMode, label: "Semana", icon: <CalendarDays className="h-3 w-3" /> },
                            { value: "month" as ViewMode, label: "Mês", icon: <CalendarDays className="h-3 w-3" /> },
                            { value: "all" as ViewMode, label: "Tudo", icon: <List className="h-3 w-3" /> },
                        ]).map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setViewMode(opt.value)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 font-medium transition-colors ${viewMode === opt.value
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted text-muted-foreground"
                                    }`}
                            >
                                {opt.icon} {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Navegação de mês */}
                    {viewMode === "month" && (
                        <div className="flex items-center gap-0.5">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedMonth(prev => subMonths(prev, 1))}>
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <span className="text-xs font-medium min-w-[100px] text-center capitalize">{monthLabel}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedMonth(prev => addMonths(prev, 1))}>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}

                    <div className="h-4 w-px bg-border mx-0.5 hidden sm:block" />

                    {/* Tipo */}
                    <div className="flex rounded-lg border overflow-hidden text-xs">
                        {([
                            { value: "all" as const, label: "Todas" },
                            { value: "income" as const, label: "Receitas" },
                            { value: "expense" as const, label: "Despesas" },
                        ]).map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setTypeFilter(opt.value)}
                                className={`px-2.5 py-1.5 font-medium transition-colors ${typeFilter === opt.value
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted text-muted-foreground"
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Contadores */}
                    <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                        {incomeCount > 0 && (
                            <span className="flex items-center gap-1 text-emerald-600">
                                <TrendingUp className="h-3 w-3" /> {incomeCount}
                            </span>
                        )}
                        {expenseCount > 0 && (
                            <span className="flex items-center gap-1 text-red-500">
                                <Receipt className="h-3 w-3" /> {expenseCount}
                            </span>
                        )}
                        <span>{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</span>
                    </div>
                </div>

                {/* ── Tabela ── */}
                <div className="rounded-md border border-dashed border-primary/20 bg-primary/5 p-1">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs font-bold uppercase text-muted-foreground/70">Título / Descrição</TableHead>
                                <TableHead className="text-right text-xs font-bold uppercase text-muted-foreground/70">Valor Previsto</TableHead>
                                <TableHead className="text-right text-xs font-bold uppercase text-muted-foreground/70">Data Prevista</TableHead>
                                <TableHead className="text-right text-xs font-bold uppercase text-muted-foreground/70">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                                        {viewMode === "all"
                                            ? "Nenhum agendamento futuro com impacto financeiro."
                                            : `Nenhuma transação agendada para ${viewMode === "month" ? monthLabel : viewMode === "week" ? "esta semana" : "hoje"}.`}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((transaction) => {
                                    const isCancelling = cancelling === transaction.id
                                    const isEvent = !!transaction.eventId
                                    const isIncome = transaction.type === "income"

                                    return (
                                        <TableRow key={transaction.id} className="group transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {isEvent ? (
                                                        <CalendarSearch className="h-3.5 w-3.5 text-primary shrink-0" />
                                                    ) : (
                                                        <Receipt className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                    )}
                                                    <span className="font-semibold text-sm">{transaction.description}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className={`text-right font-bold text-sm ${isIncome ? "text-emerald-600" : "text-destructive"}`}>
                                                {isIncome ? "+" : "-"}{formatCurrency(transaction.amount)}
                                            </TableCell>
                                            <TableCell className="text-right text-sm">
                                                <Badge variant="outline" className="font-medium bg-background">
                                                    {formatDate(transaction.date)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* PDV — somente para receita de eventos da agenda */}
                                                    {isIncome && isEvent && (
                                                        <button
                                                            onClick={() => handleOpenPDV(transaction)}
                                                            title="Faturar no PDV"
                                                            className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                                                        >
                                                            <ShoppingCart className="h-3 w-3" />
                                                            PDV
                                                        </button>
                                                    )}

                                                    {/* Ver agendamento */}
                                                    {isEvent && (
                                                        <button
                                                            onClick={() => handleOpenAgenda(transaction)}
                                                            title="Ver na Agenda"
                                                            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                                        >
                                                            <CalendarSearch className="h-3 w-3" />
                                                            Agenda
                                                        </button>
                                                    )}

                                                    {/* Cancelar — somente eventos */}
                                                    {isEvent && (
                                                        <button
                                                            onClick={() => handleCancel(transaction)}
                                                            disabled={isCancelling}
                                                            title="Cancelar agendamento"
                                                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                                        >
                                                            {isCancelling
                                                                ? <span className="h-3 w-3 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin inline-block" />
                                                                : <X className="h-3.5 w-3.5" />
                                                            }
                                                        </button>
                                                    )}

                                                    {/* Despesas sem evento — sem ações (gerenciadas em Contas a Pagar) */}
                                                    {!isEvent && (
                                                        <span className="text-[11px] text-muted-foreground italic">Contas a Pagar</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
