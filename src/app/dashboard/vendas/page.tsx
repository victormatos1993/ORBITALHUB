import { Metadata } from "next"
import { getSales } from "@/app/actions/sales"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { SaleActions } from "@/components/sales/sale-actions"
import { ExportCsvButton } from "@/components/ui/export-csv-button"

export const metadata: Metadata = {
    title: "Histórico de Vendas | Orbital Hub",
    description: "Visualize suas vendas",
}

export default async function SalesPage() {
    const { sales } = await getSales()

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Histórico de Vendas</h2>
                <div className="flex items-center space-x-2">
                    <Button asChild>
                        <Link href="/dashboard/vendas/pdv">
                            <Plus className="mr-2 h-4 w-4" /> Nova Venda (PDV)
                        </Link>
                    </Button>
                    <ExportCsvButton data={sales} filename="vendas" />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Vendas Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sales.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center">Nenhuma venda encontrada.</TableCell>
                                </TableRow>
                            ) : (
                                sales.map((sale) => (
                                    <TableRow key={sale.id}>
                                        <TableCell className="font-medium">#{sale.id.slice(-6).toUpperCase()}</TableCell>
                                        <TableCell>{format(new Date(sale.date), "dd/MM/yyyy")}</TableCell>
                                        <TableCell>{sale.customer?.name || "Cliente Não Identificado"}</TableCell>
                                        <TableCell>{sale.status}</TableCell>
                                        <TableCell>
                                            {new Intl.NumberFormat("pt-BR", {
                                                style: "currency",
                                                currency: "BRL",
                                            }).format(Number(sale.totalAmount))}
                                        </TableCell>
                                        <TableCell>
                                            <SaleActions saleId={sale.id} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
