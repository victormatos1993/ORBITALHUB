"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
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
import { deleteProduct } from "@/app/actions/product"
import { toast } from "sonner"

export type Product = {
    id: string
    name: string
    description: string | null
    price: number
    averageCost: number
    stockQuantity: number
    manageStock: boolean
    ncm: string | null
    sku: string | null
    createdAt: Date
    updatedAt: Date
}

// Contexto compartilhado para abrir o modal de edição a partir da tabela
type EditCallback = (product: Product) => void
let _onEdit: EditCallback | null = null

export function registerEditCallback(fn: EditCallback) { _onEdit = fn }

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
            <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => _onEdit?.(product)}
                    className="flex items-center cursor-pointer gap-2"
                >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-600 focus:text-red-600 cursor-pointer gap-2"
                >
                    <Trash className="h-3.5 w-3.5" /> Excluir
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export const columns: ColumnDef<Product>[] = [
    { accessorKey: "name", header: "Nome" },
    { accessorKey: "sku", header: "SKU", cell: ({ row }) => row.getValue("sku") || "-" },
    { accessorKey: "stockQuantity", header: "Estoque" },
    {
        accessorKey: "price",
        header: "Preço Venda",
        cell: ({ row }) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(row.getValue("price"))),
    },
    {
        accessorKey: "averageCost",
        header: "Custo Médio",
        cell: ({ row }) => {
            const cost = Number(row.original.averageCost)
            return cost > 0
                ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cost)
                : "—"
        },
    },
    {
        id: "margin",
        header: "Margem",
        cell: ({ row }) => {
            const price = Number(row.original.price)
            const cost = Number(row.original.averageCost)
            if (cost <= 0 || price <= 0) return "—"
            const margin = ((price - cost) / price) * 100
            return (
                <span className={margin >= 0 ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
                    {margin.toFixed(1)}%
                </span>
            )
        },
    },
    { accessorKey: "ncm", header: "NCM", cell: ({ row }) => row.getValue("ncm") || "-" },
    { id: "actions", cell: ({ row }) => <ActionsCell product={row.original} /> },
]
