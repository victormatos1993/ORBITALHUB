"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, Factory, Package, Hammer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ActionsCell } from "./actions-cell"

import { Supplier } from "@prisma/client"

const SUPPLIER_TYPE_MAP: Record<string, { label: string; color: string; icon: typeof Package }> = {
    MATERIAL_INTERNO: { label: "Material Interno", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Factory },
    PRODUTO: { label: "Produto", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: Package },
    MATERIA_PRIMA: { label: "Matéria Prima", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Hammer },
}

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
        accessorKey: "supplierType",
        header: "Categoria",
        cell: ({ row }) => {
            const type = row.getValue("supplierType") as string | null
            if (!type) return <span className="text-muted-foreground">—</span>
            const types = type.split(",").filter(Boolean)
            const infos = types.map(t => SUPPLIER_TYPE_MAP[t]).filter(Boolean)
            if (infos.length === 0) return <span className="text-muted-foreground">—</span>
            return (
                <div className="flex flex-wrap gap-1">
                    {infos.map((info, i) => {
                        const Icon = info.icon
                        return (
                            <Badge key={i} variant="outline" className={`gap-1 text-xs ${info.color}`}>
                                <Icon className="h-3 w-3" />
                                {info.label}
                            </Badge>
                        )
                    })}
                </div>
            )
        },
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
