"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plug, ShoppingBag, ArrowRight, CheckCircle2, Clock } from "lucide-react"
import Link from "next/link"

const integrations = [
    {
        id: "nuvemshop",
        name: "Nuvemshop",
        description: "Sincronize pedidos, clientes, faturamento e logística automaticamente com sua loja Nuvemshop.",
        href: "/dashboard/integracoes/nuvemshop",
        icon: "🛍️",
        status: "available",
        features: ["Pedidos → Vendas", "Clientes automáticos", "Contas a Receber", "Logística"],
    },
    {
        id: "mercadolivre",
        name: "Mercado Livre",
        description: "Integração com ML para importar vendas e gerenciar anúncios.",
        href: "#",
        icon: "🛒",
        status: "coming_soon",
        features: ["Em breve"],
    },
    {
        id: "ifood",
        name: "iFood",
        description: "Importe pedidos do iFood direto no sistema.",
        href: "#",
        icon: "🍕",
        status: "coming_soon",
        features: ["Em breve"],
    },
]

export default function IntegracoesPage() {
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                    <Plug className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Central de Integrações</h1>
                    <p className="text-sm text-gray-400">Conecte o Orbital Hub com suas plataformas de venda</p>
                </div>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrations.map((integration) => (
                    <div
                        key={integration.id}
                        className={`relative rounded-xl border p-5 flex flex-col gap-4 transition-all ${integration.status === "available"
                                ? "border-gray-700 bg-gray-900 hover:border-blue-500/50 hover:bg-gray-800/80"
                                : "border-gray-800 bg-gray-900/50 opacity-60 cursor-not-allowed"
                            }`}
                    >
                        {/* Badge */}
                        {integration.status === "coming_soon" && (
                            <span className="absolute top-3 right-3 text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Em breve
                            </span>
                        )}

                        {/* Icon + Name */}
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{integration.icon}</span>
                            <div>
                                <h2 className="text-white font-semibold text-lg">{integration.name}</h2>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-gray-400 flex-1">{integration.description}</p>

                        {/* Features */}
                        <ul className="space-y-1">
                            {integration.features.map((f) => (
                                <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>

                        {/* CTA */}
                        {integration.status === "available" && (
                            <Link
                                href={integration.href}
                                className="flex items-center justify-center gap-2 mt-1 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                            >
                                Configurar <ArrowRight className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
