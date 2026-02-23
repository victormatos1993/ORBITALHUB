"use client"

import { useEffect, useState, useCallback } from "react"
import { getDueEvents, confirmEventAttendance, cancelEventAndTransaction } from "@/app/actions/agenda"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
    Bell, CheckCircle2, X, Clock, User, Banknote, CalendarClock, ChevronRight, XCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DueEvent = {
    id: string
    title: string
    startDate: string
    customerName: string | null
    customerPhone: string | null
    serviceName: string | null
    productName: string | null
    transactionId: string | null
    amount: number
}

const DISMISSED_KEY = "orbital_dismissed_events"

function getDismissed(): Set<string> {
    if (typeof window === "undefined") return new Set()
    try {
        const raw = sessionStorage.getItem(DISMISSED_KEY)
        return new Set(raw ? JSON.parse(raw) : [])
    } catch { return new Set() }
}

function addDismissed(id: string) {
    const set = getDismissed()
    set.add(id)
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]))
}

function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const notes = [523.25, 659.25, 783.99] // Dó, Mi, Sol
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.frequency.value = freq
            osc.type = "sine"
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18)
            gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.18 + 0.05)
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.18 + 0.25)
            osc.start(ctx.currentTime + i * 0.18)
            osc.stop(ctx.currentTime + i * 0.18 + 0.3)
        })
    } catch { /* silencioso */ }
}

export function EventAlertNotification() {
    const [dueEvents, setDueEvents] = useState<DueEvent[]>([])
    const [loading, setLoading] = useState<Record<string, boolean>>({})
    const router = useRouter()

    const fetchDue = useCallback(async () => {
        try {
            const events = await getDueEvents()
            const dismissed = getDismissed()
            const fresh = events.filter(e => !dismissed.has(e.id))

            setDueEvents(prev => {
                if (fresh.length > prev.length) {
                    playNotificationSound()
                }
                return fresh
            })
        } catch { /* silencioso */ }
    }, [])

    // Polling a cada 60 segundos + imediato ao montar
    useEffect(() => {
        fetchDue()
        const interval = setInterval(fetchDue, 60_000)
        return () => clearInterval(interval)
    }, [fetchDue])

    const handleConfirm = async (event: DueEvent) => {
        setLoading(prev => ({ ...prev, [event.id]: true }))
        try {
            const res = await confirmEventAttendance(event.id)
            if (res.success) {
                toast.success(
                    `✅ ${formatCurrency(event.amount)} faturado com sucesso!`,
                    { description: `${event.title}${event.customerName ? ` — ${event.customerName}` : ""}`, duration: 5000 }
                )
                setDueEvents(prev => prev.filter(e => e.id !== event.id))
                addDismissed(event.id)
                router.refresh()
            } else {
                toast.error("Erro ao confirmar atendimento")
            }
        } finally {
            setLoading(prev => ({ ...prev, [event.id]: false }))
        }
    }

    const handleCancel = async (event: DueEvent) => {
        setLoading(prev => ({ ...prev, [`cancel_${event.id}`]: true }))
        try {
            const res = await cancelEventAndTransaction(event.id)
            if (res.success) {
                toast.info("Agendamento cancelado e removido das contas a receber.")
                setDueEvents(prev => prev.filter(e => e.id !== event.id))
                addDismissed(event.id)
                router.refresh()
            } else {
                toast.error("Erro ao cancelar agendamento")
            }
        } finally {
            setLoading(prev => ({ ...prev, [`cancel_${event.id}`]: false }))
        }
    }

    const handleDismiss = (id: string) => {
        addDismissed(id)
        setDueEvents(prev => prev.filter(e => e.id !== id))
    }

    const formatTime = (iso: string) =>
        new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

    if (!dueEvents.length) return null

    return (
        <div className={cn(
            "fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-[360px] max-w-[calc(100vw-2rem)]",
            "animate-in slide-in-from-bottom-4 fade-in duration-500"
        )}>
            {/* Contador quando há múltiplos */}
            {dueEvents.length > 1 && (
                <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <Bell className="h-4 w-4 animate-bounce" />
                        <span className="text-sm font-semibold">
                            {dueEvents.length} atendimentos pendentes
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            dueEvents.forEach(e => addDismissed(e.id))
                            setDueEvents([])
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                    >
                        Dispensar todos
                    </button>
                </div>
            )}

            {dueEvents.map((event) => (
                <div
                    key={event.id}
                    className={cn(
                        "relative rounded-2xl border bg-card shadow-2xl shadow-black/20",
                        "border-amber-500/40 bg-gradient-to-br from-card to-amber-500/5",
                        "animate-in slide-in-from-right-4 fade-in duration-300"
                    )}
                >
                    {/* Barra superior colorida */}
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-amber-400 to-orange-500" />

                    {/* Botão dispensar */}
                    <button
                        onClick={() => handleDismiss(event.id)}
                        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/50"
                        title="Lembrar mais tarde"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>

                    <div className="p-4 pt-5">
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30">
                                <CalendarClock className="h-4.5 w-4.5 text-amber-500" strokeWidth={2.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                    <Bell className="h-3 w-3" /> Atendimento no Horário
                                </span>
                                <p className="font-bold text-sm text-foreground truncate mt-0.5 pr-6">
                                    {event.title}
                                </p>
                            </div>
                        </div>

                        {/* Detalhes */}
                        <div className="grid gap-1.5 mb-4 ml-12">
                            {event.customerName && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <User className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{event.customerName}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                <span>Horário: <strong className="text-foreground">{formatTime(event.startDate)}</strong></span>
                            </div>
                            {event.serviceName && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{event.serviceName}</span>
                                </div>
                            )}
                            {event.amount > 0 && (
                                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                    <Banknote className="h-3.5 w-3.5 shrink-0" />
                                    <span>{formatCurrency(event.amount)} a receber</span>
                                </div>
                            )}
                        </div>

                        {/* Ações */}
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                className="flex-1 h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 font-semibold rounded-xl"
                                onClick={() => handleConfirm(event)}
                                disabled={loading[event.id]}
                            >
                                {loading[event.id]
                                    ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <CheckCircle2 className="h-4 w-4" />
                                }
                                Confirmar e Faturar
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-9 gap-1 border-red-500/30 text-red-600 hover:bg-red-500/10 hover:border-red-500/50 rounded-xl px-3"
                                onClick={() => handleCancel(event)}
                                disabled={loading[`cancel_${event.id}`]}
                                title="Cancelar agendamento"
                            >
                                {loading[`cancel_${event.id}`]
                                    ? <div className="h-3.5 w-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                    : <XCircle className="h-3.5 w-3.5" />
                                }
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
