import { getShipmentDashboard, getShipmentOrders } from "@/app/actions/shipment"
import { Package, Truck, Clock, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react"
import Link from "next/link"

export default async function LogisticaDashboardPage() {
    const [dashboard, recentShipments] = await Promise.all([
        getShipmentDashboard(),
        getShipmentOrders({ status: "PENDENTE" }),
    ])

    const kpis = [
        {
            label: "Pendentes",
            value: dashboard?.pendentes ?? 0,
            icon: Clock,
            color: "text-yellow-500",
            bg: "bg-yellow-500/10",
        },
        {
            label: "Em Separação",
            value: dashboard?.separando ?? 0,
            icon: Package,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
        },
        {
            label: "Prontos p/ Postar",
            value: dashboard?.prontos ?? 0,
            icon: Truck,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
        },
        {
            label: "Postados Hoje",
            value: dashboard?.postadosHoje ?? 0,
            icon: ArrowRight,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
        },
        {
            label: "Entregues (mês)",
            value: dashboard?.entreguesMes ?? 0,
            icon: CheckCircle,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
        },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Logística</h1>
                <p className="text-muted-foreground">Visão geral de envios e preparação</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {kpis.map(kpi => (
                    <div key={kpi.label} className="rounded-xl border bg-card p-4">
                        <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full ${kpi.bg} flex items-center justify-center`}>
                                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{kpi.value}</p>
                                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/dashboard/logistica/pedidos" className="rounded-xl border bg-card p-5 hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <Package className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="font-semibold">Pedidos</p>
                                <p className="text-sm text-muted-foreground">Separação e embalagem</p>
                            </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                </Link>

                <Link href="/dashboard/logistica/envios" className="rounded-xl border bg-card p-5 hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                                <Truck className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <p className="font-semibold">Envios</p>
                                <p className="text-sm text-muted-foreground">Kanban de rastreio</p>
                            </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                </Link>
            </div>

            {/* Pending Shipments */}
            {recentShipments.length > 0 && (
                <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="px-5 py-4 border-b bg-gradient-to-r from-yellow-500/5 to-orange-500/5">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            <h2 className="font-semibold">Envios Pendentes</h2>
                            <span className="ml-auto text-sm text-muted-foreground">{recentShipments.length} envios</span>
                        </div>
                    </div>
                    <div className="divide-y">
                        {recentShipments.slice(0, 8).map(s => (
                            <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                <div>
                                    <p className="font-medium text-sm">{s.customerName}</p>
                                    <p className="text-xs text-muted-foreground">{s.itemsSummary}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">
                                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(s.saleTotal)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(s.saleDate).toLocaleDateString("pt-BR")}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {recentShipments.length === 0 && (
                <div className="text-center py-12 text-muted-foreground rounded-xl border bg-card">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                    <p className="text-lg font-medium">Nenhum envio pendente!</p>
                    <p className="text-sm">Todos os pedidos estão em dia.</p>
                </div>
            )}
        </div>
    )
}
