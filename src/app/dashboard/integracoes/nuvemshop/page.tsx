"use client"

import { useState, useEffect, useTransition } from "react"
import { ShoppingBag, CheckCircle2, AlertCircle, Zap, RefreshCw, ToggleLeft, ToggleRight, ExternalLink, Copy } from "lucide-react"
import { getNuvemshopConfig, saveNuvemshopConfig, toggleNuvemshopSync } from "@/app/actions/nuvemshop-config"
import { toast } from "sonner"

export default function NuvemshopIntegrationPage() {
    const [config, setConfig] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()

    const [storeId, setStoreId] = useState("")
    const [accessToken, setAccessToken] = useState("")
    const [syncEnabled, setSyncEnabled] = useState(true)

    const webhookUrl = typeof window !== "undefined"
        ? `${window.location.origin}/api/webhooks/nuvemshop`
        : "/api/webhooks/nuvemshop"

    useEffect(() => {
        getNuvemshopConfig().then((c) => {
            if (c) {
                setConfig(c)
                setStoreId(c.storeId || "")
                setAccessToken(c.accessToken || "")
                setSyncEnabled(c.syncEnabled ?? true)
            }
            setLoading(false)
        })
    }, [])

    function handleSave(e: React.FormEvent) {
        e.preventDefault()
        startTransition(async () => {
            const result = await saveNuvemshopConfig({ storeId, accessToken, syncEnabled })
            if (result.success) {
                toast.success("Configuração salva com sucesso!")
                setConfig({ storeId, accessToken, syncEnabled })
            } else {
                toast.error(result.error || "Erro ao salvar")
            }
        })
    }

    function handleToggle() {
        const newValue = !syncEnabled
        setSyncEnabled(newValue)
        startTransition(async () => {
            const result = await toggleNuvemshopSync(newValue)
            if (result.success) {
                toast.success(newValue ? "Sync ativado!" : "Sync pausado")
            } else {
                setSyncEnabled(!newValue)
                toast.error(result.error || "Erro ao alterar")
            }
        })
    }

    function copyWebhook() {
        navigator.clipboard.writeText(webhookUrl)
        toast.success("URL do webhook copiada!")
    }

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
        )
    }

    const isConfigured = !!config?.storeId

    return (
        <div className="p-6 space-y-6 max-w-2xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <span className="text-4xl">🛍️</span>
                <div>
                    <h1 className="text-2xl font-bold text-white">Nuvemshop</h1>
                    <p className="text-sm text-gray-400">Sincronize pedidos, clientes e logística automaticamente</p>
                </div>
                {isConfigured && (
                    <button
                        onClick={handleToggle}
                        disabled={isPending}
                        className="ml-auto flex items-center gap-2 text-sm"
                    >
                        {syncEnabled ? (
                            <><ToggleRight className="w-8 h-8 text-emerald-400" /> <span className="text-emerald-400">Ativo</span></>
                        ) : (
                            <><ToggleLeft className="w-8 h-8 text-gray-500" /> <span className="text-gray-400">Pausado</span></>
                        )}
                    </button>
                )}
            </div>

            {/* Status Banner */}
            {isConfigured ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <div className="text-sm">
                        <p className="font-medium">Integração configurada</p>
                        {config.lastSyncAt && (
                            <p className="text-emerald-500/70 text-xs mt-0.5">
                                Última sincronização: {new Date(config.lastSyncAt).toLocaleString("pt-BR")}
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">Integração não configurada. Preencha as credenciais abaixo.</p>
                </div>
            )}

            {/* How it works */}
            <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-3">
                <h2 className="text-white font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" /> O que é sincronizado automaticamente
                </h2>
                <ul className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                    {[
                        "✅ Pedidos → Vendas",
                        "✅ Clientes cadastrados",
                        "✅ Contas a Receber",
                        "✅ Pedido de Envio (Logística)",
                        "✅ Baixa no estoque",
                        "✅ Status de pagamento",
                    ].map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </div>

            {/* Config Form */}
            <form onSubmit={handleSave} className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
                <h2 className="text-white font-semibold">Credenciais da API</h2>

                <div className="space-y-1">
                    <label className="text-sm text-gray-400">Store ID *</label>
                    <input
                        value={storeId}
                        onChange={(e) => setStoreId(e.target.value)}
                        placeholder="Ex: 1234567"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        required
                    />
                    <p className="text-xs text-gray-500">Encontrado no painel da Nuvemshop → Configurações → Dados da loja</p>
                </div>

                <div className="space-y-1">
                    <label className="text-sm text-gray-400">Access Token *</label>
                    <input
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        type="password"
                        placeholder="••••••••••••••••"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        required
                    />
                    <p className="text-xs text-gray-500">Obtido no Portal de Parceiros → Seu App → Chaves de Acesso</p>
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                    {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    Salvar Credenciais
                </button>
            </form>

            {/* Webhook URL */}
            <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-3">
                <h2 className="text-white font-semibold">URL do Webhook</h2>
                <p className="text-sm text-gray-400">
                    Configure esta URL no Portal de Parceiros da Nuvemshop para receber pedidos em tempo real:
                </p>
                <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
                    <code className="text-xs text-emerald-400 flex-1 truncate">{webhookUrl}</code>
                    <button onClick={copyWebhook} className="text-gray-400 hover:text-white transition-colors">
                        <Copy className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-xs text-gray-500">
                    Eventos a configurar: <code className="text-blue-400">order/created</code>, <code className="text-blue-400">order/paid</code>, <code className="text-blue-400">order/fulfilled</code>
                </p>
                <a
                    href="https://dev.nuvemshop.com.br/docs/applications/authentication"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                    Ver documentação Nuvemshop <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        </div>
    )
}
