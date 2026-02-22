"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Hash, Printer, Mail, Phone, CreditCard, Send } from "lucide-react"

// Types
type QuoteItem = {
    id: string
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
}

type QuoteData = {
    id: string
    number: number
    clientName: string
    clientEmail: string | null
    clientPhone: string | null
    status: string
    totalAmount: number
    discount: number
    notes: string | null
    validUntil: Date | string | null
    paymentMethod: string | null
    paymentType: string | null
    installments: number | null
    createdAt: Date | string
    items: QuoteItem[]
}

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Rascunho",
    SENT: "Enviado",
    APPROVED: "Aprovado",
    REJECTED: "Rejeitado",
    EXPIRED: "Expirado"
}

const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const formatDateBR = (date: any) => {
    if (!date) return ''
    try {
        const d = new Date(date)
        // Adjust for timezone issues if passing dates directly
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC'
        }).format(d)
    } catch { return '' }
}

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        DRAFT: "bg-slate-100 text-slate-700",
        SENT: "bg-blue-100 text-blue-700",
        APPROVED: "bg-emerald-100 text-emerald-700",
        REJECTED: "bg-red-100 text-red-700",
        EXPIRED: "bg-orange-100 text-orange-700"
    }

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.DRAFT}`}>
            {STATUS_LABELS[status] || status}
        </span>
    )
}

interface ViewQuoteDialogProps {
    viewQuote: QuoteData | null
    setViewQuote: (quote: QuoteData | null) => void
    company: any
}

export function ViewQuoteDialog({ viewQuote, setViewQuote, company }: ViewQuoteDialogProps) {
    if (!viewQuote) return null

    return (
        <Dialog open={!!viewQuote} onOpenChange={open => { if (!open) setViewQuote(null) }}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                            <Hash className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <span>Orçamento #{String(viewQuote.number).padStart(4, "0")}</span>
                            <div className="mt-1">
                                <StatusBadge status={viewQuote.status} />
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>
                <div id="quote-printable-content" className="space-y-4 py-4 px-2 bg-background relative">
                    <div className="flex justify-end gap-2" data-html2canvas-ignore>
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl gap-2 text-xs"
                            onClick={() => {
                                const printWindow = window.open('', '_blank')
                                if (!printWindow || !viewQuote) return
                                const itemsHtml = viewQuote.items.map(item =>
                                    `<tr>
                                        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px">${item.description}</td>
                                        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:13px">${item.quantity}</td>
                                        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px">${formatBRL(item.unitPrice)}</td>
                                        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;font-weight:600">${formatBRL(item.totalPrice)}</td>
                                    </tr>`
                                ).join('')

                                const contactInfo = [
                                    viewQuote.clientEmail ? `E-mail: ${viewQuote.clientEmail}` : '',
                                    viewQuote.clientPhone ? `Telefone: ${viewQuote.clientPhone}` : '',
                                ].filter(Boolean).join(' &nbsp;|&nbsp; ')

                                printWindow.document.write(`
                                    <!DOCTYPE html>
                                    <html><head><title>Orçamento #${String(viewQuote.number).padStart(4, '0')}</title>
                                    <style>
                                        * { margin: 0; padding: 0; box-sizing: border-box; }
                                        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a2e; padding: 40px; max-width: 800px; margin: 0 auto; }
                                        .company-header { text-align: right; margin-bottom: 24px; }
                                        .company-header h2 { font-size: 18px; color: #1e293b; margin-bottom: 4px; }
                                        .company-header p { font-size: 12px; color: #64748b; margin-bottom: 2px; }
                                        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #3b82f6; }
                                        .header h1 { font-size: 22px; color: #1e40af; }
                                        .header .number { font-size: 14px; color: #64748b; margin-top: 4px; }
                                        .header .status { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; background: #dbeafe; color: #1e40af; }
                                        .info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-bottom: 24px; font-size: 13px; }
                                        .info .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
                                        .info .value { font-weight: 500; }
                                        .contact { font-size: 12px; color: #64748b; margin-bottom: 24px; padding: 8px 12px; background: #f8fafc; border-radius: 6px; }
                                        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
                                        th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; font-weight: 600; }
                                        th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
                                        th:nth-child(2) { text-align: center; }
                                        .totals { display: flex; justify-content: flex-end; margin-bottom: 24px; }
                                        .totals-inner { width: 240px; text-align: right; }
                                        .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #475569; }
                                        .totals-row.total { font-size: 18px; font-weight: 700; color: #1e40af; border-top: 2px solid #e2e8f0; padding-top: 8px; margin-top: 4px; }
                                        .totals-row.discount { color: #dc2626; }
                                        .notes { background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
                                        .notes h3 { font-size: 12px; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
                                        .notes p { font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
                                        .footer { text-align: center; font-size: 11px; color: #94a3b8; padding-top: 20px; border-top: 1px solid #e2e8f0; }
                                        @media print { body { padding: 20px; } }
                                    </style></head><body>
                                    ${company ? `
                                    <div class="company-header">
                                        <h2>${company.name || company.tradingName || 'Empresa'}</h2>
                                        ${company.document ? `<p>CNPJ/CPF: ${company.document}</p>` : ''}
                                        ${company.address ? `<p>${company.address}${company.number ? `, ${company.number}` : ''} - ${company.city || ''}/${company.state || ''}</p>` : ''}
                                        ${company.phone ? `<p>Tel: ${company.phone}</p>` : ''}
                                        ${company.email ? `<p>${company.email}</p>` : ''}
                                    </div>
                                    ` : ''}
                                    <div class="header">
                                        <div>
                                            <h1>ORÇAMENTO</h1>
                                            <div class="number">#${String(viewQuote.number).padStart(4, '0')}</div>
                                        </div>
                                        <div class="status">${STATUS_LABELS[viewQuote.status] || viewQuote.status}</div>
                                    </div>
                                    <div class="info">
                                        <div><div class="label">Cliente</div><div class="value">${viewQuote.clientName}</div></div>
                                        <div><div class="label">Data de emissão</div><div class="value">${formatDateBR(viewQuote.createdAt)}</div></div>
                                        ${viewQuote.validUntil ? `<div><div class="label">Válido até</div><div class="value">${formatDateBR(viewQuote.validUntil)}</div></div>` : ''}
                                        ${(viewQuote.paymentMethod || viewQuote.paymentType || viewQuote.installments) ? `<div><div class="label">Pagamento</div><div class="value">${viewQuote.paymentMethod || 'Pagamento'}: ${viewQuote.paymentType === 'INSTALLMENT' && viewQuote.installments ? `${viewQuote.installments}x de ${formatBRL(viewQuote.totalAmount / viewQuote.installments)}` : 'À vista'}</div></div>` : ''}
                                    </div>
                                    ${contactInfo ? `<div class="contact">${contactInfo}</div>` : ''}
                                    <table>
                                        <thead><tr><th>Descrição</th><th>Qtd</th><th>Unitário</th><th>Total</th></tr></thead>
                                        <tbody>${itemsHtml}</tbody>
                                    </table>
                                    <div class="totals"><div class="totals-inner">
                                        ${viewQuote.discount > 0 ? `
                                            <div class="totals-row"><span>Subtotal</span><span>${formatBRL(viewQuote.totalAmount + viewQuote.discount)}</span></div>
                                            <div class="totals-row discount"><span>Desconto</span><span>-${formatBRL(viewQuote.discount)}</span></div>
                                        ` : ''}
                                        <div class="totals-row total"><span>Total</span><span>${formatBRL(viewQuote.totalAmount)}</span></div>
                                    </div></div>
                                    ${viewQuote.notes ? `<div class="notes"><h3>Observações</h3><p>${viewQuote.notes}</p></div>` : ''}
                                    <div class="footer">Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                    </body></html>
                                `)
                                printWindow.document.close()
                                printWindow.focus()
                                setTimeout(() => printWindow.print(), 300)
                            }}
                        >
                            <Printer className="h-3.5 w-3.5" />
                            Imprimir / PDF
                        </Button>
                    </div>

                    {/* Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground text-xs mb-0.5">Cliente</p>
                            <p className="font-medium">{viewQuote.clientName}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs mb-0.5">Data</p>
                            <p className="font-medium">{formatDateBR(viewQuote.createdAt)}</p>
                        </div>
                        {viewQuote.clientEmail && (
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-muted-foreground text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> E-mail</p>
                                    <a
                                        href={`mailto:${viewQuote.clientEmail}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Enviar E-mail"
                                        className="opacity-60 hover:opacity-100 transition-opacity"
                                    >
                                        <Send className="h-3 w-3 text-primary" />
                                    </a>
                                </div>
                                <p className="font-medium">{viewQuote.clientEmail}</p>
                            </div>
                        )}
                        {viewQuote.clientPhone && (
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-muted-foreground text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</p>
                                    <a
                                        href={`https://wa.me/55${viewQuote.clientPhone.replace(/\D/g, "")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Conversar no WhatsApp"
                                        className="opacity-60 hover:opacity-100 transition-opacity"
                                    >
                                        <Send className="h-3 w-3 text-green-600" />
                                    </a>
                                </div>
                                <p className="font-medium">{viewQuote.clientPhone}</p>
                            </div>
                        )}
                        {viewQuote.validUntil && (
                            <div>
                                <p className="text-muted-foreground text-xs mb-0.5">Válido até</p>
                                <p className="font-medium">{formatDateBR(viewQuote.validUntil)}</p>
                            </div>
                        )}
                        {(viewQuote.paymentMethod || viewQuote.paymentType || viewQuote.installments) && (
                            <div>
                                <p className="text-muted-foreground text-xs mb-0.5">Pagamento</p>
                                <p className="font-medium flex items-center gap-1.5">
                                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                                    {viewQuote.paymentMethod || "Pagamento"}:{" "}
                                    {viewQuote.paymentType === "INSTALLMENT" && viewQuote.installments
                                        ? `${viewQuote.installments}x de ${formatBRL(viewQuote.totalAmount / viewQuote.installments)}`
                                        : "À vista"
                                    }
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Items */}
                    <div className="rounded-xl border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent text-xs">
                                    <TableHead className="h-8">Descrição</TableHead>
                                    <TableHead className="h-8 w-[50px] text-center">Qtd</TableHead>
                                    <TableHead className="h-8 w-[100px] text-right">Unit.</TableHead>
                                    <TableHead className="h-8 w-[100px] text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {viewQuote.items.map((item, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="text-sm">{item.description}</TableCell>
                                        <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                                        <TableCell className="text-right text-sm">{formatBRL(item.unitPrice)}</TableCell>
                                        <TableCell className="text-right text-sm font-medium">{formatBRL(item.totalPrice)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-56 space-y-1 text-sm">
                            {viewQuote.discount > 0 && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>{formatBRL(viewQuote.totalAmount + viewQuote.discount)}</span>
                                    </div>
                                    <div className="flex justify-between text-red-500">
                                        <span>Desconto</span>
                                        <span>-{formatBRL(viewQuote.discount)}</span>
                                    </div>
                                </>
                            )}
                            <div className="flex justify-between pt-1 border-t font-bold text-lg">
                                <span>Total</span>
                                <span className="text-primary">{formatBRL(viewQuote.totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    {viewQuote.notes && (
                        <div className="rounded-xl bg-muted/50 p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
                            <p className="text-sm whitespace-pre-wrap">{viewQuote.notes}</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
