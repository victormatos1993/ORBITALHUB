"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    Truck, Package, CheckCircle, ArrowRight, Loader2,
    MapPin, Hash, Pencil, X, ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    getShipmentOrders,
    updateShipmentStatus,
    updateShipmentDetails,
} from "@/app/actions/shipment"

// ─── Tipos ─────────────────────────────────────────────────────────
interface Shipment {
    id: string
    saleId: string
    status: string
    statusLabel: string
    trackingCode: string | null
    shippingMethod: string | null
    shippingCost: number | null
    weight: number | null
    notes: string | null
    carrierName: string | null
    carrierId: string | null
    customerName: string
    customerCity: string | null
    customerState: string | null
    saleTotal: number
    saleDate: string
    itemCount: number
    itemsSummary: string
    postedAt: string | null
    deliveredAt: string | null
    createdAt: string
}

type KanbanColumn = {
    status: string
    label: string
    color: string
    bgGradient: string
    icon: any
}

const COLUMNS: KanbanColumn[] = [
    {
        status: "POSTADO",
        label: "Para Postar / Postado",
        color: "text-orange-500",
        bgGradient: "from-orange-500/10 to-yellow-500/10",
        icon: Truck,
    },
    {
        status: "EM_TRANSITO",
        label: "Em Trânsito",
        color: "text-blue-500",
        bgGradient: "from-blue-500/10 to-cyan-500/10",
        icon: MapPin,
    },
    {
        status: "ENTREGUE",
        label: "Entregue",
        color: "text-emerald-500",
        bgGradient: "from-emerald-500/10 to-green-500/10",
        icon: CheckCircle,
    },
]

const SHIPPING_METHODS = ["PAC", "SEDEX", "TRANSPORTADORA", "MOTOBOY", "RETIRADA"]

const formatBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

// ─── Component ─────────────────────────────────────────────────────
export function EnviosClient() {
    const router = useRouter()
    const [shipments, setShipments] = useState<Shipment[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [loadingId, setLoadingId] = useState<string | null>(null)

    // Edit form state
    const [trackingCode, setTrackingCode] = useState("")
    const [shippingMethod, setShippingMethod] = useState("")
    const [weight, setWeight] = useState("")
    const [notes, setNotes] = useState("")

    const load = useCallback(async () => {
        const orders = await getShipmentOrders()
        // Show only post-preparation shipments (ETIQUETADO ready to post, POSTADO, EM_TRANSITO, ENTREGUE)
        setShipments(orders.filter((o: any) =>
            ["ETIQUETADO", "POSTADO", "EM_TRANSITO", "ENTREGUE"].includes(o.status)
        ) as Shipment[])
    }, [])

    useEffect(() => { load() }, [load])

    const getColumnShipments = (status: string) => {
        if (status === "POSTADO") {
            return shipments.filter(s => s.status === "ETIQUETADO" || s.status === "POSTADO")
        }
        return shipments.filter(s => s.status === status)
    }

    const handleAdvance = async (id: string, newStatus: string) => {
        setLoadingId(id)
        const result = await updateShipmentStatus(id, newStatus)
        if (result.error) toast.error(result.error)
        else { toast.success("Status atualizado!"); load() }
        setLoadingId(null)
    }

    const openEdit = (s: Shipment) => {
        setEditingId(s.id)
        setTrackingCode(s.trackingCode || "")
        setShippingMethod(s.shippingMethod || "")
        setWeight(s.weight ? String(s.weight) : "")
        setNotes(s.notes || "")
    }

    const handleSaveDetails = async () => {
        if (!editingId) return
        setLoadingId(editingId)
        const result = await updateShipmentDetails(editingId, {
            trackingCode: trackingCode || null,
            shippingMethod: shippingMethod || null,
            weight: weight ? parseFloat(weight) : null,
            notes: notes || null,
        })
        if (result.error) toast.error(result.error)
        else { toast.success("Detalhes atualizados!"); setEditingId(null); load() }
        setLoadingId(null)
    }

    return (
        <div className="space-y-4">
            {/* Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {COLUMNS.map(col => {
                    const colShipments = getColumnShipments(col.status)
                    const Icon = col.icon
                    return (
                        <div key={col.status} className="rounded-xl border bg-card overflow-hidden">
                            {/* Column Header */}
                            <div className={`bg-gradient-to-r ${col.bgGradient} px-4 py-3 border-b`}>
                                <div className="flex items-center gap-2">
                                    <Icon className={`h-5 w-5 ${col.color}`} />
                                    <h3 className="font-semibold text-sm">{col.label}</h3>
                                    <Badge variant="secondary" className="ml-auto text-xs">
                                        {colShipments.length}
                                    </Badge>
                                </div>
                            </div>

                            {/* Column Cards */}
                            <div className="p-3 space-y-3 min-h-[200px] max-h-[calc(100vh-320px)] overflow-y-auto">
                                {colShipments.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum envio</p>
                                )}
                                {colShipments.map(s => (
                                    <div
                                        key={s.id}
                                        className="rounded-lg border bg-background p-3 space-y-2 hover:shadow-sm transition-shadow"
                                    >
                                        {/* Customer & Details */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-sm truncate">{s.customerName}</p>
                                                {(s.customerCity || s.customerState) && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {[s.customerCity, s.customerState].filter(Boolean).join(" - ")}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-xs font-medium text-muted-foreground shrink-0">
                                                {formatBRL(s.saleTotal)}
                                            </span>
                                        </div>

                                        {/* Items */}
                                        <p className="text-xs text-muted-foreground truncate">
                                            {s.itemCount} item(ns): {s.itemsSummary}
                                        </p>

                                        {/* Tracking / Method */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {s.trackingCode && (
                                                <Badge variant="outline" className="text-[10px] gap-1">
                                                    <Hash className="h-2.5 w-2.5" /> {s.trackingCode}
                                                </Badge>
                                            )}
                                            {s.shippingMethod && (
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {s.shippingMethod}
                                                </Badge>
                                            )}
                                            {s.carrierName && (
                                                <span className="text-[10px] text-muted-foreground">{s.carrierName}</span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 pt-1 border-t">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => openEdit(s)}
                                                className="h-7 text-xs gap-1 text-muted-foreground"
                                            >
                                                <Pencil className="h-3 w-3" /> Editar
                                            </Button>
                                            {s.status === "ETIQUETADO" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleAdvance(s.id, "POSTADO")}
                                                    disabled={loadingId === s.id}
                                                    className="h-7 text-xs gap-1 ml-auto"
                                                >
                                                    {loadingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Truck className="h-3 w-3" />}
                                                    Postar
                                                </Button>
                                            )}
                                            {s.status === "POSTADO" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleAdvance(s.id, "EM_TRANSITO")}
                                                    disabled={loadingId === s.id}
                                                    className="h-7 text-xs gap-1 ml-auto"
                                                >
                                                    {loadingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
                                                    Em Trânsito
                                                </Button>
                                            )}
                                            {s.status === "EM_TRANSITO" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleAdvance(s.id, "ENTREGUE")}
                                                    disabled={loadingId === s.id}
                                                    className="h-7 text-xs gap-1 ml-auto text-emerald-600"
                                                >
                                                    {loadingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                                    Entregue
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Edit Modal */}
            {editingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingId(null)} />
                    <div className="relative bg-card rounded-xl border shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-6 py-4 rounded-t-xl border-b">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Package className="h-5 w-5 text-blue-500" />
                                    <h3 className="font-semibold text-lg">Detalhes do Envio</h3>
                                </div>
                                <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <Label>Código de Rastreio</Label>
                                <Input
                                    placeholder="Ex: BR123456789BR"
                                    value={trackingCode}
                                    onChange={e => setTrackingCode(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Método de Envio</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={shippingMethod}
                                    onChange={e => setShippingMethod(e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {SHIPPING_METHODS.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Peso (kg)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={weight}
                                    onChange={e => setWeight(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Observações</Label>
                                <Input
                                    placeholder="Ex: Embalar com cuidado"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <Button variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                                <Button
                                    onClick={handleSaveDetails}
                                    disabled={loadingId === editingId}
                                    className="gap-1.5"
                                >
                                    {loadingId === editingId
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <CheckCircle className="h-4 w-4" />
                                    }
                                    Salvar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
