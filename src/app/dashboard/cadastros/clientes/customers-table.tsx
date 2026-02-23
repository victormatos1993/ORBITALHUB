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
            searchPlaceholder="Pesquisa"
            searchFields={(customer) => [
                customer.name ?? "",
                customer.email ?? "",
                customer.phone ?? "",
                customer.document ?? "",
                customer.city ?? "",
                customer.state ?? "",
            ]}
            onRowClick={(customer) => router.push(`/dashboard/cadastros/clientes/${customer.id}`)}
            pagination={{
                page,
                pageSize,
                total
            }}
        />
    )
}
