import { Metadata } from "next"
import { columns } from "./columns"
import { DataTable } from "@/components/ui/data-table"
import { ExportCsvButton } from "@/components/ui/export-csv-button"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { getCustomers } from "@/app/actions/customer"

export const metadata: Metadata = {
    title: "Clientes | Orbital Hub",
    description: "Gerencie seus clientes",
}

interface SearchParams {
    search?: string
    page?: string
    pageSize?: string
}

export default async function CustomersPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>
}) {
    const params = await searchParams

    const filters = {
        search: params.search,
        page: params.page ? parseInt(params.page) : 1,
        pageSize: params.pageSize ? parseInt(params.pageSize) : 20,
    }

    const { customers, total } = await getCustomers(filters)

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
                    <p className="text-muted-foreground">
                        Visualize e gerencie seus clientes.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button asChild>
                        <Link href="/dashboard/cadastros/clientes/novo">
                            <Plus className="mr-2 h-4 w-4" /> Novo Cliente
                        </Link>
                    </Button>
                    <ExportCsvButton data={customers} filename="clientes" />
                </div>
            </div>

            <DataTable
                data={customers}
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
