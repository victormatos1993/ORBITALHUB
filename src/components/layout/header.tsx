"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
    CircleUser,
    Menu,
    LayoutDashboard,
    Wallet,
    ShoppingBag,
    Users,
    Settings,
    FileText,
    ChevronDown,
    Orbit,
    Bell,
    LogOut,
    User,
    HelpCircle,
} from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { getDueEvents, confirmEventAttendance, cancelEventAndTransaction } from "@/app/actions/agenda"
import { getPaymentAlerts, dismissPaymentAlert } from "@/app/actions/notifications"
import { toast } from "sonner"

import { navigationRoutes as routes } from "@/config/navigation"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/mode-toggle"


function MobileNav({ onClose, filteredRoutes }: { onClose: () => void, filteredRoutes: any[] }) {
    const pathname = usePathname()
    const [openSections, setOpenSections] = useState<string[]>(() =>
        filteredRoutes
            .filter(
                (r) =>
                    r.items &&
                    (r.items.some((i: any) => pathname === i.href) || pathname === r.href)
            )
            .map((r) => r.label)
    )

    const toggleSection = (label: string) => {
        setOpenSections((prev) =>
            prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
        )
    }

    return (
        <div className="flex flex-col h-full bg-sidebar">
            {/* Logo */}
            <div className="flex h-16 items-center border-b border-sidebar-border px-5 shrink-0">
                <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-md">
                        <Orbit className="h-5 w-5 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex items-baseline gap-0">
                        <span className="text-[15px] font-extrabold tracking-tight text-sidebar-foreground">ORBITAL</span>
                        <span className="text-[15px] font-extrabold tracking-tight text-[oklch(0.65_0.17_165)]">HUB</span>
                    </div>
                </Link>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto py-3 px-3">
                {filteredRoutes.map((route) => {
                    const Icon = route.icon

                    if (route.items) {
                        const isActive =
                            route.items.some((i: any) => pathname === i.href) ||
                            pathname === route.href
                        const isOpen = openSections.includes(route.label)

                        return (
                            <div key={route.label} className="mb-0.5">
                                <button
                                    onClick={() => toggleSection(route.label)}
                                    className={cn(
                                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                        isActive
                                            ? "bg-sidebar-accent text-sidebar-primary"
                                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                                    )}
                                >
                                    <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                                    <span className="flex-1 text-left">{route.label}</span>
                                    <ChevronDown
                                        className={cn(
                                            "h-4 w-4 transition-transform duration-200",
                                            isOpen && "rotate-180"
                                        )}
                                    />
                                </button>
                                <div className={cn(
                                    "overflow-hidden transition-all duration-200",
                                    isOpen ? "max-h-40 opacity-100 mt-0.5" : "max-h-0 opacity-0"
                                )}>
                                    <div className="ml-8 flex flex-col gap-0.5 pb-1">
                                        {route.items.map((item: any) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={onClose}
                                                className={cn(
                                                    "rounded-lg px-3 py-2 text-sm transition-all duration-150",
                                                    pathname === item.href
                                                        ? "bg-sidebar-primary/15 text-sidebar-primary font-medium"
                                                        : "text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                                                )}
                                            >
                                                {item.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    const isActive = pathname === route.href
                    return (
                        <Link
                            key={route.label}
                            href={route.href!}
                            onClick={onClose}
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 mb-0.5",
                                isActive
                                    ? "bg-sidebar-accent text-sidebar-primary"
                                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                            )}
                        >
                            <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                            {route.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-sidebar-border p-4 flex items-center justify-between shrink-0">
                <span className="text-xs text-sidebar-foreground/40 font-medium">Tema</span>
                <ModeToggle />
            </div>
        </div>
    )
}

// ─── Tipos ───────────────────────────────────────────────────────────────────
type DueEvent = {
    id: string
    title: string
    startDate: string
    customerName: string | null
    customerId: string | null
    serviceId: string | null
    productId: string | null
    serviceName: string | null
    amount: number
    hasPendingTransaction: boolean
}

type PaymentAlert = {
    id: string
    title: string
    description: string | null
    customerName: string | null
    customerId: string | null
    realEventId: string | null
    serviceId: string | null
    productId: string | null
    expectedAmount: number | null
    createdAt: Date
}

const DISMISSED_KEY = "orbital_dismissed_events"

/** Chave composta: id + startDate — se o evento mudar de data, trata como novo */
function eventKey(id: string, startDate?: string) {
    return startDate ? `${id}__${startDate}` : id
}

function getDismissed(): Set<string> {
    if (typeof window === "undefined") return new Set()
    try { return new Set(JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || "[]")) }
    catch { return new Set() }
}
function addDismissed(id: string, startDate?: string) {
    const s = getDismissed()
    s.add(eventKey(id, startDate))
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...s]))
}
function isDismissed(id: string, startDate?: string): boolean {
    return getDismissed().has(eventKey(id, startDate))
}

// ─── Componente do Sino ───────────────────────────────────────────────────────
function NotificationBell() {
    const [events, setEvents] = useState<DueEvent[]>([])
    const [payAlerts, setPayAlerts] = useState<PaymentAlert[]>([])
    const [loading, setLoading] = useState<Record<string, boolean>>({})
    const [open, setOpen] = useState(false)

    const fetchDue = useCallback(async () => {
        try {
            const [data, alerts] = await Promise.all([
                getDueEvents(),
                getPaymentAlerts(),
            ])
            setEvents(data.filter(e => !isDismissed(e.id, e.startDate)))
            setPayAlerts(alerts)
        } catch { /* silencioso */ }
    }, [])

    useEffect(() => {
        fetchDue()
        const interval = setInterval(fetchDue, 60_000)
        return () => clearInterval(interval)
    }, [fetchDue])

    const handleConfirm = async (e: DueEvent) => {
        setLoading(p => ({ ...p, [e.id]: true }))
        const res = await confirmEventAttendance(e.id)
        if (res.success) {
            toast.success(`✅ ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(e.amount)} faturado!`, {
                description: e.title
            })
            addDismissed(e.id, e.startDate)
            setEvents(prev => prev.filter(ev => ev.id !== e.id))
        } else {
            toast.error("Erro ao confirmar atendimento")
        }
        setLoading(p => ({ ...p, [e.id]: false }))
    }


    const handleCancel = async (e: DueEvent) => {
        setLoading(p => ({ ...p, [`c_${e.id}`]: true }))
        const res = await cancelEventAndTransaction(e.id)
        if (res.success) {
            toast.info("Agendamento cancelado")
            addDismissed(e.id, e.startDate)
            setEvents(prev => prev.filter(ev => ev.id !== e.id))
        } else {
            toast.error("Erro ao cancelar")
        }
        setLoading(p => ({ ...p, [`c_${e.id}`]: false }))
    }

    const handleDismissAlert = async (alert: PaymentAlert) => {
        setLoading(p => ({ ...p, [`pa_${alert.id}`]: true }))
        await dismissPaymentAlert(alert.id)
        setPayAlerts(prev => prev.filter(a => a.id !== alert.id))
        setLoading(p => ({ ...p, [`pa_${alert.id}`]: false }))
    }

    const count = events.length
    const alertCount = payAlerts.length
    const totalCount = count + alertCount
    const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
    const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-accent">
                    <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    {totalCount > 0 ? (
                        <span className={`absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white shadow ${alertCount > 0 ? "bg-red-500" : "bg-amber-500"
                            }`}>
                            {totalCount > 9 ? "9+" : totalCount}
                        </span>
                    ) : (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse-soft" />
                    )}
                    <span className="sr-only">Notificações</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[440px] rounded-2xl p-0 shadow-2xl border overflow-hidden" sideOffset={8}>
                {/* Header do dropdown */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">Notificações</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {alertCount > 0 && (
                            <span className="inline-flex items-center rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400">
                                {alertCount} alerta{alertCount > 1 ? "s" : ""} financeiro{alertCount > 1 ? "s" : ""}
                            </span>
                        )}
                        {count > 0 && (
                            <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                {count} pendente{count > 1 ? "s" : ""}
                            </span>
                        )}
                    </div>
                </div>

                {/* Lista de eventos */}
                <div className="max-h-[480px] overflow-y-auto">
                    {totalCount === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <Bell className="h-5 w-5 opacity-40" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium">Tudo em dia!</p>
                                <p className="text-xs opacity-60 mt-0.5">Nenhum atendimento pendente</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* ── Seção: Alertas de Pagamento Pendente ── */}
                            {payAlerts.length > 0 && (
                                <div className="border-b border-border/50">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-red-500/5">
                                        <span className="text-[11px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400">⚠ Pagamento Pendente</span>
                                    </div>
                                    {payAlerts.map((alert, i) => (
                                        <div key={alert.id} className={cn("p-4 bg-red-500/[0.03]", i < payAlerts.length - 1 && "border-b border-border/30")}>
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/25">
                                                    <span className="text-base">💸</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400">Serviço não faturado</p>
                                                    <p className="text-sm font-semibold text-foreground truncate">{alert.title}</p>
                                                    {alert.customerName && <p className="text-xs text-muted-foreground">{alert.customerName}</p>}
                                                    {alert.expectedAmount && (
                                                        <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-0.5">
                                                            {fmt(alert.expectedAmount)} a regularizar
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1.5 mt-3">
                                                <button
                                                    onClick={() => {
                                                        setOpen(false)
                                                        const params = new URLSearchParams()
                                                        if (alert.customerId) params.set("customerId", alert.customerId)
                                                        if (alert.realEventId) params.set("eventId", alert.realEventId)
                                                        if (alert.serviceId) params.set("serviceId", alert.serviceId)
                                                        if (alert.productId) params.set("productId", alert.productId)
                                                        window.location.href = `/dashboard/vendas/pdv?${params.toString()}`
                                                    }}
                                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                                                >
                                                    🛒 Faturar no PDV
                                                </button>
                                                <button
                                                    onClick={() => handleDismissAlert(alert)}
                                                    disabled={loading[`pa_${alert.id}`]}
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                                                    title="Dispensar alerta"
                                                >
                                                    {loading[`pa_${alert.id}`]
                                                        ? <span className="h-3 w-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                                                        : "✕"
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ── Seção: Eventos normais no horário ── */}
                            {count > 0 && events.map((ev, i) => (
                                <div key={ev.id} className={cn("p-4", i < count - 1 && "border-b border-border/50")}>
                                    {/* Info do evento */}
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/25">
                                            <Bell className="h-3.5 w-3.5 text-amber-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                                Atendimento no horário
                                            </p>
                                            <p className="text-sm font-semibold text-foreground truncate">{ev.title}</p>
                                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                                {ev.customerName && (
                                                    <span className="text-xs text-muted-foreground">{ev.customerName}</span>
                                                )}
                                                <span className="text-xs text-muted-foreground">{fmtTime(ev.startDate)}</span>
                                                {ev.serviceName && (
                                                    <span className="text-xs text-muted-foreground">{ev.serviceName}</span>
                                                )}
                                            </div>
                                            {ev.amount > 0 && (
                                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                                    {fmt(ev.amount)} a receber
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Ações */}
                                    <div className="flex gap-1.5 mt-3">

                                        {/* Abrir PDV */}
                                        <button
                                            onClick={() => {
                                                setOpen(false)
                                                const params = new URLSearchParams()
                                                if (ev.customerId) params.set("customerId", ev.customerId)
                                                if (ev.serviceId) params.set("serviceId", ev.serviceId)
                                                if (ev.productId) params.set("productId", ev.productId)
                                                params.set("eventId", ev.id)
                                                window.location.href = `/dashboard/vendas/pdv?${params.toString()}`
                                            }}
                                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                                        >
                                            🛒 Abrir PDV
                                        </button>

                                        {/* Abrir Agenda */}
                                        <button
                                            onClick={() => { setOpen(false); window.location.href = "/dashboard/agenda" }}
                                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                        >
                                            📅 Agenda
                                        </button>

                                        {/* Cancelar agendamento */}
                                        <button
                                            onClick={() => handleCancel(ev)}
                                            disabled={loading[`c_${ev.id}`]}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                            title="Cancelar agendamento"
                                        >
                                            {loading[`c_${ev.id}`]
                                                ? <span className="h-3 w-3 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin" />
                                                : "✕"
                                            }
                                        </button>

                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {/* Rodapé */}
                <div className="border-t px-4 py-2 bg-muted/20">
                    <button
                        onClick={() => { setOpen(false); window.location.href = "/dashboard/agenda" }}
                        className="w-full text-xs text-center text-primary hover:underline font-medium py-1"
                    >
                        Ver agenda completa →
                    </button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export interface HeaderProps {
    userRole?: string
    userName?: string
    userEmail?: string
}


export function Header({
    userRole: serverRole,
    userName: serverName,
    userEmail: serverEmail
}: HeaderProps) {
    const [open, setOpen] = useState(false)
    const { data: session } = useSession()

    // Prioritize server-provided data for immediate render
    const userRole = serverRole || (session?.user as any)?.role
    const userName = serverName || session?.user?.name
    const userEmail = serverEmail || session?.user?.email

    const filteredRoutes = routes.filter(route => {
        if (userRole === "ORACULO") return true
        if (!route.roles) return true
        return route.roles.includes(userRole!)
    })

    return (
        <header className="flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 lg:px-6 sticky top-0 z-20">
            {/* Mobile menu */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 md:hidden rounded-xl hover:bg-accent"
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Abrir menu de navegação</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[280px] border-r-0">
                    <MobileNav filteredRoutes={filteredRoutes} onClose={() => setOpen(false)} />
                </SheetContent>
            </Sheet>

            {/* Brand Logo */}
            <div className="flex items-center gap-3">
                {/* Show orbital icon only on mobile (sidebar hidden) */}
                <div className="flex md:hidden h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-md">
                    <Orbit className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
                </div>
                <Link href="/dashboard" className="flex items-baseline gap-0 select-none">
                    <span className="text-xl font-extrabold tracking-tight text-foreground">ORBITAL</span>
                    <span className="text-xl font-extrabold tracking-tight text-[oklch(0.65_0.17_165)]">HUB</span>
                </Link>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right side actions */}
            <div className="flex items-center gap-2">
                <NotificationBell />

                {/* User menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-accent">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <User className="h-4 w-4" strokeWidth={2} />
                            </div>
                            <span className="sr-only">Abrir menu do usuário</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
                        <DropdownMenuLabel className="px-3 py-2">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-semibold">{userName || "Minha Conta"}</span>
                                <span className="text-xs text-muted-foreground font-normal">{userEmail || "Carregando..."}</span>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {userRole === "ORACULO" && (
                            <Link href="/oraculo">
                                <DropdownMenuItem className="rounded-lg px-3 py-2 cursor-pointer text-primary bg-primary/5 focus:bg-primary/10">
                                    <Orbit className="mr-2 h-4 w-4" />
                                    Oráculo
                                </DropdownMenuItem>
                            </Link>
                        )}
                        <Link href="/dashboard/settings">
                            <DropdownMenuItem className="rounded-lg px-3 py-2 cursor-pointer">
                                <User className="mr-2 h-4 w-4" />
                                Perfil
                            </DropdownMenuItem>
                        </Link>
                        <Link href="/dashboard/settings">
                            <DropdownMenuItem className="rounded-lg px-3 py-2 cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" />
                                Configurações
                            </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem className="rounded-lg px-3 py-2 cursor-pointer">
                            <HelpCircle className="mr-2 h-4 w-4" />
                            Suporte
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={async () => {
                                await signOut({ callbackUrl: '/' })
                            }}
                            className="rounded-lg px-3 py-2 cursor-pointer text-destructive focus:text-destructive"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sair
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
