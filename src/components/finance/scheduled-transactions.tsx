"use client"

import { useState } from "react"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarClock, ShoppingCart, CalendarSearch, X } from "lucide-react"
import { cancelEventAndTransaction } from "@/app/actions/agenda"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Transaction {
    id: string
    description: string
    amount: number
    status: string
    date: string
    type: string
    eventId?: string | null
    customerId?: string | null
    serviceId?: string | null
    productId?: string | null
}

interface ScheduledTransactionsProps {
    data: Transaction[]
    className?: string
    customers?: any[]
    products?: any[]
    services?: any[]
}

export function ScheduledTransactions({
    data,
    className,
}: ScheduledTransactionsProps) {
    const router = useRouter()
    const [cancelling, setCancelling] = useState<string | null>(null)

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-"
        const [year, month, day] = dateStr.split("-")
        return `${day}/${month}/${year}`
    }

    const handleOpenPDV = (transaction: Transaction) => {
        const params = new URLSearchParams()
        if (transaction.customerId) params.set("customerId", transaction.customerId)
        if (transaction.serviceId) params.set("serviceId", transaction.serviceId)
        if (transaction.productId) params.set("productId", transaction.productId)
        if (transaction.eventId) params.set("eventId", transaction.eventId)
        window.location.href = `/dashboard/vendas/pdv?${params.toString()}`
    }

    // Navega para a agenda com o eventId na URL.
    // A própria página da agenda detecta o parâmetro e abre o modal do evento.
    const handleOpenAgenda = (transaction: Transaction) => {
        if (!transaction.eventId) {
            toast.error("Este agendamento não possui um evento vinculado.")
            return
        }
        router.push(`/dashboard/agenda?eventId=${transaction.eventId}`)
    }

    const handleCancel = async (transaction: Transaction) => {
        if (!transaction.eventId) return
        setCancelling(transaction.id)
        const res = await cancelEventAndTransaction(transaction.eventId)
        if (res?.success) {
            toast.info("Agendamento cancelado")
            router.refresh()
        } else {
            toast.error("Erro ao cancelar agendamento")
        }
        setCancelling(null)
    }

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <CalendarClock className="h-5 w-5 text-primary" strokeWidth={2.5} />
                        Transações Agendadas
                    </CardTitle>
                    <CardDescription>Eventos futuros que gerarão receita ou despesa.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border border-dashed border-primary/20 bg-primary/5 p-1">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs font-bold uppercase text-muted-foreground/70">Título / Descrição</TableHead>
                                <TableHead className="text-right text-xs font-bold uppercase text-muted-foreground/70">Valor Previsto</TableHead>
                                <TableHead className="text-right text-xs font-bold uppercase text-muted-foreground/70">Data Prevista</TableHead>
                                <TableHead className="text-right text-xs font-bold uppercase text-muted-foreground/70">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                                        Nenhum agendamento futuro com impacto financeiro.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((transaction) => {
                                    const isCancelling = cancelling === transaction.id
                                    return (
                                        <TableRow key={transaction.id} className="group transition-colors">
                                            <TableCell>
                                                <span className="font-semibold text-sm">{transaction.description}</span>
                                            </TableCell>
                                            <TableCell className={`text-right font-bold text-sm ${transaction.type === "income" ? "text-emerald-600" : "text-destructive"}`}>
                                                {transaction.type === "expense" ? "-" : "+"}{formatCurrency(transaction.amount)}
                                            </TableCell>
                                            <TableCell className="text-right text-sm">
                                                <Badge variant="outline" className="font-medium bg-background">
                                                    {formatDate(transaction.date)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* Abrir PDV */}
                                                    <button
                                                        onClick={() => handleOpenPDV(transaction)}
                                                        title="Abrir no PDV"
                                                        className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                                                    >
                                                        <ShoppingCart className="h-3 w-3" />
                                                        PDV
                                                    </button>

                                                    {/* Ver agendamento — navega para Agenda e abre o modal do evento */}
                                                    {transaction.eventId && (
                                                        <button
                                                            onClick={() => handleOpenAgenda(transaction)}
                                                            title="Ver na Agenda"
                                                            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                                        >
                                                            <CalendarSearch className="h-3 w-3" />
                                                            Agendamento
                                                        </button>
                                                    )}

                                                    {/* Cancelar */}
                                                    {transaction.eventId && (
                                                        <button
                                                            onClick={() => handleCancel(transaction)}
                                                            disabled={isCancelling}
                                                            title="Cancelar agendamento"
                                                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                                        >
                                                            {isCancelling
                                                                ? <span className="h-3 w-3 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin inline-block" />
                                                                : <X className="h-3.5 w-3.5" />
                                                            }
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
