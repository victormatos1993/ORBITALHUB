"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarDays, Pencil, Trash2, MapPin, Printer } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { deleteAgendaEvent, updateAgendaEvent } from "@/app/actions/agenda"
import { toast } from "sonner"
import { EventModal } from "@/components/agenda/event-modal"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface AgendaEvent {
    id: string
    title: string
    type: string
    startDate: Date | string
    endDate: Date | string
    location?: string | null
    isLocal?: boolean
    customerId?: string | null
    productId?: string | null
    serviceId?: string | null
    quoteId?: string | null
}

interface CustomerEventsListProps {
    events: AgendaEvent[]
    customerDetails: {
        id?: string | null
        name: string
        phone?: string | null
        email?: string | null
    }
    products?: any[]
    services?: any[]
    quotes?: any[]
    customers?: any[]
}

export function CustomerEventsList({
    events,
    customerDetails,
    products = [],
    services = [],
    quotes = [],
    customers = []
}: CustomerEventsListProps) {
    const [isPending, startTransition] = useTransition()
    const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null)
    const [modalOpen, setModalOpen] = useState(false)

    const handlePrint = (event: AgendaEvent) => {
        window.open(`/dashboard/agenda/${event.id}/os`, "_blank")
    }

    const handleEdit = (event: AgendaEvent) => {
        setEditingEvent(event)
        setModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        startTransition(async () => {
            const result = await deleteAgendaEvent(id)
            if (result.success) {
                toast.success("Agendamento excluído com sucesso")
            } else {
                toast.error("Erro ao excluir agendamento")
            }
        })
    }

    const handleSaveEdit = async (data: any) => {
        if (!editingEvent) return

        startTransition(async () => {
            const result = await updateAgendaEvent(editingEvent.id, {
                title: data.title,
                type: data.tipo || "Sem Categoria",
                startDate: data.start,
                endDate: data.end,
                isLocal: data.isLocal,
                location: data.local,
                customerName: data.cliente,
                customerId: data.customerId,
                productId: data.productId,
                serviceId: data.serviceId,
                quoteId: data.quoteId,
            })

            if (result.success) {
                toast.success("Agendamento atualizado com sucesso")
                setModalOpen(false)
                setEditingEvent(null)
            } else {
                toast.error("Erro ao atualizar agendamento")
            }
        })
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Eventos da Agenda
                </CardTitle>
                <Button variant="outline" size="sm" asChild className="h-8">
                    <Link href={`/dashboard/agenda?new=true&customerName=${encodeURIComponent(customerDetails.name)}&customerPhone=${encodeURIComponent(customerDetails.phone || "")}&customerEmail=${encodeURIComponent(customerDetails.email || "")}`}>
                        Novo Agendamento
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                {events.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">Nenhum evento agendado.</div>
                ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {events.map((event) => (
                            <div key={event.id} className="group relative bg-muted/30 hover:bg-muted/50 transition-colors p-3 rounded-lg border">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm truncate pr-20">{event.title}</div>
                                        <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-medium">{event.type}</div>
                                        <div className="flex items-center gap-4 mt-2">
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600">
                                                <CalendarDays className="h-3 w-3" />
                                                {format(new Date(event.startDate), "dd/MM/yyyy HH:mm")}
                                            </div>
                                            {event.location && (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                                                    <MapPin className="h-3 w-3" />
                                                    {event.location}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                            onClick={() => handlePrint(event)}
                                            title="Gerar Ordem de Serviço PDF"
                                        >
                                            <Printer className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                            onClick={() => handleEdit(event)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta ação não pode ser desfeita. Isso excluirá permanentemente o agendamento
                                                        e quaisquer transações vinculadas a ele.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDelete(event.id)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Excluir
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            {editingEvent && (
                <EventModal
                    open={modalOpen}
                    onOpenChange={(open) => {
                        setModalOpen(open)
                        if (!open) setEditingEvent(null)
                    }}
                    initialStart={new Date(editingEvent.startDate)}
                    initialEnd={new Date(editingEvent.endDate)}
                    initialTitle={editingEvent.title}
                    initialType={editingEvent.type}
                    initialLocation={editingEvent.location || ""}
                    initialIsLocal={editingEvent.isLocal}
                    initialProductId={editingEvent.productId || ""}
                    initialServiceId={editingEvent.serviceId || ""}
                    initialQuoteId={editingEvent.quoteId || ""}
                    initialCustomerId={editingEvent.customerId || ""}
                    initialCustomerName={customerDetails.name}
                    initialCustomerEmail={customerDetails.email || ""}
                    initialCustomerPhone={customerDetails.phone || ""}
                    products={products}
                    services={services}
                    quotes={quotes}
                    customers={customers}
                    eventTypes={Array.from(new Set(events.map((e: any) => e.type)))}
                    onSave={handleSaveEdit}
                />
            )}
        </Card>
    )
}
