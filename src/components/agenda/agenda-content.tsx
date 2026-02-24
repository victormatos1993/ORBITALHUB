"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Calendar, momentLocalizer } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import moment from 'moment'
import 'moment/locale/pt-br'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'

import {
    Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight,
    DollarSign, Clock, Users, AlertTriangle, ShoppingCart,
    TrendingUp, CheckCircle, XCircle, Eye, Ban,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EventModal } from "./event-modal"
import { createAgendaEvent, updateAgendaEvent, deleteAgendaEvent, updateAttendanceStatus } from "@/app/actions/agenda"
import { toast } from "sonner"
import clsx from "clsx"
import { format, isToday, isSameWeek, isSameMonth } from "date-fns"
import { ptBR } from "date-fns/locale"

moment.locale('pt-br')
const localizer = momentLocalizer(moment)
const DnDCalendar = withDragAndDrop(Calendar as any)

const formatBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

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
    serviceId?: string | null
    productId?: string | null
    quoteId?: string | null
    paymentStatus?: string | null
    attendanceStatus?: string | null
    serviceName?: string | null
    servicePrice?: number | null
    productName?: string | null
    productPrice?: number | null
    estimatedValue?: number
}

export interface AgendaContentProps {
    initialEvents?: AgendaEvent[]
    products?: any[]
    services?: any[]
    quotes?: any[]
    customers?: any[]
}

// ── Status Colors Legend ──
const STATUS_LEGEND = [
    { color: "#6366f1", label: "Agendado", key: "SCHEDULED" },
    { color: "#d97706", label: "Confirmado", key: "CONFIRMED" },
    { color: "#16a34a", label: "Concluído", key: "COMPLETED" },
    { color: "#dc2626", label: "Cancelado", key: "CANCELLED" },
    { color: "#0891b2", label: "Pago (aguardando)", key: "PAID_PENDING" },
]

export function AgendaContent({ initialEvents = [], products = [], services = [], quotes = [], customers = [] }: AgendaContentProps) {
    const router = useRouter()
    const [events, setEvents] = useState<AgendaEvent[]>(initialEvents)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [currentView, setCurrentView] = useState<any>('month')
    const calendarRef = useRef<any>(null)
    const [hiddenStatuses, setHiddenStatuses] = useState<Set<string>>(new Set())
    const [quickLoading, setQuickLoading] = useState<string | null>(null)

    useEffect(() => { setEvents(initialEvents) }, [initialEvents])

    // ── Filtered events (based on hidden statuses) ──
    const filteredEvents = useMemo(() => {
        if (hiddenStatuses.size === 0) return events
        return events.filter(e => {
            const status = e.attendanceStatus || "SCHEDULED"
            if (hiddenStatuses.has(status)) return false
            if (hiddenStatuses.has("CANCELLED") && status === "NO_SHOW") return false
            if (hiddenStatuses.has("PAID_PENDING") && e.paymentStatus === "PAID" && status === "SCHEDULED") return false
            return true
        })
    }, [events, hiddenStatuses])

    const toggleStatus = (key: string) => {
        setHiddenStatuses(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    // ── Quick Actions ──
    const handleQuickComplete = async (ev: AgendaEvent) => {
        if (!ev.id) return
        setQuickLoading(ev.id)
        try {
            const res = await updateAttendanceStatus(ev.id, "COMPLETED")
            if (res.success) {
                toast.success(`"${ev.title}" marcado como concluído!`)
                setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, attendanceStatus: "COMPLETED" } : e))
            } else toast.error("Erro ao concluir")
        } finally { setQuickLoading(null) }
    }

    const handleQuickCancel = async (ev: AgendaEvent) => {
        if (!ev.id || !confirm(`Cancelar "${ev.title}"?`)) return
        setQuickLoading(ev.id)
        try {
            const res = await updateAttendanceStatus(ev.id, "CANCELLED")
            if (res.success) {
                toast.success(`"${ev.title}" cancelado`)
                setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, attendanceStatus: "CANCELLED" } : e))
            } else toast.error("Erro ao cancelar")
        } finally { setQuickLoading(null) }
    }

    const handleQuickPDV = (ev: AgendaEvent) => {
        const params = new URLSearchParams()
        if (ev.id) params.set("eventId", ev.id)
        if (ev.customerId) params.set("customerId", ev.customerId)
        if (ev.serviceId) params.set("serviceId", ev.serviceId)
        if (ev.productId) params.set("productId", ev.productId)
        router.push(`/dashboard/vendas/pdv?${params.toString()}`)
    }

    // Modal state
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedSlot, setSelectedSlot] = useState<{ start: Date, end: Date } | undefined>()
    const [initialCustomer, setInitialCustomer] = useState<string | undefined>()
    const [initialEmail, setInitialEmail] = useState<string | undefined>()
    const [initialPhone, setInitialPhone] = useState<string | undefined>()
    const [editingEvent, setEditingEvent] = useState<any | null>(null)

    // URL params
    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search)
            if (params.get("new") === "true") {
                const customer = params.get("customerName")
                const email = params.get("customerEmail")
                const phone = params.get("customerPhone")
                if (customer) setInitialCustomer(customer)
                if (email) setInitialEmail(email)
                if (phone) setInitialPhone(phone)
                setModalOpen(true)
                window.history.replaceState({}, document.title, window.location.pathname)
            }
        }
    }, [])

    useEffect(() => {
        if (typeof window === "undefined") return
        const params = new URLSearchParams(window.location.search)
        const eventId = params.get("eventId")
        if (!eventId) return
        window.history.replaceState({}, document.title, window.location.pathname)
        const found = initialEvents.find((e) => e.id === eventId)
        if (found) {
            setTimeout(() => { setEditingEvent(found); setModalOpen(true) }, 100)
        }
    }, [])

    // Auto-scroll to business hours in week/day view
    useEffect(() => {
        if (currentView === 'week' || currentView === 'day') {
            setTimeout(() => {
                const container = document.querySelector('.rbc-time-content')
                if (container) {
                    const hourHeight = container.scrollHeight / 24
                    container.scrollTop = hourHeight * 7.5 // Scroll to ~7:30am
                }
            }, 200)
        }
    }, [currentView, currentDate])

    // ── Summary calculations ──
    const summary = useMemo(() => {
        const now = new Date()
        const todayEvents = events.filter(e => isToday(new Date(e.start)))
        const weekEvents = events.filter(e => isSameWeek(new Date(e.start), now, { weekStartsOn: 1 }))
        const activeToday = todayEvents.filter(e => e.attendanceStatus !== "CANCELLED" && e.attendanceStatus !== "NO_SHOW")
        const activeWeek = weekEvents.filter(e => e.attendanceStatus !== "CANCELLED" && e.attendanceStatus !== "NO_SHOW")
        const pending = events.filter(e => {
            const d = new Date(e.start)
            return d >= now && e.attendanceStatus === "SCHEDULED"
        })

        return {
            todayCount: activeToday.length,
            todayRevenue: activeToday.reduce((sum, e) => sum + (e.estimatedValue || 0), 0),
            weekCount: activeWeek.length,
            weekRevenue: activeWeek.reduce((sum, e) => sum + (e.estimatedValue || 0), 0),
            pendingCount: pending.length,
            cancelledToday: todayEvents.filter(e => e.attendanceStatus === "CANCELLED" || e.attendanceStatus === "NO_SHOW").length,
        }
    }, [events])

    // ── Today's upcoming events (sidebar) ──
    const todayUpcoming = useMemo(() => {
        const now = new Date()
        return events
            .filter(e => isToday(new Date(e.start)) && e.attendanceStatus !== "CANCELLED" && e.attendanceStatus !== "NO_SHOW")
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    }, [events])

    // ── Conflict detection ──
    const conflictIds = useMemo(() => {
        const ids = new Set<string>()
        const active = events.filter(e => e.attendanceStatus !== "CANCELLED" && e.attendanceStatus !== "NO_SHOW")
        for (let i = 0; i < active.length; i++) {
            for (let j = i + 1; j < active.length; j++) {
                const a = active[i], b = active[j]
                const aStart = new Date(a.start).getTime()
                const aEnd = new Date(a.end).getTime()
                const bStart = new Date(b.start).getTime()
                const bEnd = new Date(b.end).getTime()
                if (aStart < bEnd && bStart < aEnd) {
                    if (a.id) ids.add(a.id)
                    if (b.id) ids.add(b.id)
                }
            }
        }
        return ids
    }, [events])

    // ── Handlers ──
    const handleSelectSlot = ({ start, end }: { start: Date, end: Date }) => {
        setEditingEvent(null)
        setSelectedSlot({ start, end })
        setModalOpen(true)
    }

    const handleSelectEvent = (event: any) => {
        setEditingEvent(event)
        setModalOpen(true)
    }

    // ── Drag & Drop handler ──
    const handleEventDropOrResize = useCallback(async ({ event, start, end }: any) => {
        if (!event.id) return
        const newStart = new Date(start)
        const newEnd = new Date(end)
        // Optimistic update
        setEvents(prev => prev.map(e =>
            e.id === event.id ? { ...e, start: newStart, end: newEnd } : e
        ))
        try {
            const res = await updateAgendaEvent(event.id, {
                title: event.title,
                type: event.type || "Sem Categoria",
                startDate: newStart,
                endDate: newEnd,
                isLocal: event.isLocal || false,
                location: event.location,
                customerName: event.customerName,
                customerId: event.customerId,
                productId: event.productId,
                serviceId: event.serviceId,
                quoteId: event.quoteId,
            })
            if (res.success) {
                toast.success(`"${event.title}" reagendado para ${format(newStart, "dd/MM HH:mm", { locale: ptBR })}`)
            } else {
                toast.error("Erro ao reagendar")
                setEvents(prev => prev.map(e =>
                    e.id === event.id ? { ...e, start: new Date(event.start), end: new Date(event.end) } : e
                ))
            }
        } catch {
            toast.error("Erro ao reagendar")
            setEvents(prev => prev.map(e =>
                e.id === event.id ? { ...e, start: new Date(event.start), end: new Date(event.end) } : e
            ))
        }
    }, [events])

    const handleNewEventBtn = () => {
        setEditingEvent(null)
        setSelectedSlot(undefined)
        setModalOpen(true)
    }

    const handleSaveEvent = async (newEventData: any) => {
        let res: any
        if (editingEvent?.id) {
            res = await updateAgendaEvent(editingEvent.id, {
                title: newEventData.title,
                type: newEventData.tipo || "Sem Categoria",
                startDate: newEventData.start,
                endDate: newEventData.end,
                isLocal: newEventData.isLocal || false,
                location: newEventData.local,
                customerName: newEventData.cliente,
                customerId: newEventData.customerId,
                productId: newEventData.productId,
                serviceId: newEventData.serviceId,
                quoteId: newEventData.quoteId,
            })
        } else {
            res = await createAgendaEvent({
                title: newEventData.title,
                type: newEventData.tipo || "Sem Categoria",
                startDate: newEventData.start,
                endDate: newEventData.end,
                isLocal: newEventData.isLocal || false,
                location: newEventData.local,
                customerName: newEventData.cliente,
                customerEmail: newEventData.clienteEmail,
                customerPhone: newEventData.clienteTelefone,
                customerId: newEventData.customerId,
                productId: newEventData.productId,
                serviceId: newEventData.serviceId,
                quoteId: newEventData.quoteId,
                recurrenceRule: newEventData.recurrenceRule || null,
                recurrenceCount: newEventData.recurrenceCount || null,
            })
        }
        if (!res.success) {
            toast.error("Erro ao salvar agendamento.")
        } else {
            const total = res.totalCreated || 1
            toast.success(
                editingEvent
                    ? "Agendamento atualizado!"
                    : total > 1
                        ? `${total} eventos criados com sucesso!`
                        : "Evento salvo com sucesso!"
            )
            setModalOpen(false)
            setEditingEvent(null)
        }
    }

    const handleDeleteEvent = async (id: string) => {
        const res = await deleteAgendaEvent(id)
        if (res.success) {
            toast.success("Agendamento excluído com sucesso!")
            setEvents(events.filter(e => e.id !== id))
            setModalOpen(false)
            setEditingEvent(null)
        } else {
            toast.error("Erro ao excluir agendamento.")
        }
    }

    // ── Custom Toolbar ──
    const CustomToolbar = (toolbar: any) => {
        const goToBack = () => toolbar.onNavigate('PREV')
        const goToNext = () => toolbar.onNavigate('NEXT')
        const goToCurrent = () => toolbar.onNavigate('TODAY')

        const label = () => {
            const date = moment(toolbar.date)
            return (
                <span className="text-xl font-bold tracking-tight text-foreground capitalize">
                    {date.format('MMMM yyyy')}
                </span>
            )
        }

        const viewNames = toolbar.views
        const currentView = toolbar.view

        return (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 mt-1">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={goToCurrent} className="font-medium h-9 rounded-lg">
                        Hoje
                    </Button>
                    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-border/50">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-background shadow-sm" onClick={goToBack}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-background shadow-sm" onClick={goToNext}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="flex-1 flex justify-center">{label()}</div>
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/50">
                    {viewNames.map((view: string) => (
                        <Button
                            key={view}
                            variant={currentView === view ? "default" : "ghost"}
                            size="sm"
                            onClick={() => toolbar.onView(view)}
                            className={clsx(
                                "capitalize h-8 rounded-lg px-4 text-sm font-medium transition-all",
                                currentView === view
                                    ? "bg-background text-foreground shadow-sm hover:bg-background"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            {toolbar.localizer.messages[view] || view}
                        </Button>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4 pb-8">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                        <CalendarIcon className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
                        <p className="text-sm text-muted-foreground max-w-xl">
                            Central de atendimentos — gerencie horários e receitas previstas.
                        </p>
                    </div>
                </div>
                <Button className="rounded-xl gradient-primary text-white shadow-lg shadow-primary/20 h-10" onClick={handleNewEventBtn}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Evento
                </Button>
            </div>

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border bg-card p-4 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 text-indigo-500" />
                        Hoje
                    </div>
                    <p className="text-2xl font-bold">{summary.todayCount}</p>
                    <p className="text-xs text-muted-foreground">
                        {summary.todayRevenue > 0 ? formatBRL(summary.todayRevenue) + " previsto" : "atendimento" + (summary.todayCount !== 1 ? "s" : "")}
                    </p>
                </div>
                <div className="rounded-xl border bg-card p-4 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        Semana
                    </div>
                    <p className="text-2xl font-bold">{summary.weekCount}</p>
                    <p className="text-xs text-muted-foreground">
                        {summary.weekRevenue > 0 ? formatBRL(summary.weekRevenue) + " previsto" : "atendimento" + (summary.weekCount !== 1 ? "s" : "")}
                    </p>
                </div>
                <div className="rounded-xl border bg-card p-4 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Pendentes
                    </div>
                    <p className="text-2xl font-bold">{summary.pendingCount}</p>
                    <p className="text-xs text-muted-foreground">sem confirmação</p>
                </div>
                <div className="rounded-xl border bg-card p-4 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Cancelados
                    </div>
                    <p className="text-2xl font-bold">{summary.cancelledToday}</p>
                    <p className="text-xs text-muted-foreground">hoje</p>
                </div>
            </div>

            {/* ── Legend (clickable filter toggles) ── */}
            <div className="flex items-center gap-3 flex-wrap px-1">
                <span className="text-xs text-muted-foreground font-medium">Filtrar:</span>
                {STATUS_LEGEND.map(s => {
                    const isHidden = hiddenStatuses.has(s.key)
                    return (
                        <button
                            key={s.key}
                            onClick={() => toggleStatus(s.key)}
                            className={clsx(
                                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all text-xs border",
                                isHidden
                                    ? "opacity-40 line-through border-transparent"
                                    : "border-border/50 bg-muted/30 hover:bg-muted/60"
                            )}
                        >
                            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="text-muted-foreground">{s.label}</span>
                        </button>
                    )
                })}
                {hiddenStatuses.size > 0 && (
                    <button
                        onClick={() => setHiddenStatuses(new Set())}
                        className="text-xs text-primary hover:underline ml-1"
                    >
                        Mostrar todos
                    </button>
                )}
            </div>

            {/* ── Main layout: Calendar + Sidebar ── */}
            <div className="flex gap-4 flex-col lg:flex-row">
                {/* Calendar */}
                <div className="flex-1 bg-card rounded-2xl border border-border/40 shadow-sm p-4 min-h-[550px]">
                    <style>{`
                        .rbc-calendar { font-family: var(--font-inter), sans-serif; }
                        .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
                            background: hsl(var(--background)/0.4);
                            border: 1px solid hsl(var(--border)/0.4) !important;
                            border-radius: 12px; overflow: hidden;
                        }
                        .rbc-header {
                            padding: 12px 0; font-weight: 600; font-size: 0.875rem;
                            color: hsl(var(--muted-foreground));
                            border-bottom: 1px solid hsl(var(--border)/0.4) !important;
                            border-left: none !important; text-transform: capitalize;
                        }
                        .rbc-month-row { border-top: 1px solid hsl(var(--border)/0.4) !important; }
                        .rbc-day-bg + .rbc-day-bg { border-left: 1px solid hsl(var(--border)/0.4) !important; }
                        .rbc-time-header-content { border-left: 1px solid hsl(var(--border)/0.4) !important; }
                        .rbc-time-content { border-top: 1px solid hsl(var(--border)/0.4) !important; }
                        .rbc-timeslot-group { border-bottom: 1px solid hsl(var(--border)/0.2) !important; }
                        .rbc-time-content > * + * > * { border-left: 1px solid hsl(var(--border)/0.4) !important; }
                        .rbc-day-slot .rbc-time-slot { border-top: 1px solid hsl(var(--border)/0.1) !important; }
                        .rbc-off-range-bg { background-color: hsl(var(--muted)/0.1) !important; }
                        .rbc-today { background-color: hsl(var(--primary)/0.03) !important; }
                        .rbc-event {
                            color: #fff !important; border: none !important;
                            border-radius: 6px !important; padding: 3px 6px !important;
                            font-size: 0.7rem !important; font-weight: 500;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.15) !important;
                            transition: all 0.2s ease !important; margin: 1px !important;
                            line-height: 1.3 !important;
                        }
                        .rbc-event:hover { filter: brightness(1.15); transform: translateY(-1px); }
                        .rbc-event.evt-scheduled  { background-color: #6366f1 !important; }
                        .rbc-event.evt-confirmed  { background-color: #d97706 !important; }
                        .rbc-event.evt-completed  { background-color: #059669 !important; }
                        .rbc-event.evt-cancelled  { background-color: #6b7280 !important; opacity: 0.5; }
                        .rbc-event.evt-no-show    { background-color: #ef4444 !important; opacity: 0.6; }
                        .rbc-event.evt-paid-pending { background-color: #0ea5e9 !important; }
                        .rbc-event.evt-conflict {
                            box-shadow: 0 0 0 2px #ef4444, 0 0 8px rgba(239,68,68,0.35) !important;
                            animation: conflict-pulse 2s ease-in-out infinite;
                        }
                        @keyframes conflict-pulse {
                            0%, 100% { box-shadow: 0 0 0 2px #ef4444, 0 0 8px rgba(239,68,68,0.35); }
                            50% { box-shadow: 0 0 0 2px #ef4444, 0 0 14px rgba(239,68,68,0.55); }
                        }
                        .rbc-toolbar { display: none !important; }
                        .rbc-show-more { color: hsl(var(--primary)); font-size: 11px; font-weight: 600; }
                        .rbc-date-cell { text-align: center; padding: 4px; font-size: 0.8rem; color: hsl(var(--muted-foreground)); }
                        .rbc-date-cell.rbc-now { font-weight: 700; color: hsl(var(--primary)); }
                        .rbc-current-time-indicator {
                            background-color: hsl(var(--primary)) !important;
                            height: 2px !important;
                        }
                        .rbc-current-time-indicator::before {
                            content: ''; position: absolute; left: -4px; top: -3px;
                            width: 8px; height: 8px; border-radius: 50%;
                            background-color: hsl(var(--primary)) !important;
                        }
                        .rbc-addons-dnd .rbc-addons-dnd-resize-ns-anchor { cursor: ns-resize; }
                        .rbc-addons-dnd .rbc-event { cursor: grab; }
                        .rbc-addons-dnd .rbc-event:active { cursor: grabbing; }
                    `}</style>
                    <div style={{ height: currentView === 'month' ? '600px' : '650px', width: '100%' }}>
                        <DnDCalendar
                            ref={calendarRef}
                            localizer={localizer}
                            events={filteredEvents}
                            startAccessor="start"
                            endAccessor="end"
                            date={currentDate}
                            view={currentView}
                            onNavigate={setCurrentDate}
                            onView={setCurrentView}
                            views={["month", "week", "day"]}
                            style={{ height: "100%", width: "100%" }}
                            selectable
                            resizable
                            onEventDrop={handleEventDropOrResize}
                            onEventResize={handleEventDropOrResize}
                            onSelectSlot={handleSelectSlot}
                            onSelectEvent={handleSelectEvent}
                            scrollToTime={new Date(1970, 0, 1, 8, 0, 0)}
                            draggableAccessor={() => true}
                            eventPropGetter={(event: any) => {
                                const a = event.attendanceStatus
                                const p = event.paymentStatus
                                let cls = "evt-scheduled"
                                if (a === "COMPLETED") cls = "evt-completed"
                                else if (a === "CONFIRMED") cls = "evt-confirmed"
                                else if (a === "CANCELLED") cls = "evt-cancelled"
                                else if (a === "NO_SHOW") cls = "evt-no-show"
                                else if (p === "PAID") cls = "evt-paid-pending"
                                if (event.id && conflictIds.has(event.id)) cls += " evt-conflict"
                                return { className: cls }
                            }}
                            components={{
                                toolbar: CustomToolbar,
                                event: ({ event }: any) => (
                                    <div className="flex items-center gap-1 leading-tight truncate">
                                        {event.id && conflictIds.has(event.id) && <span title="Conflito de horário" className="shrink-0">⚠️</span>}
                                        <span className="truncate font-medium">{event.title}</span>
                                        {event.estimatedValue > 0 && (
                                            <span className="opacity-80 text-[9px] shrink-0">
                                                {formatBRL(event.estimatedValue)}
                                            </span>
                                        )}
                                        {event.attendanceStatus === "COMPLETED" && <span title="Atendido" className="shrink-0">✓</span>}
                                        {event.attendanceStatus === "CONFIRMED" && <span title="Confirmado" className="shrink-0">●</span>}
                                        {event.paymentStatus === "PAID" && <span title="Pago" className="shrink-0">💰</span>}
                                    </div>
                                ),
                            }}
                            messages={{
                                next: "►", previous: "◄", today: "Hoje",
                                month: "Mês", week: "Semana", day: "Dia",
                                date: "Data", time: "Hora", event: "Evento",
                                noEventsInRange: "Não há eventos nesta janela.",
                                allDay: "O dia todo",
                                showMore: (total) => `+${total} mais`
                            }}
                        />
                        {conflictIds.size > 0 && (
                            <div className="mt-3 flex items-center gap-2 px-1">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <span className="text-xs text-red-500 font-medium">
                                    {conflictIds.size} evento{conflictIds.size > 1 ? 's' : ''} com conflito de horário
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Sidebar: Próximos Atendimentos ── */}
                <div className="w-full lg:w-80 shrink-0">
                    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden sticky top-4">
                        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-4 py-3 border-b">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <Clock className="h-4 w-4 text-indigo-500" />
                                Atendimentos de Hoje
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                            </p>
                        </div>
                        <div className="divide-y max-h-[520px] overflow-y-auto">
                            {todayUpcoming.length === 0 ? (
                                <div className="p-6 text-center text-sm text-muted-foreground">
                                    <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    Nenhum atendimento agendado para hoje.
                                </div>
                            ) : (
                                todayUpcoming.map((ev) => {
                                    const startTime = format(new Date(ev.start), "HH:mm")
                                    const endTime = format(new Date(ev.end), "HH:mm")
                                    const statusColor = ev.attendanceStatus === "COMPLETED" ? "bg-emerald-500"
                                        : ev.attendanceStatus === "CONFIRMED" ? "bg-amber-500"
                                            : "bg-indigo-500"

                                    const hasConflict = ev.id ? conflictIds.has(ev.id) : false
                                    const canAct = ev.attendanceStatus === "SCHEDULED" || ev.attendanceStatus === "CONFIRMED"
                                    const isLoading = quickLoading === ev.id

                                    return (
                                        <div
                                            key={ev.id}
                                            className="px-4 py-3 hover:bg-muted/30 transition-colors group"
                                        >
                                            <button
                                                onClick={() => handleSelectEvent(ev)}
                                                className="w-full text-left"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="flex flex-col items-center pt-0.5">
                                                        <div className={`h-2 w-2 rounded-full ${statusColor}`} />
                                                        <div className="w-px h-8 bg-border mt-1" />
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-mono text-muted-foreground">{startTime}</span>
                                                            <span className="text-xs text-muted-foreground">→</span>
                                                            <span className="text-xs font-mono text-muted-foreground">{endTime}</span>
                                                        </div>
                                                        <p className="text-sm font-semibold truncate">
                                                            {hasConflict && <span className="text-red-500 mr-1" title="Conflito">⚠️</span>}
                                                            {ev.title}
                                                        </p>
                                                        {ev.customerName && (
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Users className="h-3 w-3" /> {ev.customerName}
                                                            </p>
                                                        )}
                                                        {ev.serviceName && (
                                                            <p className="text-xs text-muted-foreground truncate">🔧 {ev.serviceName}</p>
                                                        )}
                                                        <div className="flex items-center gap-2 pt-0.5">
                                                            {(ev.estimatedValue ?? 0) > 0 && (
                                                                <Badge variant="outline" className="text-[10px] py-0 h-5 font-semibold text-emerald-600 border-emerald-200 bg-emerald-50">
                                                                    {formatBRL(ev.estimatedValue!)}
                                                                </Badge>
                                                            )}
                                                            {ev.paymentStatus === "PAID" && (
                                                                <Badge className="text-[10px] py-0 h-5 bg-emerald-500 text-white">Pago</Badge>
                                                            )}
                                                            {ev.attendanceStatus === "COMPLETED" && (
                                                                <Badge className="text-[10px] py-0 h-5 bg-emerald-600 text-white">Atendido</Badge>
                                                            )}
                                                            {ev.attendanceStatus === "CANCELLED" && (
                                                                <Badge className="text-[10px] py-0 h-5 bg-red-500/80 text-white">Cancelado</Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                </div>
                                            </button>
                                            {/* ── Quick Actions ── */}
                                            {canAct && (
                                                <div className="flex items-center gap-1 mt-2 ml-5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                        disabled={isLoading}
                                                        onClick={(e) => { e.stopPropagation(); handleQuickComplete(ev) }}
                                                    >
                                                        <CheckCircle className="h-3 w-3" /> Concluir
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 text-xs gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                        disabled={isLoading}
                                                        onClick={(e) => { e.stopPropagation(); handleQuickPDV(ev) }}
                                                    >
                                                        <ShoppingCart className="h-3 w-3" /> PDV
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 text-xs gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        disabled={isLoading}
                                                        onClick={(e) => { e.stopPropagation(); handleQuickCancel(ev) }}
                                                    >
                                                        <Ban className="h-3 w-3" /> Cancelar
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                        {todayUpcoming.length > 0 && (
                            <div className="px-4 py-2.5 border-t bg-muted/30 text-center">
                                <p className="text-xs font-medium text-muted-foreground">
                                    {todayUpcoming.length} atendimento{todayUpcoming.length !== 1 ? "s" : ""}
                                    {todayUpcoming.reduce((s, e) => s + (e.estimatedValue || 0), 0) > 0 &&
                                        ` • ${formatBRL(todayUpcoming.reduce((s, e) => s + (e.estimatedValue || 0), 0))} previsto`
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <EventModal
                key={editingEvent?.id || "new"}
                open={modalOpen}
                onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingEvent(null) }}
                initialStart={editingEvent ? editingEvent.start : selectedSlot?.start}
                initialEnd={editingEvent ? editingEvent.end : selectedSlot?.end}
                initialTitle={editingEvent?.title}
                initialType={editingEvent?.type}
                initialLocation={editingEvent?.location}
                initialIsLocal={editingEvent?.isLocal}
                initialCustomerId={editingEvent?.customerId}
                initialProductId={editingEvent?.productId}
                initialServiceId={editingEvent?.serviceId}
                initialQuoteId={editingEvent?.quoteId}
                initialCustomerName={editingEvent?.customerName || initialCustomer}
                initialCustomerEmail={editingEvent?.customerEmail || initialEmail}
                initialCustomerPhone={editingEvent?.customerPhone || initialPhone}
                paymentStatus={editingEvent?.paymentStatus}
                attendanceStatus={editingEvent?.attendanceStatus}
                onAttendanceChange={editingEvent?.id ? async (status) => {
                    const res = await updateAttendanceStatus(editingEvent.id!, status)
                    if (res.success) {
                        toast.success("Status de atendimento atualizado!")
                        setEditingEvent({ ...editingEvent, attendanceStatus: status })
                    } else {
                        toast.error("Erro ao atualizar status")
                    }
                } : undefined}
                products={products}
                services={services}
                quotes={quotes}
                customers={customers}
                eventTypes={Array.from(new Set(events.map((e: any) => e.type)))}
                onSave={handleSaveEvent}
                onDelete={editingEvent?.id ? () => handleDeleteEvent(editingEvent.id!) : undefined}
            />
        </div>
    )
}
