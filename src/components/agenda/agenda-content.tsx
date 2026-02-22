"use client"

import { useState, useEffect } from "react"
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/pt-br'
import 'react-big-calendar/lib/css/react-big-calendar.css'

import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EventModal } from "./event-modal"
import { createAgendaEvent, updateAgendaEvent, deleteAgendaEvent } from "@/app/actions/agenda"
import { toast } from "sonner"
import clsx from "clsx"

// Setup localizer para o react-big-calendar usando o moment.js para ditar as horas e dias.
moment.locale('pt-br')
const localizer = momentLocalizer(moment)

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
}

export interface AgendaContentProps {
    initialEvents?: AgendaEvent[]
    products?: any[]
    services?: any[]
    quotes?: any[]
    customers?: any[]
}

export function AgendaContent({ initialEvents = [], products = [], services = [], quotes = [], customers = [] }: AgendaContentProps) {
    const [events, setEvents] = useState<AgendaEvent[]>(initialEvents)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [currentView, setCurrentView] = useState<any>('month')

    // Sync state with props when server revalidates
    useEffect(() => {
        setEvents(initialEvents)
    }, [initialEvents])

    // Modal state
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedSlot, setSelectedSlot] = useState<{ start: Date, end: Date } | undefined>()
    const [initialCustomer, setInitialCustomer] = useState<string | undefined>()
    const [initialEmail, setInitialEmail] = useState<string | undefined>()
    const [initialPhone, setInitialPhone] = useState<string | undefined>()

    // Check URL params to auto-open new event (from Customer view)
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
                // Remove param to avoid re-triggering on future refreshes/navigation back
                window.history.replaceState({}, document.title, window.location.pathname)
            }
        }
    }, [])

    const [editingEvent, setEditingEvent] = useState<any | null>(null)

    const handleSelectSlot = ({ start, end }: { start: Date, end: Date }) => {
        setEditingEvent(null)
        setSelectedSlot({ start, end })
        setModalOpen(true)
    }

    const handleSelectEvent = (event: any) => {
        setEditingEvent(event)
        setModalOpen(true)
    }

    const CustomToolbar = (toolbar: any) => {
        const goToBack = () => {
            toolbar.onNavigate('PREV')
        }
        const goToNext = () => {
            toolbar.onNavigate('NEXT')
        }
        const goToCurrent = () => {
            toolbar.onNavigate('TODAY')
        }

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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 mt-2">
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

                <div className="flex-1 flex justify-center">
                    {label()}
                </div>

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

    const handleNewEventBtn = () => {
        setEditingEvent(null)
        setSelectedSlot(undefined)
        setModalOpen(true)
    }

    const handleSaveEvent = async (newEventData: any) => {
        let res;

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
            // Nota: O updateAgendaEvent no backend precisa ser implementado para aceitar email/telefone
            // caso se queira atualizar o cliente, mas por agora, se for um evento novo ou estamos recriando, vamos passar.
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
            })
        }

        if (!res.success) {
            toast.error("Erro ao salvar agendamento.")
        } else {
            toast.success(editingEvent ? "Agendamento atualizado!" : "Evento salvo com sucesso!")
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

    return (
        <div className="flex flex-col gap-8 pb-8 h-[calc(100vh-80px)]">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                        <CalendarIcon className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
                        <p className="text-sm text-muted-foreground max-w-xl">
                            Gerencie seus horários, compromissos e agendamentos de equipe.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        className="rounded-xl gradient-primary text-white shadow-lg shadow-primary/20 h-10"
                        onClick={handleNewEventBtn}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Evento
                    </Button>
                </div>
            </div>

            {/* Calendar Container */}
            <div className="flex-1 bg-card rounded-2xl border border-border/40 shadow-sm p-4 min-h-[500px]">
                <style>{`
                    .rbc-calendar {
                        font-family: var(--font-inter), sans-serif;
                    }
                    .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
                        background: hsl(var(--background)/0.4);
                        border: 1px solid hsl(var(--border)/0.4) !important;
                        border-radius: 12px;
                        overflow: hidden;
                    }
                    .rbc-header {
                        padding: 12px 0;
                        font-weight: 600;
                        font-size: 0.875rem;
                        color: hsl(var(--muted-foreground));
                        border-bottom: 1px solid hsl(var(--border)/0.4) !important;
                        border-left: none !important;
                        text-transform: capitalize;
                    }
                    .rbc-month-row {
                        border-top: 1px solid hsl(var(--border)/0.4) !important;
                    }
                    .rbc-day-bg + .rbc-day-bg {
                        border-left: 1px solid hsl(var(--border)/0.4) !important;
                    }
                    .rbc-time-header-content {
                        border-left: 1px solid hsl(var(--border)/0.4) !important;
                    }
                    .rbc-time-content {
                        border-top: 1px solid hsl(var(--border)/0.4) !important;
                    }
                    .rbc-timeslot-group {
                        border-bottom: 1px solid hsl(var(--border)/0.2) !important;
                    }
                    .rbc-time-content > * + * > * {
                        border-left: 1px solid hsl(var(--border)/0.4) !important;
                    }
                    .rbc-day-slot .rbc-time-slot {
                        border-top: 1px solid hsl(var(--border)/0.1) !important;
                    }
                    .rbc-off-range-bg {
                        background-color: hsl(var(--muted)/0.1) !important;
                    }
                    .rbc-today {
                        background-color: hsl(var(--primary)/0.03) !important;
                    }
                    .rbc-event {
                        background-color: hsl(var(--primary)) !important;
                        color: hsl(var(--primary-foreground)) !important;
                        border: none !important;
                        border-radius: 6px !important;
                        padding: 4px 8px !important;
                        font-size: 0.75rem !important;
                        font-weight: 500;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
                        transition: all 0.2s ease !important;
                        margin: 2px !important;
                    }
                    .rbc-event:hover {
                        filter: brightness(1.1);
                        transform: translateY(-1px);
                    }
                    .rbc-button-link {
                       color: hsl(var(--foreground));
                       font-weight: 500;
                       padding: 4px;
                    }
                    .rbc-date-cell {
                        padding: 4px 8px;
                        font-size: 0.875rem;
                        font-weight: 500;
                    }
                    .rbc-off-range .rbc-button-link {
                        color: hsl(var(--muted-foreground)/0.5);
                    }
                    .rbc-current-time-indicator {
                        background-color: hsl(var(--primary)) !important;
                        height: 2px !important;
                    }
                    .rbc-current-time-indicator::before {
                        content: '';
                        position: absolute;
                        left: -4px;
                        top: -3px;
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background-color: hsl(var(--primary)) !important;
                    }
                `}</style>
                <div className="h-full w-full">
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        date={currentDate}
                        view={currentView}
                        onNavigate={setCurrentDate}
                        onView={setCurrentView}
                        views={["month", "week", "day"]}
                        style={{ height: "100%", width: "100%" }}
                        selectable
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={handleSelectEvent}
                        components={{
                            toolbar: CustomToolbar
                        }}
                        messages={{
                            next: "►",
                            previous: "◄",
                            today: "Hoje",
                            month: "Mês",
                            week: "Semana",
                            day: "Dia",
                            date: "Data",
                            time: "Hora",
                            event: "Evento",
                            noEventsInRange: "Não há eventos nesta janela.",
                            allDay: "O dia todo",
                            showMore: (total) => `+${total} mais`
                        }}
                    />
                </div>
            </div>

            <EventModal
                open={modalOpen}
                onOpenChange={(open) => {
                    setModalOpen(open)
                    if (!open) setEditingEvent(null)
                }}
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
