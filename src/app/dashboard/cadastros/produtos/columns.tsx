"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { deleteProduct } from "@/app/actions/product"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export type Product = {
    id: string
    name: string
    description: string | null
    price: number
    stockQuantity: number
    manageStock: boolean
    ncm: string | null
    sku: string | null
    createdAt: Date
    updatedAt: Date
}

const ActionsCell = ({ product }: { product: Product }) => {
    const router = useRouter()

    const handleDelete = async () => {
        if (confirm("Tem certeza que deseja excluir este produto?")) {
            const result = await deleteProduct(product.id)
            if (result.success) {
                toast.success("Produto excluído com sucesso")
                router.refresh()
            } else {
                toast.error(result.error)
            }
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                    <Link href={`/dashboard/cadastros/produtos/${product.id}`} className="flex items-center cursor-pointer">
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600 cursor-pointer">
                    <Trash className="mr-2 h-4 w-4" />
                    Excluir
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export const columns: ColumnDef<Product>[] = [
    {
        accessorKey: "name",
        header: "Nome",
    },
    {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => row.getValue("sku") || "-",
    },
    {
        accessorKey: "stockQuantity",
        header: "Estoque",
    },
    {
        accessorKey: "price",
        header: "Preço",
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("price"))
            const formatted = new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
            }).format(amount)
            return formatted
        },
    },
    {
        accessorKey: "ncm",
        header: "NCM",
        cell: ({ row }) => row.getValue("ncm") || "-",
    },
    {
        id: "actions",
        cell: ({ row }) => <ActionsCell product={row.original} />,
    },
]
