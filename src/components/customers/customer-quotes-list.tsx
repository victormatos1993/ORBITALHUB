"use client"

import { useState } from "react"
import { format } from "date-fns"
import { FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewQuoteDialog } from "@/components/quotes/view-quote-dialog"
import Link from "next/link"

interface CustomerQuotesListProps {
    quotes: any[]
    company: any
    customerName: string
    customerEmail?: string | null
    customerPhone?: string | null
}

export function CustomerQuotesList({ quotes, company, customerName, customerEmail, customerPhone }: CustomerQuotesListProps) {
    const [viewQuote, setViewQuote] = useState<any | null>(null)

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Orçamentos Abertos
                </CardTitle>
                <Link
                    href={`/dashboard/servicos/orcamentos?new=true&clientName=${encodeURIComponent(customerName)}&clientEmail=${encodeURIComponent(customerEmail || "")}&clientPhone=${encodeURIComponent(customerPhone || "")}`}
                    className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs"
                >
                    Novo Orçamento
                </Link>
            </CardHeader>
            <CardContent>
                {quotes.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">Nenhum orçamento encontrado.</div>
                ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {quotes.map((quote: any) => (
                            <button
                                key={quote.id}
                                onClick={() => setViewQuote(quote)}
                                className="w-full flex justify-between items-center text-left bg-muted/30 hover:bg-muted/50 transition-colors p-3 rounded-lg border"
                            >
                                <div>
                                    <div className="font-semibold text-sm">#{String(quote.number).padStart(4, "0")}</div>
                                    <div className="text-xs text-muted-foreground">{format(new Date(quote.createdAt), "dd/MM/yyyy")}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(quote.totalAmount))}</div>
                                    <div className="text-xs font-medium text-muted-foreground mt-0.5">{quote.status}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </CardContent>

            <ViewQuoteDialog
                viewQuote={viewQuote}
                setViewQuote={setViewQuote}
                company={company}
            />
        </Card>
    )
}
