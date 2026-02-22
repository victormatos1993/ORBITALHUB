import { Metadata } from "next"
import { SuppliersTable } from "./suppliers-table"
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
        <div className="h-full flex-1 flex-col space-y-8 p-4 md:p-8 flex">
            <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Fornecedores</h2>
                    <p className="text-muted-foreground">
                        Visualize e gerencie seus fornecedores e parceiros com facilidade.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button asChild className="shadow-sm">
                        <Link href="/dashboard/cadastros/fornecedores/novo">
                            <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm">
                <SuppliersTable
                    data={suppliers}
                    total={total}
                    page={filters.page}
                    pageSize={filters.pageSize}
                />
            </div>
        </div>
    )
}
