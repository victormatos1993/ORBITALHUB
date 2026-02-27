"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format, isToday, isYesterday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Bell, CheckCircle2, XCircle, ShoppingCart, Clock, TrendingUp, ChevronDown, Trash2, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { deleteNotification } from "@/app/actions/notifications"
import { toast } from "sonner"

const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

type Notification = {
    id: string
    type: string
    title: string
    description: string | null
    customerName: string | null
    expectedAmount: number | null
    actionAmount: number | null
    status: string
    actionAt: Date | null
    dueAt: Date
    createdAt: Date
    eventId: string | null
    purchaseInvoiceId: string | null
}

function getNotificationHref(n: Notification): string | null {
    switch (n.type) {
        case "AGENDA_EVENT":
            return "/dashboard/agenda"
        case "PAYMENT_ALERT":
            return "/dashboard/vendas/pdv"
        case "PRICING_NEEDED":
            return "/dashboard/cadastros/produtos"
        case "PAYMENT_REVIEW":
            return "/dashboard/financeiro/contas-pagar"
        default:
            return null
    }
}

const NOTIFICATION_ACTION_LABEL: Record<string, string> = {
    AGENDA_EVENT: "Ver agenda",
    PAYMENT_ALERT: "Abrir PDV",
    PRICING_NEEDED: "Ver produtos",
    PAYMENT_REVIEW: "Ver contas",
}

type DailySummary = {
    date: string
    total: number
    pending: number
    acted: number
    confirmed: number
    actedPDV: number
    cancelled: number
    dismissed: number
    actionRate: number
    totalExpected: number
    totalBilled: number
    highlights: string[]
} | null

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; badge: string }> = {
    PENDING: { label: "Pendente", color: "text-amber-600 dark:text-amber-400", icon: <Clock className="h-4 w-4" />, badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
    CONFIRMED: { label: "Concluído", color: "text-emerald-600 dark:text-emerald-400", icon: <CheckCircle2 className="h-4 w-4" />, badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
    ACTED_PDV: { label: "Venda PDV", color: "text-blue-600 dark:text-blue-400", icon: <ShoppingCart className="h-4 w-4" />, badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
    CANCELLED: { label: "Cancelado", color: "text-red-600 dark:text-red-400", icon: <XCircle className="h-4 w-4" />, badge: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30" },
    DISMISSED: { label: "Dispensado", color: "text-slate-500", icon: <ChevronDown className="h-4 w-4" />, badge: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30" },
    PAYMENT_ALERT: { label: "Pagar no PDV", color: "text-red-600 dark:text-red-400", icon: <span className="text-base">💸</span>, badge: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30" },
}

function formatDueDate(date: Date) {
    const d = new Date(date)
    if (isToday(d)) return `Hoje, ${format(d, "HH:mm")}`
    if (isYesterday(d)) return `Ontem, ${format(d, "HH:mm")}`
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

const FILTER_OPTIONS = [
    { value: "ALL", label: "Todas" },
    { value: "PENDING", label: "Pendentes" },
    { value: "CONFIRMED", label: "Concluídas" },
    { value: "ACTED_PDV", label: "PDV" },
    { value: "CANCELLED", label: "Canceladas" },
    { value: "DISMISSED", label: "Dispensadas" },
]

export default function NotificationsClient({
    notifications: initialNotifications,
    todaySummary,
}: {
    notifications: Notification[]
    todaySummary: DailySummary
}) {
    const router = useRouter()
    const [filter, setFilter] = useState<string>("ALL")
    const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [, startTransition] = useTransition()

    const filtered = filter === "ALL"
        ? notifications
        : notifications.filter(n => n.status === filter)

    const counts = {
        ALL: notifications.length,
        PENDING: notifications.filter(n => n.status === "PENDING").length,
        CONFIRMED: notifications.filter(n => n.status === "CONFIRMED").length,
        ACTED_PDV: notifications.filter(n => n.status === "ACTED_PDV").length,
        CANCELLED: notifications.filter(n => n.status === "CANCELLED").length,
        DISMISSED: notifications.filter(n => n.status === "DISMISSED").length,
    }

    async function handleDelete(id: string) {
        setDeletingId(id)
        const res = await deleteNotification(id)
        if (res.success) {
            setNotifications(prev => prev.filter(n => n.id !== id))
            toast.success("Notificação excluída")
        } else {
            toast.error("Erro ao excluir notificação")
        }
        setDeletingId(null)
    }

    return (
        <div className="flex flex-col gap-6">
            {/* ─── Header ─── */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">Central de Notificações</h1>
                    <p className="text-sm text-muted-foreground">
                        Histórico de atendimentos, ações e resumo inteligente do dia
                    </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
                    <Bell className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">{notifications.length} registros</span>
                </div>
            </div>

            {/* ─── Resumo Inteligente do Dia ─── */}
            {todaySummary && (
                <div className="rounded-2xl border bg-card overflow-hidden">
                    {/* Header summary */}
                    <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                                <TrendingUp className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">Resumo de Hoje</p>
                                <p className="text-xs text-muted-foreground">{todaySummary.date}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground">Taxa de atuação</p>
                                <p className="text-xl font-bold text-primary">{todaySummary.actionRate}%</p>
                            </div>
                        </div>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0">
                        {[
                            { label: "Total", value: todaySummary.total, color: "text-foreground" },
                            { label: "Atuados", value: todaySummary.acted, color: "text-emerald-600 dark:text-emerald-400" },
                            { label: "Pendentes", value: todaySummary.pending, color: todaySummary.pending > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground" },
                            { label: "Cancelados", value: todaySummary.cancelled, color: todaySummary.cancelled > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground" },
                        ].map(kpi => (
                            <div key={kpi.label} className="flex flex-col items-center py-4 gap-0.5">
                                <span className={cn("text-2xl font-bold", kpi.color)}>{kpi.value}</span>
                                <span className="text-xs text-muted-foreground">{kpi.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Financeiro */}
                    {(todaySummary.totalExpected > 0 || todaySummary.totalBilled > 0) && (
                        <div className="grid grid-cols-2 gap-4 px-5 py-3 border-t bg-muted/10">
                            <div>
                                <p className="text-xs text-muted-foreground">Valor previsto</p>
                                <p className="text-base font-bold">{fmt(todaySummary.totalExpected)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Valor concluído</p>
                                <p className={cn("text-base font-bold", todaySummary.totalBilled >= todaySummary.totalExpected ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                                    {fmt(todaySummary.totalBilled)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Highlights */}
                    <div className="flex flex-col gap-2 px-5 py-3 border-t">
                        {todaySummary.highlights.map((h, i) => (
                            <p key={i} className="text-sm text-muted-foreground">{h}</p>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Filtros ─── */}
            <div className="flex gap-2 flex-wrap">
                {FILTER_OPTIONS.map(opt => {
                    const count = counts[opt.value as keyof typeof counts] ?? 0
                    const isActive = filter === opt.value
                    return (
                        <button
                            key={opt.value}
                            onClick={() => setFilter(opt.value)}
                            className={cn(
                                "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all",
                                isActive
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                            )}
                        >
                            {opt.label}
                            <span className={cn(
                                "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
                                isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                            )}>
                                {count}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* ─── Lista de Notificações ─── */}
            <div className="flex flex-col gap-3">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border bg-card">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                            <Bell className="h-7 w-7 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Nenhuma notificação encontrada</p>
                    </div>
                ) : (
                    filtered.map(n => {
                        const cfg = STATUS_CONFIG[n.status] ?? STATUS_CONFIG["PENDING"]
                        const billed = n.status === "CONFIRMED" || n.status === "ACTED_PDV"
                        const isDeleting = deletingId === n.id

                        const href = getNotificationHref(n)
                        const actionLabel = NOTIFICATION_ACTION_LABEL[n.type] ?? null

                        return (
                            <div
                                key={n.id}
                                onClick={() => href && router.push(href)}
                                className={cn(
                                    "flex items-start gap-4 rounded-2xl border bg-card px-5 py-4 transition-all group",
                                    href && "cursor-pointer hover:shadow-md hover:border-primary/30",
                                    n.type === "PAYMENT_ALERT" && n.status === "PENDING" && "border-red-500/40 bg-red-500/5",
                                    n.type !== "PAYMENT_ALERT" && n.status === "PENDING" && "border-amber-500/20 bg-amber-500/3",
                                    n.status === "CONFIRMED" && "border-emerald-500/20",
                                    n.status === "ACTED_PDV" && "border-blue-500/20",
                                    n.status === "CANCELLED" && "border-red-500/20 opacity-75",
                                    n.status === "DISMISSED" && "opacity-60",
                                    isDeleting && "opacity-40 pointer-events-none",
                                )}
                            >
                                {/* Ícone de status */}
                                <div className={cn(
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                                    n.type === "PAYMENT_ALERT" && n.status === "PENDING" && "bg-red-500/15 text-red-600 dark:text-red-400",
                                    n.type !== "PAYMENT_ALERT" && n.status === "PENDING" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                                    n.status === "CONFIRMED" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                                    n.status === "ACTED_PDV" && "bg-blue-500/15 text-blue-600 dark:text-blue-400",
                                    n.status === "CANCELLED" && "bg-red-500/15 text-red-600 dark:text-red-400",
                                    n.status === "DISMISSED" && "bg-muted text-muted-foreground",
                                )}>
                                    {n.type === "PAYMENT_ALERT" ? <span className="text-xl">💸</span> : cfg.icon}
                                </div>

                                {/* Conteúdo */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold">{n.title}</p>
                                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", cfg.badge)}>
                                            {cfg.label}
                                        </span>
                                    </div>
                                    {n.customerName && (
                                        <p className="text-xs text-muted-foreground mt-0.5">👤 {n.customerName}</p>
                                    )}
                                    {n.description && (() => {
                                        if (n.type === "PAYMENT_ALERT" && (n.status === "ACTED_PDV" || n.status === "DISMISSED")) {
                                            return (
                                                <p className="text-xs text-muted-foreground">
                                                    {n.status === "ACTED_PDV"
                                                        ? "Serviço concluído pelo PDV."
                                                        : "Alerta dispensado manualmente."}
                                                </p>
                                            )
                                        }
                                        return <p className="text-xs text-muted-foreground">{n.description}</p>
                                    })()}

                                    {/* Valores */}
                                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                                        {n.expectedAmount != null && n.expectedAmount > 0 && (
                                            <span className={cn("text-xs",
                                                n.type === "PAYMENT_ALERT" && n.status === "PENDING"
                                                    ? "text-red-600 dark:text-red-400 font-bold"
                                                    : "text-muted-foreground"
                                            )}>
                                                {n.type === "PAYMENT_ALERT" && n.status === "PENDING" ? "A regularizar: " : "Previsto: "}
                                                <strong>{fmt(n.expectedAmount)}</strong>
                                            </span>
                                        )}
                                        {billed && n.actionAmount != null && n.actionAmount > 0 && (
                                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                                ✓ Concluído: {fmt(n.actionAmount)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Datas + Ações */}
                                <div className="text-right shrink-0 flex flex-col items-end gap-2">
                                    <p className="text-xs text-muted-foreground">
                                        Venceu: {formatDueDate(n.dueAt)}
                                    </p>
                                    {n.actionAt && (
                                        <p className="text-xs font-medium text-primary">
                                            Atuado: {formatDueDate(n.actionAt)}
                                        </p>
                                    )}
                                    {/* Link de ação + Excluir */}
                                    <div className="flex items-center gap-1.5">
                                        {href && actionLabel && (
                                            <span className="hidden group-hover:inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary">
                                                {actionLabel}
                                                <ChevronRight className="h-3 w-3" />
                                            </span>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(n.id) }}
                                            disabled={isDeleting}
                                            title="Excluir notificação"
                                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-400 hover:border-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
                                        >
                                            {isDeleting
                                                ? <span className="h-3 w-3 border-2 border-red-300 border-t-red-500 rounded-full animate-spin inline-block" />
                                                : <Trash2 className="h-3.5 w-3.5" />
                                            }
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
