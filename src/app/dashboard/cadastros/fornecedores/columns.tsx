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
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Nome
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
    },
    {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.getValue("email") || "-",
    },
    {
        accessorKey: "phone",
        header: "Telefone",
        cell: ({ row }) => row.getValue("phone") || "-",
    },
    {
        accessorKey: "document",
        header: "Documento",
        cell: ({ row }) => row.getValue("document") || "-",
    },
    {
        id: "location",
        header: "Localização",
        cell: ({ row }) => {
            const city = row.original.city
            const state = row.original.state
            if (!city && !state) return "-"
            return `${city || ''}${city && state ? ' / ' : ''}${state || ''}`
        },
    },
    {
        id: "actions",
        cell: ({ row }) => <ActionsCell supplier={row.original} />,
    },
]
