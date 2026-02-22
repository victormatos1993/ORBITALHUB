"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarClock, CheckCircle, ExternalLink } from "lucide-react"
import Link from "next/link"
import { updateTransaction } from "@/app/actions/transaction"
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
}

interface ScheduledTransactionsProps {
    data: Transaction[]
    className?: string
}

export function ScheduledTransactions({ data, className }: ScheduledTransactionsProps) {
    const router = useRouter()

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }

    const handleConfirmPayment = async (id: string, currentData: Transaction) => {
        try {
            // we need to pass the full object as required by updateTransaction schema
            const res = await updateTransaction(id, {
                description: currentData.description,
                amount: currentData.amount,
                type: currentData.type as any,
                date: new Date(currentData.date),
                status: "paid"
            })

            if (res.success) {
                toast.success("Pagamento confirmado!")
                router.refresh()
            } else {
                toast.error("Erro ao confirmar pagamento")
            }
        } catch (error) {
            toast.error("Erro ao processar confirmação")
        }
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
                                data.map((transaction) => (
                                    <TableRow key={transaction.id} className="group transition-colors">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm">{transaction.description}</span>
                                                {transaction.eventId && (
                                                    <Link
                                                        href="/dashboard/agenda"
                                                        className="text-[10px] text-primary flex items-center gap-0.5 hover:underline mt-0.5"
                                                    >
                                                        <ExternalLink className="h-2.5 w-2.5" /> Ver na Agenda
                                                    </Link>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className={`text-right font-bold text-sm ${transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            <Badge variant="outline" className="font-medium bg-background">
                                                {formatDate(transaction.date)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 gap-1 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground group-hover:border-primary transition-all"
                                                onClick={() => handleConfirmPayment(transaction.id, transaction)}
                                            >
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                Confirmar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )))
                            }
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
