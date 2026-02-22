"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { exportToCSV } from "@/lib/utils"

interface ExportCsvButtonProps {
    data: any[]
    filename: string
    className?: string
}

export function ExportCsvButton({ data, filename, className }: ExportCsvButtonProps) {
    return (
        <Button
            variant="outline"
            className={className}
            onClick={() => exportToCSV(data, filename)}
            disabled={!data || data.length === 0}
        >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
        </Button>
    )
}
