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
import { Trash2, Eye, Pencil } from "lucide-react"
import Link from "next/link"
import { deleteTransaction } from "@/app/actions/transaction"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Transaction {
    id: string
    description: string
    amount: number
    status: string
    date: string
    type: string
    saleId?: string | null
}

interface RecentTransactionsProps {
    data: Transaction[]
    className?: string
}

export function RecentTransactions({ data, className }: RecentTransactionsProps) {
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

    const handleDelete = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir esta transação?")) {
            const result = await deleteTransaction(id)
            if (result.success) {
                toast.success("Transação excluída")
                router.refresh()
            } else {
                toast.error("Erro ao excluir")
            }
        }
    }

    return (
        <Card className={className}>
            <CardHeader>
                <div className="space-y-1">
                    <CardTitle className="text-xl">Transações Recentes</CardTitle>
                    <CardDescription>Últimas movimentações financeiras.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                            <TableHead className="text-right">Data</TableHead>
                            <TableHead className="text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center">Nenhuma transação encontrada.</TableCell>
                            </TableRow>
                        ) : (
                            data.map((transaction) => {
                                // Se a transação veio de uma venda, linka ao cupom fiscal
                                const detailHref = transaction.saleId
                                    ? `/dashboard/vendas/${transaction.saleId}`
                                    : `/dashboard/financeiro/transacoes/${transaction.id}`

                                return (
                                    <TableRow
                                        key={transaction.id}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => router.push(detailHref)}
                                    >
                                        <TableCell>
                                            <div className="font-medium">{transaction.description}</div>
                                        </TableCell>
                                        <TableCell className={`text-right font-medium ${transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={transaction.status === 'paid' ? 'default' : 'secondary'}>
                                                {transaction.status === 'paid' ? 'Pago' : 'Pendente'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatDate(transaction.date)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" asChild>
                                                    <Link href={detailHref}>
                                                        {transaction.saleId ? (
                                                            <Eye className="h-4 w-4" />
                                                        ) : (
                                                            <Pencil className="h-4 w-4" />
                                                        )}
                                                    </Link>
                                                </Button>
                                                {!transaction.saleId && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                                        onClick={() => handleDelete(transaction.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            }))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
