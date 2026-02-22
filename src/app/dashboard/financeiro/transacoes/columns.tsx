"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ActionsCell } from "./actions-cell"

// This type is used to define the shape of our data.
export type Transaction = {
    id: string
    description: string
    amount: number
    type: string // "income" | "expense" but from DB acts as string
    status: string // "pending" | "paid"
    date: string
    categoryId?: string | null
    customerName?: string
    supplierName?: string
    categoryName?: string
}

export const columns: ColumnDef<Transaction>[] = [
    {
        accessorKey: "description",
        header: "Descrição",
        cell: ({ row }) => {
            const description = row.getValue("description") as string
            const categoryName = row.original.categoryName

            return (
                <div className="flex flex-col">
                    <span className="font-medium">{description}</span>
                    {categoryName && (
                        <span className="text-xs text-muted-foreground">{categoryName}</span>
                    )}
                </div>
            )
        }
    },
    {
        id: "contact",
        header: "Autor",
        cell: ({ row }) => {
            const customerName = row.original.customerName
            const supplierName = row.original.supplierName

            if (customerName) {
                return (
                    <div className="flex flex-col">
                        <span className="text-sm">{customerName}</span>
                        <span className="text-xs text-muted-foreground">Cliente</span>
                    </div>
                )
            }

            if (supplierName) {
                return (
                    <div className="flex flex-col">
                        <span className="text-sm">{supplierName}</span>
                        <span className="text-xs text-muted-foreground">Fornecedor</span>
                    </div>
                )
            }

            return <span className="text-muted-foreground">-</span>
        }
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string
            return (
                <Badge variant={status === 'paid' ? 'default' : 'secondary'}>
                    {status === 'paid' ? 'Pago' : status === 'pending' ? 'Pendente' : 'Falha'}
                </Badge>
            )
        }
    },
    {
        accessorKey: "type",
        header: "Tipo",
        cell: ({ row }) => {
            const type = row.getValue("type") as string
            return (
                <span className={type === 'income' ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                    {type === 'income' ? 'Receita' : 'Despesa'}
                </span>
            )
        }
    },
    {
        accessorKey: "amount",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Valor
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("amount"))
            const formatted = new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
            }).format(amount)

            return <div className="text-right font-medium">{formatted}</div>
        },
    },
    {
        accessorKey: "date",
        header: "Data",
        cell: ({ row }) => {
            const dateStr = row.getValue("date") as string
            if (!dateStr) return "-"
            const [year, month, day] = dateStr.split("-")
            return <div>{day}/{month}/{year}</div>
        }
    },
    {
        id: "actions",
        cell: ({ row }) => {
            return <ActionsCell transaction={row.original} />
        },
    },
]
