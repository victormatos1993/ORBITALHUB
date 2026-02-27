"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    Package, CheckCircle, Clock, ArrowRight, Truck,
    Plus, Loader2, PackageOpen, Tag, AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    getShipmentOrders,
    getSalesWithoutShipment,
    createShipmentFromSale,
    createShipmentBatch,
    updateShipmentStatus,
} from "@/app/actions/shipment"

// ─── Tipos ─────────────────────────────────────────────────────────
interface Shipment {
    id: string
    saleId: string
    status: string
    statusLabel: string
    customerName: string
    saleTotal: number
    saleDate: string
    itemCount: number
    itemsSummary: string
    separatedAt: string | null
    packedAt: string | null
    labeledAt: string | null
    createdAt: string
}

interface PendingSale {
    id: string
    date: string
    totalAmount: number
    customerName: string
    itemCount: number
    itemsSummary: string
}

const PREP_STATUSES = ["PENDENTE", "SEPARANDO", "EMBALADO", "ETIQUETADO"] as const

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; next?: string; nextLabel?: string }> = {
    PENDENTE: { label: "Pendente", color: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30", icon: Clock, next: "SEPARANDO", nextLabel: "Iniciar Separação" },
    SEPARANDO: { label: "Separando", color: "bg-blue-500/20 text-blue-600 border-blue-500/30", icon: PackageOpen, next: "EMBALADO", nextLabel: "Marcar Embalado" },
    EMBALADO: { label: "Embalado", color: "bg-purple-500/20 text-purple-600 border-purple-500/30", icon: Package, next: "ETIQUETADO", nextLabel: "Marcar Etiquetado" },
    ETIQUETADO: { label: "Etiquetado", color: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30", icon: Tag, next: "POSTADO", nextLabel: "Marcar Postado" },
}

const formatBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

// ─── Component ─────────────────────────────────────────────────────
export function PedidosClient() {
    const router = useRouter()
    const [shipments, setShipments] = useState<Shipment[]>([])
    const [pendingSales, setPendingSales] = useState<PendingSale[]>([])
    const [showNewOrders, setShowNewOrders] = useState(false)
    const [activeTab, setActiveTab] = useState<string>("all")
    const [isPending, startTransition] = useTransition()
    const [loadingId, setLoadingId] = useState<string | null>(null)

    const load = useCallback(async () => {
        const [orders, sales] = await Promise.all([
            getShipmentOrders(),
            getSalesWithoutShipment(),
        ])
        // Only show preparation-phase shipments
        setShipments(orders.filter((o: any) => PREP_STATUSES.includes(o.status)) as Shipment[])
        setPendingSales(sales as PendingSale[])
    }, [])

    useEffect(() => { load() }, [load])

    const handleCreateShipment = async (saleId: string) => {
        setLoadingId(saleId)
        const result = await createShipmentFromSale(saleId)
        if (result.error) toast.error(result.error)
        else { toast.success("Envio criado!"); load() }
        setLoadingId(null)
    }

    const handleCreateAll = async () => {
        if (!pendingSales.length) return
        startTransition(async () => {
            const result = await createShipmentBatch(pendingSales.map(s => s.id))
            if (result.error) toast.error(result.error)
            else { toast.success(`${(result as any).count} envios criados!`); load() }
        })
    }

    const handleAdvanceStatus = async (id: string, newStatus: string) => {
        setLoadingId(id)
        const result = await updateShipmentStatus(id, newStatus)
        if (result.error) toast.error(result.error)
        else { toast.success("Status atualizado!"); load() }
        setLoadingId(null)
    }

    const filtered = activeTab === "all"
        ? shipments
        : shipments.filter(s => s.status === activeTab)

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Package className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">Pedidos em Preparação</p>
                        <p className="text-2xl font-bold">{shipments.length}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {pendingSales.length > 0 && (
                            <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 gap-1">
                                <AlertTriangle className="h-3 w-3" /> {pendingSales.length} vendas sem envio
                            </Badge>
                        )}
                        <Button
                            onClick={() => setShowNewOrders(!showNewOrders)}
                            variant={showNewOrders ? "outline" : "default"}
                            className="gap-1.5"
                        >
                            <Plus className="h-4 w-4" />
                            {showNewOrders ? "Fechar" : "Novos Envios"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Vendas sem envio */}
            {showNewOrders && (
                <div className="rounded-xl border bg-card overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-5 py-3 border-b flex items-center justify-between">
                        <h3 className="font-semibold">Vendas aguardando envio</h3>
                        {pendingSales.length > 0 && (
                            <Button size="sm" onClick={handleCreateAll} disabled={isPending} className="gap-1.5">
                                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                Criar Todos
                            </Button>
                        )}
                    </div>
                    {pendingSales.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <CheckCircle className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
                            <p className="font-medium">Todas as vendas já possuem envio!</p>
                        </div>
                    ) : (
                        <div className="divide-y max-h-[400px] overflow-y-auto">
                            {pendingSales.map(sale => (
                                <div key={sale.id} className="px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-sm">{sale.customerName}</p>
                                        <p className="text-xs text-muted-foreground truncate">{sale.itemsSummary}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(new Date(sale.date), "dd/MM/yyyy", { locale: ptBR })} · {formatBRL(sale.totalAmount)}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleCreateShipment(sale.id)}
                                        disabled={loadingId === sale.id}
                                        className="gap-1 text-xs shrink-0 ml-3"
                                    >
                                        {loadingId === sale.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                        Criar Envio
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tabs de Status */}
            <div className="flex rounded-lg border overflow-hidden w-fit">
                {[
                    { value: "all", label: "Todos" },
                    ...PREP_STATUSES.map(s => ({ value: s, label: STATUS_CONFIG[s].label })),
                ].map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.value
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted text-muted-foreground"
                            }`}
                    >
                        {tab.label}
                        {tab.value !== "all" && (
                            <span className="ml-1.5 text-xs opacity-70">
                                {shipments.filter(s => s.status === tab.value).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Lista de Pedidos */}
            {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground rounded-xl border bg-card">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                    <p className="text-lg font-medium">Nenhum pedido nesta etapa!</p>
                </div>
            ) : (
                <div className="rounded-xl border bg-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Cliente</th>
                                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Itens</th>
                                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Valor</th>
                                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(s => {
                                const config = STATUS_CONFIG[s.status]
                                const Icon = config?.icon || Clock
                                return (
                                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-sm">{s.customerName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(s.saleDate), "dd/MM/yyyy", { locale: ptBR })}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            <p className="truncate max-w-[200px]">{s.itemsSummary}</p>
                                            <p className="text-xs">{s.itemCount} item(ns)</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium">{formatBRL(s.saleTotal)}</td>
                                        <td className="px-4 py-3">
                                            <Badge className={`gap-1 text-xs ${config?.color}`}>
                                                <Icon className="h-3 w-3" /> {config?.label}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {config?.next && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleAdvanceStatus(s.id, config.next!)}
                                                    disabled={loadingId === s.id}
                                                    className="gap-1 text-xs"
                                                >
                                                    {loadingId === s.id
                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        : <ArrowRight className="h-3.5 w-3.5" />
                                                    }
                                                    {config.nextLabel}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
