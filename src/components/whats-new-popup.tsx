"use client"

import { useState, useEffect } from "react"
import {
    Sparkles, X, CalendarDays, GripVertical, AlertTriangle,
    LayoutDashboard, Package, Clock, Receipt, ChevronRight, Wallet,
} from "lucide-react"

const RELEASE_VERSION = "v2.5.0"
const STORAGE_KEY = `orbital-hub-whats-new-${RELEASE_VERSION}`

const features = [
    {
        icon: LayoutDashboard,
        title: "Dashboard Executivo 360°",
        description: "Visão completa do negócio: KPIs financeiros, agenda do dia, alertas de estoque, orçamentos em aberto e ações rápidas — tudo em uma tela.",
        color: "text-blue-500",
        bg: "bg-blue-500/10",
    },
    {
        icon: Receipt,
        title: "Regime Caixa vs. Competência",
        description: "O módulo financeiro agora distingue entre regime de caixa (efetivamente pago) e competência (lançado). Contas financeiras, parcelas escalonadas e plano de contas hierárquico.",
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
    },
    {
        icon: Wallet,
        title: "Contas a Pagar e Receber",
        description: "Módulos dedicados para gestão de contas a pagar e receber com filtros por vencimento, status e categoria. Workflow de baixa de pagamento integrado.",
        color: "text-teal-500",
        bg: "bg-teal-500/10",
    },
    {
        icon: CalendarDays,
        title: "Agenda Inteligente",
        description: "Ações rápidas na sidebar (concluir, PDV, cancelar), eventos recorrentes (semanal, quinzenal, mensal) e filtro por status clicável na legenda.",
        color: "text-indigo-500",
        bg: "bg-indigo-500/10",
    },
    {
        icon: GripVertical,
        title: "Drag & Drop na Agenda",
        description: "Arraste eventos para reagendar nas views Semana e Dia. Redimensione arrastando a borda para ajustar a duração. Salvamento automático.",
        color: "text-violet-500",
        bg: "bg-violet-500/10",
    },
    {
        icon: AlertTriangle,
        title: "Indicador de Conflitos",
        description: "Eventos sobrepostos agora são destacados com borda vermelha pulsante e ícone de alerta, tanto no calendário quanto na sidebar.",
        color: "text-red-500",
        bg: "bg-red-500/10",
    },
    {
        icon: Clock,
        title: "Seletor de Horário Remodelado",
        description: "Data, hora e minuto agora são campos separados e intuitivos. Alterar o início auto-ajusta o término mantendo a duração.",
        color: "text-amber-500",
        bg: "bg-amber-500/10",
    },
    {
        icon: Package,
        title: "Monitoramento de Estoque",
        description: "O dashboard agora mostra produtos com estoque baixo (≤5 unidades) com barras visuais de nível e alertas quando zera.",
        color: "text-green-500",
        bg: "bg-green-500/10",
    },
    {
        icon: Receipt,
        title: "Cupom Térmico para Impressão",
        description: "Nova coluna de cupom simplificado na página de venda, formatado para impressoras térmicas com fonte monoespaçada.",
        color: "text-cyan-500",
        bg: "bg-cyan-500/10",
    },
]

export function WhatsNewPopup() {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const dismissed = localStorage.getItem(STORAGE_KEY)
        if (!dismissed) {
            // Small delay so it doesn't flash during page load
            const timer = setTimeout(() => setOpen(true), 600)
            return () => clearTimeout(timer)
        }
    }, [])

    const handleClose = () => {
        setOpen(false)
        localStorage.setItem(STORAGE_KEY, "true")
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300" onClick={handleClose} />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                {/* Header with gradient */}
                <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Novidades do Orbital Hub</h2>
                            <p className="text-xs text-muted-foreground">{RELEASE_VERSION} — Fevereiro 2026</p>
                        </div>
                    </div>
                </div>

                {/* Features list */}
                <div className="px-6 py-4 max-h-[400px] overflow-y-auto space-y-3">
                    {features.map((f, i) => (
                        <div key={i} className="flex gap-3 items-start p-3 rounded-xl hover:bg-muted/40 transition-colors">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${f.bg}`}>
                                <f.icon className={`h-4 w-4 ${f.color}`} strokeWidth={2} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold">{f.title}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{f.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border/40 bg-muted/20">
                    <button
                        onClick={handleClose}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        Entendido, vamos lá! <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
