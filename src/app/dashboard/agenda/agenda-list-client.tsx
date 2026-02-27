"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    isWithinInterval, addMonths, subMonths, eachDayOfInterval, isSameDay
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import {
    CalendarCheck, Calendar, CalendarDays, List, Filter,
    ChevronLeft, ChevronRight, Search, Plus, MapPin, User,
    Clock, CreditCard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { EventModal } from "@/components/agenda/event-modal"
import { createAgendaEvent, updateAgendaEvent, deleteAgendaEvent } from "@/app/actions/agenda"

// ── Tipos ──
export interface AgendaEvent {
    id?: string
    title: string
    start: Date
    end: Date
    type?: string
    isLocal?: boolean
    location?: string | null
    customerName?: string | null
    customerId?: string | null
    customerEmail?: string | null
    customerPhone?: string | null
    productId?: string | null
    serviceId?: string | null
    quoteId?: string | null
    paymentStatus?: string | null
    attendanceStatus?: string | null
    serviceName?: string | null
    servicePrice?: number | null
    productName?: string | null
    productPrice?: number | null
    estimatedValue?: number
}

type ViewMode = "all" | "month" | "week" | "today" | "3months" | "6months"

const formatBRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

const getEventDate = (ev: AgendaEvent): string => {
    const d = typeof ev.start === "string" ? new Date(ev.start) : ev.start
    return format(d, "yyyy-MM-dd")
}

const STATUS_COLORS: Record<string, string> = {
    SCHEDULED: "bg-indigo-100 text-indigo-700",
    CONFIRMED: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-700",
    PAID_PENDING: "bg-cyan-100 text-cyan-700",
}

const STATUS_LABELS: Record<string, string> = {
    SCHEDULED: "Agendado",
    CONFIRMED: "Confirmado",
    COMPLETED: "Concluído",
    CANCELLED: "Cancelado",
    PAID_PENDING: "Pago (aguardando)",
}

// ── Componente Principal ──
export function AgendaListClient({
    initialEvents,
    products = [],
    services = [],
    quotes = [],
    customers = [],
}: {
    initialEvents: AgendaEvent[]
    products?: any[]
    services?: any[]
    quotes?: any[]
    customers?: any[]
}) {
    const router = useRouter()
    const [events, setEvents] = useState(initialEvents)
    const [viewMode, setViewMode] = useState<ViewMode>("week")
    const [selectedMonth, setSelectedMonth] = useState(new Date())
    const [selectedCardIndex, setSelectedCardIndex] = useState(0)
    const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)
    const [search, setSearch] = useState("")
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null)

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode)
        setSelectedCardIndex(0)
        setSelectedDayIndex(null)
    }

    const getDateRange = useMemo(() => {
        if (viewMode === "month") return { start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) }
        if (viewMode === "week") return { start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) }
        if (viewMode === "3months") { const s = startOfMonth(selectedMonth); return { start: s, end: endOfMonth(addMonths(s, 2)) } }
        if (viewMode === "6months") { const s = startOfMonth(selectedMonth); return { start: s, end: endOfMonth(addMonths(s, 5)) } }
        return null
    }, [viewMode, selectedMonth])

    const filteredEvents = useMemo(() => {
        let result = [...events]

        if (viewMode === "today") {
            const today = format(new Date(), "yyyy-MM-dd")
            result = result.filter(ev => getEventDate(ev) === today)
        } else if (getDateRange) {
            result = result.filter(ev => {
                const d = new Date(getEventDate(ev) + "T12:00:00")
                return isWithinInterval(d, getDateRange)
            })
        }

        if (search) {
            const q = search.toLowerCase()
            result = result.filter(ev =>
                ev.title.toLowerCase().includes(q) ||
                ev.customerName?.toLowerCase().includes(q) ||
                ev.serviceName?.toLowerCase().includes(q) ||
                ev.productName?.toLowerCase().includes(q)
            )
        }

        result.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        return result
    }, [events, viewMode, selectedMonth, getDateRange, search])

    const tableEvents = useMemo(() => {
        // For week/month: filter by selected day card
        if ((viewMode === "week" || viewMode === "month") && selectedDayIndex !== null && getDateRange) {
            const days = eachDayOfInterval(getDateRange)
            const selectedDay = days[selectedDayIndex]
            if (selectedDay) {
                const dayStr = format(selectedDay, "yyyy-MM-dd")
                return filteredEvents.filter(ev => getEventDate(ev) === dayStr)
            }
        }
        // For 3months/6months: filter by selected month card
        if (viewMode === "3months" || viewMode === "6months") {
            const cardMonth = addMonths(startOfMonth(selectedMonth), selectedCardIndex)
            const mStart = startOfMonth(cardMonth)
            const mEnd = endOfMonth(cardMonth)
            return filteredEvents.filter(ev => {
                const d = new Date(getEventDate(ev) + "T12:00:00")
                return isWithinInterval(d, { start: mStart, end: mEnd })
            })
        }
        return filteredEvents
    }, [filteredEvents, viewMode, selectedMonth, selectedCardIndex, selectedDayIndex, getDateRange])

    const periodCards = useMemo(() => {
        if (viewMode === "today" || viewMode === "all") return []

        if (viewMode === "week" && getDateRange) {
            return eachDayOfInterval(getDateRange).map(day => {
                const dayStr = format(day, "yyyy-MM-dd")
                const dayItems = filteredEvents.filter(ev => getEventDate(ev) === dayStr)
                return { label: format(day, "EEE", { locale: ptBR }), sublabel: format(day, "dd/MM"), count: dayItems.length, isToday: isSameDay(day, new Date()) }
            })
        }

        if (viewMode === "month" && getDateRange) {
            return eachDayOfInterval(getDateRange).map(day => {
                const dayStr = format(day, "yyyy-MM-dd")
                const dayItems = filteredEvents.filter(ev => getEventDate(ev) === dayStr)
                return { label: format(day, "dd"), sublabel: format(day, "EEE", { locale: ptBR }), count: dayItems.length, isToday: isSameDay(day, new Date()) }
            })
        }

        if ((viewMode === "3months" || viewMode === "6months") && getDateRange) {
            const n = viewMode === "3months" ? 3 : 6
            return Array.from({ length: n }, (_, i) => {
                const md = addMonths(startOfMonth(selectedMonth), i)
                const mS = startOfMonth(md), mE = endOfMonth(md)
                const items = filteredEvents.filter(ev => { const d = new Date(getEventDate(ev) + "T12:00:00"); return isWithinInterval(d, { start: mS, end: mE }) })
                return { label: format(md, "MMM", { locale: ptBR }), sublabel: format(md, "yyyy"), count: items.length, isToday: isSameDay(startOfMonth(new Date()), mS) }
            })
        }
        return []
    }, [viewMode, getDateRange, filteredEvents, selectedMonth])

    const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: ptBR })
    const periodLabel = useMemo(() => {
        if (viewMode === "3months") return `${format(selectedMonth, "MMM/yy", { locale: ptBR })} — ${format(addMonths(selectedMonth, 2), "MMM/yy", { locale: ptBR })}`
        if (viewMode === "6months") return `${format(selectedMonth, "MMM/yy", { locale: ptBR })} — ${format(addMonths(selectedMonth, 5), "MMM/yy", { locale: ptBR })}`
        return monthLabel
    }, [viewMode, selectedMonth, monthLabel])

    const handleOpenNew = () => {
        setSelectedEvent(null)
        setModalOpen(true)
    }

    const handleOpenEdit = (ev: AgendaEvent) => {
        setSelectedEvent(ev)
        setModalOpen(true)
    }

    const handleSaveEvent = async (data: any) => {
        try {
            if (selectedEvent?.id) {
                await updateAgendaEvent(selectedEvent.id, data)
                toast.success("Evento atualizado")
            } else {
                await createAgendaEvent(data)
                toast.success("Evento criado")
            }
            router.refresh()
            setModalOpen(false)
            setSelectedEvent(null)
        } catch {
            toast.error("Erro ao salvar evento")
        }
    }

    const handleDeleteEvent = async () => {
        if (!selectedEvent?.id) return
        try {
            await deleteAgendaEvent(selectedEvent.id)
            setEvents(prev => prev.filter(e => e.id !== selectedEvent.id))
            toast.success("Evento removido")
            setSelectedEvent(null)
            setModalOpen(false)
        } catch {
            toast.error("Erro ao remover evento")
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Agenda</h1>
                    <p className="text-muted-foreground text-sm">Gerencie seus horários, eventos e compromissos</p>
                </div>
                <Button onClick={handleOpenNew}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Evento
                </Button>
            </div>

            {/* Resumo */}
            <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                    <CalendarCheck className="h-6 w-6 text-indigo-500" />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">
                        Agendamentos {viewMode === "month" ? `em ${monthLabel}` : viewMode === "week" ? "esta semana" : viewMode === "today" ? "hoje" : viewMode !== "all" ? `em ${periodLabel}` : ""}
                    </p>
                    <p className="text-2xl font-bold text-indigo-500">{filteredEvents.length} evento{filteredEvents.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="ml-auto text-sm text-muted-foreground">
                    {tableEvents.length} na lista
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
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedMonth(prev => subMonths(prev, viewMode === "6months" ? 6 : viewMode === "3months" ? 3 : 1)); setSelectedDayIndex(null) }}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium min-w-[140px] text-center capitalize">{viewMode === "month" ? monthLabel : periodLabel}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedMonth(prev => addMonths(prev, viewMode === "6months" ? 6 : viewMode === "3months" ? 3 : 1)); setSelectedDayIndex(null) }}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    <div className="h-5 w-px bg-border mx-1 hidden sm:block" />

                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Buscar evento, cliente, serviço..."
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
                                        <p className="text-xs font-bold mt-0.5 text-white dark:text-slate-800">{card.count} ev.</p>
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
                                    : card.count > 0 ? "bg-indigo-500/5 border-indigo-500/20"
                                        : "bg-muted/30 border-muted"
                                    }`}
                            >
                                <p className={`text-[10px] font-semibold uppercase ${isSelected ? "text-primary" : "text-muted-foreground"}`}>{card.label}</p>
                                <p className="text-[9px] text-muted-foreground">{card.sublabel}</p>
                                {card.count > 0 ? (
                                    <p className="text-xs font-bold text-indigo-500 mt-0.5">{card.count} ev.</p>
                                ) : (
                                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">—</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Lista de Eventos */}
            {tableEvents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground rounded-xl border bg-card">
                    <CalendarCheck className="h-12 w-12 mx-auto mb-4 text-indigo-500/30" />
                    <p className="text-lg font-medium">Nenhum evento encontrado</p>
                    <p className="text-sm">Nenhum agendamento registrado neste período.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {tableEvents.map((ev) => {
                        const startDate = typeof ev.start === "string" ? new Date(ev.start) : ev.start
                        const endDate = typeof ev.end === "string" ? new Date(ev.end) : ev.end
                        const status = ev.attendanceStatus || "SCHEDULED"

                        return (
                            <div
                                key={ev.id}
                                onClick={() => handleOpenEdit(ev)}
                                className="rounded-xl border bg-card p-4 hover:shadow-sm hover:border-primary/20 transition-all cursor-pointer"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex flex-col items-center min-w-[50px] rounded-lg bg-muted/50 p-2">
                                        <span className="text-lg font-bold">{format(startDate, "dd")}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase">{format(startDate, "MMM", { locale: ptBR })}</span>
                                        <span className="text-xs font-medium text-primary mt-1">{format(startDate, "HH:mm")}</span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold truncate">{ev.title}</h3>
                                            <Badge className={`${STATUS_COLORS[status] || "bg-muted"} text-[10px] shrink-0`}>
                                                {STATUS_LABELS[status] || status}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {format(startDate, "HH:mm")} — {format(endDate, "HH:mm")}
                                            </span>
                                            {ev.customerName && (
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3 w-3" /> {ev.customerName}
                                                </span>
                                            )}
                                            {ev.location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" /> {ev.location}
                                                </span>
                                            )}
                                            {(ev.serviceName || ev.productName) && (
                                                <span className="flex items-center gap-1">
                                                    <CreditCard className="h-3 w-3" /> {ev.serviceName || ev.productName}
                                                    {(ev.servicePrice || ev.productPrice || ev.estimatedValue) && (
                                                        <span className="font-medium text-primary ml-0.5">
                                                            {formatBRL(ev.servicePrice || ev.productPrice || ev.estimatedValue || 0)}
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* EventModal — uses individual initialXxx props */}
            <EventModal
                key={selectedEvent?.id || "new"}
                open={modalOpen}
                onOpenChange={(open) => { setModalOpen(open); if (!open) setSelectedEvent(null) }}
                onSave={handleSaveEvent}
                onDelete={selectedEvent?.id ? handleDeleteEvent : undefined}
                initialTitle={selectedEvent?.title}
                initialStart={selectedEvent ? new Date(selectedEvent.start) : undefined}
                initialEnd={selectedEvent ? new Date(selectedEvent.end) : undefined}
                initialType={selectedEvent?.type}
                initialIsLocal={selectedEvent?.isLocal}
                initialLocation={selectedEvent?.location ?? undefined}
                initialCustomerName={selectedEvent?.customerName ?? undefined}
                initialCustomerEmail={selectedEvent?.customerEmail ?? undefined}
                initialCustomerPhone={selectedEvent?.customerPhone ?? undefined}
                initialCustomerId={selectedEvent?.customerId ?? undefined}
                initialProductId={selectedEvent?.productId ?? undefined}
                initialServiceId={selectedEvent?.serviceId ?? undefined}
                initialQuoteId={selectedEvent?.quoteId ?? undefined}
                paymentStatus={selectedEvent?.paymentStatus}
                attendanceStatus={selectedEvent?.attendanceStatus}
                products={products}
                services={services}
                quotes={quotes}
                customers={customers}
            />
        </div>
    )
}
