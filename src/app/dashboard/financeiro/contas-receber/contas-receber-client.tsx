"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format, isPast, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { confirmarPagamento } from "@/app/actions/transaction"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { CheckCircle, Clock, AlertTriangle, AlertCircle, TrendingUp, CreditCard } from "lucide-react"

interface ContaReceber {
    id: string
    description: string
    amount: number
    date: string
    categoryName?: string | null
    customerName?: string | null
    contaName?: string | null
    maquinaName?: string | null
    installmentNumber?: number | null
    installmentTotal?: number | null
    taxaAplicada?: number | null
}

function getStatusBadge(dateStr: string) {
    const date = new Date(dateStr + "T12:00:00")
    if (isPast(date) && !isToday(date)) {
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Atrasada</Badge>
    }
    if (isToday(date)) {
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 gap-1"><AlertTriangle className="h-3 w-3" /> Vence Hoje</Badge>
    }
    return <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 gap-1"><Clock className="h-3 w-3" /> A Receber</Badge>
}

export function ContasReceberClient({ contas }: { contas: ContaReceber[] }) {
    const router = useRouter()
    const [loading, setLoading] = useState<string | null>(null)

    const handleConfirmar = async (id: string) => {
        setLoading(id)
        try {
            const result = await confirmarPagamento(id)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Recebimento confirmado!")
                router.refresh()
            }
        } finally {
            setLoading(null)
        }
    }

    const total = contas.reduce((s, c) => s + c.amount, 0)
    const contasCartao = contas.filter(c => c.maquinaName)
    const contasOutras = contas.filter(c => !c.maquinaName)

    return (
        <div className="space-y-4">
            {/* Resumo */}
            <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Total a Receber</p>
                    <p className="text-2xl font-bold text-emerald-500">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}
                    </p>
                </div>
                <div className="ml-auto flex gap-4 text-sm text-muted-foreground">
                    {contasCartao.length > 0 && (
                        <div className="flex items-center gap-1">
                            <CreditCard className="h-4 w-4" />
                            {contasCartao.length} parcela{contasCartao.length !== 1 ? "s" : ""} cartão
                        </div>
                    )}
                    <div>{contas.length} registro{contas.length !== 1 ? "s" : ""}</div>
                </div>
            </div>

            {/* Lista */}
            {contas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                    <p className="text-lg font-medium">Nenhuma conta a receber!</p>
                    <p className="text-sm">Todas as suas receitas foram recebidas.</p>
                </div>
            ) : (
                <div className="rounded-xl border bg-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="text-left px-4 py-3 text-sm font-medium">Descrição</th>
                                <th className="text-left px-4 py-3 text-sm font-medium">Valor</th>
                                <th className="text-left px-4 py-3 text-sm font-medium">Vencimento</th>
                                <th className="text-left px-4 py-3 text-sm font-medium">Status</th>
                                <th className="text-left px-4 py-3 text-sm font-medium">Maquininha</th>
                                <th className="text-right px-4 py-3 text-sm font-medium">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contas.map((conta) => (
                                <tr key={conta.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{conta.description}</div>
                                        {conta.customerName && (
                                            <div className="text-xs text-muted-foreground">{conta.customerName}</div>
                                        )}
                                        {conta.installmentTotal && conta.installmentTotal > 1 && (
                                            <div className="text-xs text-muted-foreground">
                                                Parcela {conta.installmentNumber}/{conta.installmentTotal}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-emerald-500">
                                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(conta.amount)}
                                        </div>
                                        {conta.taxaAplicada && conta.taxaAplicada > 0 && (
                                            <div className="text-xs text-muted-foreground">
                                                Taxa: {(conta.taxaAplicada * 100).toFixed(2)}%
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {format(new Date(conta.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                                    </td>
                                    <td className="px-4 py-3">{getStatusBadge(conta.date)}</td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                        {conta.maquinaName || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleConfirmar(conta.id)}
                                            disabled={loading === conta.id}
                                            className="gap-1"
                                        >
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            {loading === conta.id ? "..." : "Receber"}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
