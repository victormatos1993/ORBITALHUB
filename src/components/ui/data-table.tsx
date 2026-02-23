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
    getFilteredRowModel,
    ColumnFiltersState,
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
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    pagination?: {
        page: number
        pageSize: number
        total: number
    }
    searchKey?: string
    enableSearch?: boolean
    searchPlaceholder?: string
    onRowClick?: (row: TData) => void
    /** Função que extrai os campos pesquisáveis de cada linha como string */
    searchFields?: (row: TData) => string[]
}

export function DataTable<TData, TValue>({
    columns,
    data,
    pagination,
    enableSearch,
    searchPlaceholder = "Pesquisa",
    onRowClick,
    searchFields,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [localSearch, setLocalSearch] = React.useState("")
    const [isFocused, setIsFocused] = React.useState(false)
    const [showSuggestions, setShowSuggestions] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)

    const router = useRouter()
    const searchParams = useSearchParams()

    // Server-side search (URL)
    const initialSearch = searchParams.get("search") || ""
    const [searchTerm, setSearchTerm] = React.useState(initialSearch)

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
                params.set("page", "1")
                router.push(`?${params.toString()}`)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm, router, searchParams, enableSearch, initialSearch])

    // Filtragem local com base nos searchFields
    const filteredData = React.useMemo(() => {
        if (!localSearch.trim() || !searchFields) return data
        const term = localSearch.toLowerCase()
        return data.filter((row) =>
            searchFields(row).some((field) =>
                field?.toLowerCase().includes(term)
            )
        )
    }, [data, localSearch, searchFields])

    // Sugestões para dropdown
    const suggestions = React.useMemo(() => {
        if (!localSearch.trim() || !searchFields || localSearch.length < 1) return []
        const term = localSearch.toLowerCase()
        const matches: { label: string; row: TData }[] = []
        for (const row of data) {
            const fields = searchFields(row)
            for (const field of fields) {
                if (field?.toLowerCase().includes(term)) {
                    matches.push({ label: field, row })
                    break
                }
            }
            if (matches.length >= 6) break
        }
        return matches
    }, [data, localSearch, searchFields])

    const table = useReactTable({
        data: searchFields ? filteredData : data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting,
            columnFilters,
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
        params.set("page", "1")
        router.push(`?${params.toString()}`)
    }

    const currentPage = pagination?.page || 1
    const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1
    const startRow = pagination ? (currentPage - 1) * pagination.pageSize + 1 : 1
    const endRow = pagination ? Math.min(currentPage * pagination.pageSize, pagination.total) : data.length

    const handleSelectSuggestion = (row: TData) => {
        setShowSuggestions(false)
        if (onRowClick) onRowClick(row)
    }

    const handleClearSearch = () => {
        setLocalSearch("")
        setSearchTerm("")
        inputRef.current?.focus()
    }

    // Fechar sugestões ao clicar fora
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false)
                setIsFocused(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Highlight de texto
    const highlightMatch = (text: string, term: string) => {
        if (!term.trim()) return text
        const idx = text.toLowerCase().indexOf(term.toLowerCase())
        if (idx === -1) return text
        return (
            <>
                {text.slice(0, idx)}
                <mark className="bg-primary/20 text-primary font-semibold rounded-sm px-0.5">
                    {text.slice(idx, idx + term.length)}
                </mark>
                {text.slice(idx + term.length)}
            </>
        )
    }

    const activeSearch = searchFields ? localSearch : searchTerm
    const setActiveSearch = searchFields
        ? (v: string) => { setLocalSearch(v); setShowSuggestions(v.length > 0) }
        : (v: string) => setSearchTerm(v)

    return (
        <div className="space-y-4">
            {enableSearch && (
                <div className="flex items-center py-4 px-1" ref={containerRef}>
                    <div className="relative w-full max-w-sm">
                        {/* Label flutuante */}
                        <label
                            className={cn(
                                "absolute left-10 transition-all duration-200 pointer-events-none z-10 font-medium",
                                (isFocused || activeSearch)
                                    ? "top-1 text-[10px] text-primary"
                                    : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                            )}
                        >
                            {searchPlaceholder}
                        </label>

                        {/* Ícone lupa */}
                        <Search
                            className={cn(
                                "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200",
                                isFocused ? "text-primary" : "text-muted-foreground"
                            )}
                        />

                        {/* Input */}
                        <input
                            ref={inputRef}
                            type="text"
                            value={activeSearch}
                            onChange={(e) => setActiveSearch(e.target.value)}
                            onFocus={() => {
                                setIsFocused(true)
                                if (activeSearch.length > 0) setShowSuggestions(true)
                            }}
                            className={cn(
                                "w-full pt-5 pb-2 pl-10 pr-9 rounded-xl border bg-card text-sm text-foreground",
                                "outline-none ring-0 transition-all duration-200",
                                "placeholder-transparent",
                                isFocused
                                    ? "border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
                                    : "border-input hover:border-muted-foreground/50"
                            )}
                        />

                        {/* Botão limpar */}
                        {activeSearch && (
                            <button
                                onClick={handleClearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}

                        {/* Dropdown de sugestões */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
                                <div className="px-3 py-2 border-b border-border/50">
                                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                                        Sugestões
                                    </p>
                                </div>
                                <ul>
                                    {suggestions.map((s, i) => (
                                        <li
                                            key={i}
                                            onMouseDown={() => handleSelectSuggestion(s.row)}
                                            className="flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer hover:bg-primary/5 transition-colors group"
                                        >
                                            <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                            <span className="truncate">
                                                {highlightMatch(s.label, localSearch)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {filteredData.length > 0 && (
                                    <div className="px-3 py-2 border-t border-border/50 bg-muted/30">
                                        <p className="text-[11px] text-muted-foreground">
                                            {filteredData.length} resultado{filteredData.length !== 1 ? "s" : ""} encontrado{filteredData.length !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Sem resultados */}
                        {showSuggestions && localSearch.length > 0 && suggestions.length === 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 duration-150">
                                <div className="px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                                    <Search className="h-3.5 w-3.5 shrink-0" />
                                    <span>Nenhum resultado para <strong className="text-foreground">"{localSearch}"</strong></span>
                                </div>
                            </div>
                        )}
                    </div>
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
                                    onClick={() => onRowClick?.(row.original)}
                                    className={cn(
                                        onRowClick && "cursor-pointer hover:bg-muted/50 transition-colors"
                                    )}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-3 px-4">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    {localSearch ? (
                                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                            <Search className="h-6 w-6 opacity-40" />
                                            <span className="text-sm">Nenhum resultado para <strong className="text-foreground">"{localSearch}"</strong></span>
                                        </div>
                                    ) : (
                                        "Nenhum resultado."
                                    )}
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
