import { Metadata } from "next"
import { CustomersTable } from "./customers-table"
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
        <div className="h-full flex-1 flex-col space-y-8 p-4 md:p-8 flex">
            <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
                    <p className="text-muted-foreground">
                        Visualize e gerencie seus clientes com facilidade.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button asChild className="shadow-sm">
                        <Link href="/dashboard/cadastros/clientes/novo">
                            <Plus className="mr-2 h-4 w-4" /> Novo Cliente
                        </Link>
                    </Button>
                    <ExportCsvButton data={customers} filename="clientes" />
                </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm">
                <CustomersTable
                    data={customers}
                    total={total}
                    page={filters.page}
                    pageSize={filters.pageSize}
                />
            </div>
        </div>
    )
}
