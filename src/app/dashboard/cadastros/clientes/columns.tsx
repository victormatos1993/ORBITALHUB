"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ActionsCell } from "./actions-cell"

export type Customer = {
    id: string
    name: string
    email: string | null
    phone: string | null
    document: string | null
    city: string | null
    state: string | null
    createdAt: Date
    updatedAt: Date
    lastSaleDate?: Date | null
}

export const columns: ColumnDef<Customer>[] = [
    {
        accessorKey: "name",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="-ml-4 hover:bg-transparent"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Cliente
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const name = row.getValue("name") as string
            const email = row.original.email
            return (
                <div className="flex flex-col">
                    <span className="font-medium text-foreground leading-none">{name}</span>
                    {email && (
                        <span className="text-xs text-muted-foreground mt-1 md:hidden">
                            {email}
                        </span>
                    )}
                </div>
            )
        }
    },
    {
        accessorKey: "email",
        header: () => <div className="hidden md:block">Email</div>,
        cell: ({ row }) => (
            <div className="hidden md:block">
                {row.getValue("email") || "-"}
            </div>
        ),
    },
    {
        accessorKey: "phone",
        header: "Telefone",
        cell: ({ row }) => {
            const phone = row.getValue("phone") as string
            return (
                <div className="text-sm">
                    {phone || "-"}
                </div>
            )
        },
    },
    {
        accessorKey: "document",
        header: () => <div className="hidden lg:block">Documento</div>,
        cell: ({ row }) => (
            <div className="hidden lg:block text-sm text-muted-foreground">
                {row.getValue("document") || "-"}
            </div>
        ),
    },
    {
        id: "location",
        header: () => <div className="hidden md:block">Cidade/UF</div>,
        cell: ({ row }) => {
            const city = row.original.city
            const state = row.original.state
            if (!city && !state) return <span className="hidden md:block">-</span>
            return (
                <div className="hidden md:block text-sm text-muted-foreground">
                    {`${city || ''}${city && state ? ' / ' : ''}${state || ''}`}
                </div>
            )
        },
    },
    {
        accessorKey: "lastSaleDate",
        header: ({ column }) => {
            return (
                <div className="hidden sm:block">
                    <Button
                        variant="ghost"
                        className="-ml-4 hover:bg-transparent"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Última Compra
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            )
        },
        cell: ({ row }) => {
            const date = row.original.lastSaleDate
            if (!date) return <span className="hidden sm:block">-</span>
            return (
                <div className="hidden sm:block text-sm">
                    {new Date(date).toLocaleDateString('pt-BR')}
                </div>
            )
        }
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div onClick={(e) => e.stopPropagation()}>
                <ActionsCell customer={row.original} />
            </div>
        ),
    },
]
