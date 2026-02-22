"use client"

import { useState } from "react"
import {
    Plug,
    Search,
    ExternalLink,
    CheckCircle2,
    Clock,
    AlertCircle,
    ShoppingBag,
    Store,
    Smartphone,
    Globe,
    ArrowRight,
    Filter,
    ArrowUpRight,
    Activity,
    CalendarCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ─── Integration Types ───
type IntegrationStatus = "connected" | "disconnected" | "pending" | "error"

interface Integration {
    id: string
    name: string
    description: string
    category: "Marketplace" | "E-commerce" | "Hub" | "Sales" | "Serviços" | "Wellness"
    status: IntegrationStatus
    icon: any
    color: string
    stats?: string
}

const integrations: Integration[] = [
    {
        id: "nuvemshop",
        name: "Nuvemshop",
        description: "Sincronize pedidos, estoque e clientes da sua loja Nuvemshop.",
        category: "E-commerce",
        status: "disconnected",
        icon: Store,
        color: "blue",
    },
    {
        id: "mercado-livre",
        name: "Mercado Livre",
        description: "Integração completa com vendas, anúncios e logística do ML.",
        category: "Marketplace",
        status: "disconnected",
        icon: ShoppingBag,
        color: "yellow",
    },
    {
        id: "shopee",
        name: "Shopee",
        description: "Gerencie seus pedidos e estoque da Shopee centralizado.",
        category: "Marketplace",
        status: "disconnected",
        icon: Smartphone,
        color: "orange",
    },
    {
        id: "magalu",
        name: "Magalu",
        description: "Puxe as vendas do Magalu Marketplace diretamente para o ERP.",
        category: "Marketplace",
        status: "disconnected",
        icon: ShoppingBag,
        color: "blue",
    },
    {
        id: "shopify",
        name: "Shopify",
        description: "Integração global para lojas internacionais Shopify.",
        category: "E-commerce",
        status: "disconnected",
        icon: Globe,
        color: "green",
    },
    {
        id: "bling",
        name: "Bling",
        description: "Hub de integração para múltiplos canais simultâneos.",
        category: "Hub",
        status: "disconnected",
        icon: Plug,
        color: "primary",
    },
    {
        id: "booksy",
        name: "Booksy",
        description: "Sincronize seus agendamentos, clientes e receba pagamentos dos serviços.",
        category: "Serviços",
        status: "disconnected",
        icon: Smartphone,
        color: "cyan",
    },
    {
        id: "gympass",
        name: "Gympass (Wellhub)",
        description: "Integração de check-ins e repasse de pagamentos para estúdios e academias.",
        category: "Wellness",
        status: "disconnected",
        icon: Activity,
        color: "rose",
    }
]

export function ConnectionsContent() {
    const [searchQuery, setSearchQuery] = useState("")
    const [filter, setFilter] = useState<string>("all")

    const filteredIntegrations = integrations.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesFilter = filter === "all" || item.category === filter
        return matchesSearch && matchesFilter
    })

    const categories = ["all", ...Array.from(new Set(integrations.map(i => i.category)))]

    return (
        <div className="flex flex-col gap-8 pb-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5">
                        <Plug className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <h1 className="text-2xl font-bold tracking-tight">Conexões</h1>
                        <p className="text-sm text-muted-foreground max-w-xl">
                            Conecte seu ERP com as principais plataformas de venda para automatizar
                            seus pedidos, estoque e faturamento.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 py-1 px-3">
                        {integrations.filter(i => i.status === "connected").length} Conectadas
                    </Badge>
                    <Badge variant="outline" className="bg-muted/50 py-1 px-3">
                        {integrations.length} Disponíveis
                    </Badge>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar plataforma (ex: Nuvemshop, ML...)"
                        className="pl-10 rounded-xl bg-card/50 border-muted-foreground/20 focus:ring-primary/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 p-1 bg-muted/30 rounded-xl border border-border/50">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setFilter(cat)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                                    filter === cat
                                        ? "bg-primary text-white shadow-sm"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                {cat === "all" ? "Todas" : cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Integrations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredIntegrations.map((item) => (
                    <div
                        key={item.id}
                        className="group relative flex flex-col p-6 rounded-2xl border bg-card/40 hover:bg-card hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-primary/5"
                    >
                        {/* Status Light */}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 border border-border/50">
                            <div className={cn(
                                "h-2 w-2 rounded-full",
                                item.status === "connected" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
                            )} />
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                {item.status === "connected" ? "Ativo" : "Pendente"}
                            </span>
                        </div>

                        {/* Icon & Category */}
                        <div className="flex items-center gap-4 mb-5">
                            <div className={cn(
                                "flex h-14 w-14 items-center justify-center rounded-2xl border border-white/5 shadow-inner transition-transform group-hover:scale-110 duration-500",
                                item.id === "nuvemshop" ? "bg-blue-600/10 text-blue-500" :
                                    item.id === "mercado-livre" ? "bg-yellow-500/10 text-yellow-600" :
                                        item.id === "shopee" ? "bg-orange-600/10 text-orange-500" :
                                            item.id === "magalu" ? "bg-blue-500/10 text-blue-400" :
                                                item.id === "shopify" ? "bg-green-600/10 text-green-500" :
                                                    item.id === "booksy" ? "bg-cyan-600/10 text-cyan-500" :
                                                        item.id === "gympass" ? "bg-rose-600/10 text-rose-500" :
                                                            "bg-primary/10 text-primary"
                            )}>
                                <item.icon className="h-7 w-7" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-none mb-1.5">{item.name}</h3>
                                <Badge variant="secondary" className="text-[10px] h-5 font-semibold bg-muted px-2">
                                    {item.category}
                                </Badge>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">
                            {item.description}
                        </p>

                        {/* Actions */}
                        <div className="mt-auto pt-4 border-t border-muted/30">
                            {item.status === "connected" ? (
                                <div className="flex items-center justify-between">
                                    <Button variant="ghost" size="sm" className="rounded-lg h-9 hover:text-primary">
                                        Configurar
                                    </Button>
                                    <Button size="sm" className="rounded-lg h-9 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">
                                        Sincronizado
                                    </Button>
                                </div>
                            ) : (
                                <Button className="w-full rounded-xl gradient-primary text-white shadow-lg shadow-primary/20 group/btn h-11">
                                    Conectar Agora
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                </Button>
                            )}
                        </div>

                        {/* Decoration lines */}
                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/30 transition-all duration-500" />
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {filteredIntegrations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-muted/30 rounded-3xl bg-muted/5">
                    <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                        <Search className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-lg font-semibold text-muted-foreground">Nenhuma plataforma encontrada</h3>
                    <p className="text-sm text-muted-foreground/60 max-w-[300px] mt-1">
                        Tente buscar por outro termo ou limpe os filtros para encontrar o que procura.
                    </p>
                    <Button
                        variant="link"
                        className="text-primary mt-4"
                        onClick={() => { setSearchQuery(""); setFilter("all"); }}
                    >
                        Limpar todos os filtros
                    </Button>
                </div>
            )}

            {/* CTA/Info Footer */}
            <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <ArrowUpRight className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground">Não encontrou o que precisava?</h4>
                            <p className="text-sm text-muted-foreground">Novas integrações são adicionadas mensalmente ao Orbital Hub.</p>
                        </div>
                    </div>
                    <Button variant="outline" className="rounded-xl border-primary/20 text-primary hover:bg-primary/10">
                        Sugerir Integração
                    </Button>
                </div>
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
            </div>
        </div>
    )
}
