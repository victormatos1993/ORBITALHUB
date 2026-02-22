
import { getProducts } from "@/app/actions/product"
import { columns } from "./columns"
import { DataTable } from "@/components/ui/data-table"
import { ExportCsvButton } from "@/components/ui/export-csv-button"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function ProductsPage({
    searchParams,
}: {
    searchParams: { search?: string; page?: string }
}) {
    const page = Number(searchParams.page) || 1
    const { products, total } = await getProducts({
        search: searchParams.search,
        page,
        pageSize: 10
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Produtos e Serviços</h1>
                <div className="flex items-center space-x-2">
                    <Button asChild>
                        <Link href="/dashboard/cadastros/produtos/novo">
                            <Plus className="mr-2 h-4 w-4" /> Novo Produto
                        </Link>
                    </Button>
                    <ExportCsvButton data={products} filename="produtos" />
                </div>
            </div>

            <DataTable columns={columns} data={products} enableSearch searchPlaceholder="Filtrar por nome, SKU..." />
        </div>
    )
}
