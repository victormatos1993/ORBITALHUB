"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ActionsCell } from "./actions-cell"

import { Supplier } from "@prisma/client"

export const columns: ColumnDef<Supplier>[] = [
    {
        accessorKey: "name",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    className="-ml-4 hover:bg-transparent"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Fornecedor
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
        cell: ({ row }) => (
            <div className="text-sm">
                {row.getValue("phone") || "-"}
            </div>
        ),
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
        id: "actions",
        cell: ({ row }) => (
            <div onClick={(e) => e.stopPropagation()}>
                <ActionsCell supplier={row.original} />
            </div>
        ),
    },
]
