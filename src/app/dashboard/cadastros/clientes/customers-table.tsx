"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns, Customer } from "./columns"
import { useRouter } from "next/navigation"

interface CustomersTableProps {
    data: Customer[]
    total: number
    page: number
    pageSize: number
}

export function CustomersTable({ data, total, page, pageSize }: CustomersTableProps) {
    const router = useRouter()

    return (
        <DataTable
            data={data}
            columns={columns}
            enableSearch
            searchPlaceholder="Pesquisar por nome, email ou documento..."
            onRowClick={(customer) => router.push(`/dashboard/cadastros/clientes/${customer.id}`)}
            pagination={{
                page,
                pageSize,
                total
            }}
        />
    )
}
