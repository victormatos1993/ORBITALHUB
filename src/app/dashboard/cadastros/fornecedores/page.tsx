import { Metadata } from "next"
import { columns } from "./columns"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { getSuppliers } from "@/app/actions/supplier"

export const metadata: Metadata = {
    title: "Fornecedores | Orbital Hub",
    description: "Gerencie seus fornecedores",
}

interface SearchParams {
    search?: string
    page?: string
    pageSize?: string
}

export default async function SuppliersPage({
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

    const { suppliers, total } = await getSuppliers(filters)

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Fornecedores</h2>
                    <p className="text-muted-foreground">
                        Visualize e gerencie seus fornecedores.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button asChild>
                        <Link href="/dashboard/cadastros/fornecedores/novo">
                            <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
                        </Link>
                    </Button>
                </div>
            </div>

            <DataTable
                data={suppliers}
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
