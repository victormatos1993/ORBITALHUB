"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { useRouter } from "next/navigation"
import { Supplier } from "@prisma/client"

interface SuppliersTableProps {
    data: Supplier[]
    total: number
    page: number
    pageSize: number
}

export function SuppliersTable({ data, total, page, pageSize }: SuppliersTableProps) {
    const router = useRouter()

    return (
        <DataTable
            data={data}
            columns={columns}
            enableSearch
            searchPlaceholder="Pesquisar por nome, email ou documento..."
            onRowClick={(supplier) => router.push(`/dashboard/cadastros/fornecedores/${supplier.id}`)}
            pagination={{
                page,
                pageSize,
                total
            }}
        />
    )
}
