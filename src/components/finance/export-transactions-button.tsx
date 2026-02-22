"use client"

import { useState } from "react"
import { Download, FileSpreadsheet, FileText } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import Papa from "papaparse"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Transaction {
    id: string
    description: string
    amount: number
    type: string
    status: string
    date: string
    categoryId?: string | null
}

interface ExportTransactionsButtonProps {
    transactions: Transaction[]
}

export function ExportTransactionsButton({ transactions }: ExportTransactionsButtonProps) {
    const [isExporting, setIsExporting] = useState(false)

    const formatDataForExport = () => {
        return transactions.map(t => ({
            "Descrição": t.description,
            "Valor": `R$ ${t.amount.toFixed(2).replace('.', ',')}`,
            "Tipo": t.type === 'income' ? 'Receita' : 'Despesa',
            "Status": t.status === 'paid' ? 'Pago' : 'Pendente',
            "Data": t.date.split('-').reverse().join('/'), // Convert YYYY-MM-DD to DD/MM/YYYY
        }))
    }

    const exportToCSV = () => {
        setIsExporting(true)
        try {
            const data = formatDataForExport()
            const csv = Papa.unparse(data, {
                delimiter: ";",
                header: true
            })

            const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)

            link.setAttribute('href', url)
            link.setAttribute('download', `transacoes_${new Date().toISOString().split('T')[0]}.csv`)
            link.style.visibility = 'hidden'

            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            toast.success('Exportado para CSV com sucesso!')
        } catch (error) {
            toast.error('Erro ao exportar para CSV')
            console.error(error)
        } finally {
            setIsExporting(false)
        }
    }

    const exportToExcel = () => {
        setIsExporting(true)
        try {
            const data = formatDataForExport()
            const worksheet = XLSX.utils.json_to_sheet(data)
            const workbook = XLSX.utils.book_new()

            // Set column widths
            worksheet['!cols'] = [
                { wch: 30 }, // Descrição
                { wch: 15 }, // Valor
                { wch: 10 }, // Tipo
                { wch: 10 }, // Status
                { wch: 12 }, // Data
            ]

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Transações')
            XLSX.writeFile(workbook, `transacoes_${new Date().toISOString().split('T')[0]}.xlsx`)

            toast.success('Exportado para Excel com sucesso!')
        } catch (error) {
            toast.error('Erro ao exportar para Excel')
            console.error(error)
        } finally {
            setIsExporting(false)
        }
    }

    if (transactions.length === 0) {
        return null
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting}>
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? "Exportando..." : "Exportar"}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Formato de exportação</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportToCSV} disabled={isExporting}>
                    <FileText className="mr-2 h-4 w-4" />
                    Exportar como CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToExcel} disabled={isExporting}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Exportar como Excel
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
