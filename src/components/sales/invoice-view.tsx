
"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Printer, ArrowLeft, DownloadCloud } from "lucide-react"

import jsPDF from "jspdf"
import html2canvas from "html2canvas"

import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"

// Types need to be defined or imported matching what getSale returns
interface InvoiceViewProps {
    sale: any // Using any for simplicity now, but ideally should match the Prisma return type
    company?: any // Allow passing company data
}

export function InvoiceView({ sale, company }: InvoiceViewProps) {
    const router = useRouter()

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between no-print">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                    </Button>
                    <h2 className="text-3xl font-bold tracking-tight">Detalhes da Venda</h2>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        onClick={async () => {
                            const element = document.getElementById('invoice-content')
                            if (!element) return

                            // Esconde a parte "no-print" do layout para a screenshot (se não quisermos botões vazando, embora o id="invoice-content" isole)
                            const canvas = await html2canvas(element, {
                                scale: 2,
                                useCORS: true,
                                backgroundColor: "#ffffff"
                            })

                            const imgData = canvas.toDataURL('image/png')
                            const pdf = new jsPDF({
                                orientation: "portrait",
                                unit: "mm",
                                format: "a4"
                            })

                            const pdfWidth = pdf.internal.pageSize.getWidth()
                            const pdfHeight = (canvas.height * pdfWidth) / canvas.width

                            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
                            pdf.save(`Venda_${sale.id.slice(-6).toUpperCase()}.pdf`)
                        }}
                    >
                        <DownloadCloud className="mr-2 h-4 w-4" />
                        Gerar PDF
                    </Button>
                    <Button onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                    </Button>
                </div>
            </div>

            <div className="mx-auto max-w-4xl bg-white p-8 print:p-0" id="invoice-content">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between border-b pb-8">
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wider">Nota de Venda</h1>
                        <p className="text-sm text-muted-foreground">#{sale.id.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-bold">{company?.name || company?.tradingName || "Empresa Não Cadastrada"}</div>
                        <div className="text-sm text-muted-foreground">{company?.document ? `CNPJ/CPF: ${company.document}` : "CNPJ/CPF Não Informado"}</div>
                        <div className="text-sm text-muted-foreground">
                            {company?.address ? `${company.address}${company.number ? `, ${company.number}` : ''} - ${company.city || ''}/${company.state || ''}` : "Endereço Não Informado"}
                        </div>
                    </div>
                </div>

                {/* Cliente e Detalhes */}
                <div className="mb-8 grid grid-cols-2 gap-8">
                    <div>
                        <h3 className="mb-2 font-semibold text-gray-900">Cliente</h3>
                        <div className="space-y-1 text-sm text-gray-600">
                            <p className="font-medium text-gray-900">{sale.customer?.name || "Cliente Não Identificado"}</p>
                            {sale.customer?.document && <p>CPF/CNPJ: {sale.customer.document}</p>}
                            {sale.customer?.email && <p>{sale.customer.email}</p>}
                            {sale.customer?.phone && <p>{sale.customer.phone}</p>}
                            {sale.customer?.address && (
                                <p>
                                    {sale.customer.address}, {sale.customer.number}
                                    <br />
                                    {sale.customer.neighborhood} - {sale.customer.city}/{sale.customer.state}
                                    <br />
                                    CEP: {sale.customer.zipCode}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <h3 className="mb-2 font-semibold text-gray-900">Detalhes</h3>
                        <div className="space-y-1 text-sm text-gray-600">
                            <p><span className="font-medium">Data:</span> {format(new Date(sale.date), "dd/MM/yyyy HH:mm")}</p>
                            <p><span className="font-medium">Status:</span> {sale.status}</p>
                        </div>
                    </div>
                </div>

                {/* Itens */}
                <Card className="mb-8 border-none shadow-none print:border print:shadow-none">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produto</TableHead>
                                    <TableHead className="text-right">Qtd</TableHead>
                                    <TableHead className="text-right">Preço Unit.</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sale.items.map((item: any) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.product.name}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">
                                            {new Intl.NumberFormat("pt-BR", {
                                                style: "currency",
                                                currency: "BRL",
                                            }).format(Number(item.unitPrice))}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {new Intl.NumberFormat("pt-BR", {
                                                style: "currency",
                                                currency: "BRL",
                                            }).format(Number(item.totalPrice))}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Totais */}
                <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span>
                                {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                }).format(Number(sale.items.reduce((acc: number, item: any) => acc + Number(item.totalPrice), 0)))}
                            </span>
                        </div>
                        {sale.shippingCost && Number(sale.shippingCost) > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Frete ({sale.carrier?.name || "Transportadora"}):</span>
                                <span>
                                    {new Intl.NumberFormat("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                    }).format(Number(sale.shippingCost))}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between border-t pt-2 text-lg font-bold">
                            <span>Total:</span>
                            <span>
                                {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                }).format(Number(sale.totalAmount))}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Rodapé da Impressão */}
                <div className="mt-16 hidden border-t pt-4 text-center text-xs text-muted-foreground print:block">
                    <p>Documento gerado eletronicamente em {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 20mm;
                    }
                    body {
                        visibility: hidden;
                    }
                    .no-print {
                        display: none !important;
                    }
                    #invoice-content, #invoice-content * {
                        visibility: visible;
                    }
                    #invoice-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                    }
                }
            `}</style>
        </div>
    )
}
