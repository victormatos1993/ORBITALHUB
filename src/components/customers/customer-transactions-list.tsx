"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Transaction {
    id: string
    description: string
    amount: number
    type: string
    status: string
    date: Date
}

interface CustomerTransactionsListProps {
    transactions: any[]
}

export function CustomerTransactionsList({ transactions }: CustomerTransactionsListProps) {
    const sortedTransactions = [...transactions].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Movimentações Financeiras
                </CardTitle>
            </CardHeader>
            <CardContent>
                {sortedTransactions.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                        Nenhuma transação registrada.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sortedTransactions.map((t) => (
                            <div
                                key={t.id}
                                className="flex items-center justify-between p-3 rounded-lg border bg-muted/10"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                                        }`}>
                                        {t.type === 'income' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm flex items-center gap-2">
                                            {t.description}
                                            {t.eventId && (
                                                <Badge variant="outline" className="text-[9px] h-3.5 px-1.5 border-indigo-200 bg-indigo-50 text-indigo-600 font-medium">
                                                    Agendado
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {format(new Date(t.date), "dd/MM/yyyy", { locale: ptBR })}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-bold text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                                        }`}>
                                        {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                                    </div>
                                    <Badge
                                        variant={t.status === 'paid' ? 'default' : 'secondary'}
                                        className="text-[10px] h-4 mt-1"
                                    >
                                        {t.status === 'paid' ? 'Pago' : t.status === 'pending' ? 'Pendente' : t.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
