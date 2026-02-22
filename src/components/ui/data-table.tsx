"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    SortingState,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

import { Input } from "@/components/ui/input"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    pagination?: {
        page: number
        pageSize: number
        total: number
    }
    searchKey?: string // Kept for backward compat or future client-side
    enableSearch?: boolean // New: enable server-side search input
    searchPlaceholder?: string
}

export function DataTable<TData, TValue>({
    columns,
    data,
    pagination,
    enableSearch,
    searchPlaceholder = "Filtrar...",
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const router = useRouter()
    const searchParams = useSearchParams()

    // Search state
    const initialSearch = searchParams.get("search") || ""
    const [searchTerm, setSearchTerm] = React.useState(initialSearch)

    // Debounce search update
    React.useEffect(() => {
        if (!enableSearch) return

        const timer = setTimeout(() => {
            if (searchTerm !== initialSearch) {
                const params = new URLSearchParams(searchParams.toString())
                if (searchTerm) {
                    params.set("search", searchTerm)
                } else {
                    params.delete("search")
                }
                params.set("page", "1") // Reset to first page on search
                router.push(`?${params.toString()}`)
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [searchTerm, router, searchParams, enableSearch, initialSearch])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
        },
        manualPagination: !!pagination,
        pageCount: pagination ? Math.ceil(pagination.total / pagination.pageSize) : undefined,
    })

    const updatePage = (newPage: number) => {
        if (!pagination) return

        const params = new URLSearchParams(searchParams.toString())
        params.set("page", newPage.toString())
        router.push(`?${params.toString()}`)
    }

    const updatePageSize = (newPageSize: number) => {
        if (!pagination) return

        const params = new URLSearchParams(searchParams.toString())
        params.set("pageSize", newPageSize.toString())
        params.set("page", "1") // Reset to first page
        router.push(`?${params.toString()}`)
    }

    const currentPage = pagination?.page || 1
    const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1
    const startRow = pagination ? (currentPage - 1) * pagination.pageSize + 1 : 1
    const endRow = pagination ? Math.min(currentPage * pagination.pageSize, pagination.total) : data.length

    return (
        <div className="space-y-4">
            {enableSearch && (
                <div className="flex items-center py-4">
                    <Input
                        placeholder={searchPlaceholder}
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="max-w-sm"
                    />
                </div>
            )}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    Nenhum resultado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {pagination && pagination.total > 0 && (
                <div className="flex items-center justify-between px-2">
                    <div className="flex-1 text-sm text-muted-foreground">
                        Mostrando {startRow} a {endRow} de {pagination.total} resultado(s)
                    </div>
                    <div className="flex items-center space-x-6 lg:space-x-8">
                        <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium">Linhas por página</p>
                            <Select
                                value={pagination.pageSize.toString()}
                                onValueChange={(value) => updatePageSize(Number(value))}
                            >
                                <SelectTrigger className="h-8 w-[70px]">
                                    <SelectValue placeholder={pagination.pageSize} />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[10, 20, 50, 100].map((pageSize) => (
                                        <SelectItem key={pageSize} value={pageSize.toString()}>
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                            Página {currentPage} de {totalPages}
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 lg:flex"
                                onClick={() => updatePage(1)}
                                disabled={currentPage === 1}
                            >
                                <span className="sr-only">Ir para primeira página</span>
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => updatePage(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                <span className="sr-only">Ir para página anterior</span>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => updatePage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                <span className="sr-only">Ir para próxima página</span>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="hidden h-8 w-8 p-0 lg:flex"
                                onClick={() => updatePage(totalPages)}
                                disabled={currentPage === totalPages}
                            >
                                <span className="sr-only">Ir para última página</span>
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
