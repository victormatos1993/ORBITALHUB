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
import { Plus, Trash2, Pencil } from "lucide-react"
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
        // data comes as YYYY-MM-DD from action
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
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-xl">Transações Recentes</CardTitle>
                    <CardDescription>Últimas movimentações financeiras.</CardDescription>
                </div>
                <Button size="sm" asChild>
                    <Link href="/dashboard/financeiro/transacoes/novo">
                        <Plus className="mr-2 h-4 w-4" /> Nova
                    </Link>
                </Button>
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
                            data.map((transaction) => (
                                <TableRow key={transaction.id}>
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
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" asChild>
                                                <Link href={`/dashboard/financeiro/transacoes/${transaction.id}`}>
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                                onClick={() => handleDelete(transaction.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
