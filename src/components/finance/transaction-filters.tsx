"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { CalendarIcon, Search, X } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface Category {
    id: string
    name: string
    type: string
}

interface TransactionFiltersProps {
    categories: Category[]
}

export function TransactionFilters({ categories }: TransactionFiltersProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    const [search, setSearch] = useState(searchParams.get("search") || "")
    const [type, setType] = useState(searchParams.get("type") || "all")
    const [status, setStatus] = useState(searchParams.get("status") || "all")
    const [categoryId, setCategoryId] = useState(searchParams.get("categoryId") || "all")
    const [startDate, setStartDate] = useState<Date | undefined>(
        searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined
    )
    const [endDate, setEndDate] = useState<Date | undefined>(
        searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined
    )

    const updateFilters = () => {
        const params = new URLSearchParams()

        if (search) params.set("search", search)
        if (type !== "all") params.set("type", type)
        if (status !== "all") params.set("status", status)
        if (categoryId !== "all") params.set("categoryId", categoryId)
        if (startDate) params.set("startDate", format(startDate, "yyyy-MM-dd"))
        if (endDate) params.set("endDate", format(endDate, "yyyy-MM-dd"))

        startTransition(() => {
            router.push(`/dashboard/financeiro/transacoes?${params.toString()}`)
        })
    }

    const clearFilters = () => {
        setSearch("")
        setType("all")
        setStatus("all")
        setCategoryId("all")
        setStartDate(undefined)
        setEndDate(undefined)

        startTransition(() => {
            router.push("/dashboard/financeiro/transacoes")
        })
    }

    const hasActiveFilters = search || type !== "all" || status !== "all" || categoryId !== "all" || startDate || endDate

    // Filter categories based on selected type
    const filteredCategories = type === "all"
        ? categories
        : categories.filter(c => c.type.toLowerCase() === type)

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por descrição..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                updateFilters()
                            }
                        }}
                        className="pl-9"
                    />
                </div>

                {/* Type Filter */}
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="income">Receita</SelectItem>
                        <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                    </SelectContent>
                </Select>

                {/* Category Filter */}
                <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {filteredCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Start Date */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                "justify-start text-left font-normal",
                                !startDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "dd/MM/yyyy") : "Data inicial"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                {/* End Date */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                "justify-start text-left font-normal",
                                !endDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "dd/MM/yyyy") : "Data final"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <Button onClick={updateFilters} disabled={isPending}>
                    Aplicar Filtros
                </Button>
                {hasActiveFilters && (
                    <Button onClick={clearFilters} variant="outline" disabled={isPending}>
                        <X className="mr-2 h-4 w-4" />
                        Limpar Filtros
                    </Button>
                )}
            </div>
        </div>
    )
}
