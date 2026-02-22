"use client"

import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PrintButton() {
    return (
        <Button onClick={() => {
            if (typeof window !== "undefined") window.print()
        }}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir OS
        </Button>
    )
}
