import { Metadata } from "next"
import { columns } from "./columns"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { getTransactions } from "@/app/actions/transaction"
import { getCategories } from "@/app/actions/category"
import { TransactionFilters } from "@/components/finance/transaction-filters"
import { ExportTransactionsButton } from "@/components/finance/export-transactions-button"

export const metadata: Metadata = {
    title: "Transações | Orbital Hub",
    description: "Gerencie suas receitas e despesas",
}

interface SearchParams {
    search?: string
    type?: 'income' | 'expense'
    status?: 'paid' | 'pending'
    categoryId?: string
    startDate?: string
    endDate?: string
    page?: string
    pageSize?: string
}

export default async function TransactionsPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>
}) {
    const params = await searchParams

    // Parse filters from search params
    const filters = {
        search: params.search,
        type: params.type,
        status: params.status,
        categoryId: params.categoryId,
        startDate: params.startDate,
        endDate: params.endDate,
        page: params.page ? parseInt(params.page) : 1,
        pageSize: params.pageSize ? parseInt(params.pageSize) : 20,
    }

    const [{ transactions, total }, categories] = await Promise.all([
        getTransactions(filters),
        getCategories()
    ])

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Transações</h2>
                    <p className="text-muted-foreground">
                        Visualize e gerencie todas as suas transações financeiras.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <ExportTransactionsButton transactions={transactions} />
                    <Button asChild variant="outline">
                        <Link href="/dashboard/financeiro/contas-pagar">
                            <Plus className="mr-2 h-4 w-4" /> Nova Despesa
                        </Link>
                    </Button>
                </div>
            </div>

            <TransactionFilters categories={categories} />

            <DataTable
                data={transactions}
                columns={columns}
                pagination={{
                    page: filters.page,
                    pageSize: filters.pageSize,
                    total
                }}
            />
        </div>
    )
}
