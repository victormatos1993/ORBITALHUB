
"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Printer, ArrowLeft, DownloadCloud, Package, Wrench, CreditCard, Truck, Receipt, User, Calendar, Hash, BadgeCheck, Clock } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface InvoiceViewProps {
    sale: any
    company?: any
}

const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

const PAYMENT_LABELS: Record<string, string> = {
    PIX: "PIX",
    DINHEIRO: "Dinheiro",
    CREDITO: "Cartão de Crédito",
    DEBITO: "Cartão de Débito",
    VOUCHER: "Voucher",
    CHEQUE: "Cheque",
    CARNE: "Carnê",
    BOLETO: "Boleto",
}

const PAYMENT_ICONS: Record<string, string> = {
    PIX: "⚡",
    DINHEIRO: "💵",
    CREDITO: "💳",
    DEBITO: "🏦",
    VOUCHER: "🎟️",
    CHEQUE: "📝",
    CARNE: "📋",
    BOLETO: "🧾",
}

/* ─── Thermal receipt helper ─── */
const centerText = (text: string, width = 48) => {
    const pad = Math.max(0, Math.floor((width - text.length) / 2))
    return " ".repeat(pad) + text
}
const dashedLine = (width = 48) => "-".repeat(width)

export function InvoiceView({ sale, company }: InvoiceViewProps) {
    const router = useRouter()
    const invoiceRef = useRef<HTMLDivElement>(null)
    const thermalRef = useRef<HTMLDivElement>(null)

    const subtotal = sale.items.reduce((acc: number, item: any) => acc + Number(item.totalPrice), 0)
    const shipping = Number(sale.shippingCost || 0)
    const total = Number(sale.totalAmount)
    const saleCode = sale.id.slice(-6).toUpperCase()

    // Group transactions by payment method for display
    const paymentMethods = sale.transactions
        ? [...new Set(sale.transactions.map((tx: any) => {
            // Extract method from description like "Venda #CODE (PIX)" or "Venda #CODE (CREDITO) — Parcela 1/3"
            const match = tx.description?.match(/\(([^)]+)\)/)
            return match ? match[1] : sale.paymentMethod || "DINHEIRO"
        }))]
        : sale.paymentMethod ? [sale.paymentMethod] : []

    const handleDownloadPDF = () => {
        const element = invoiceRef.current
        if (!element) return

        const printWindow = window.open("", "_blank", "width=900,height=1200")
        if (!printWindow) {
            toast.error('Popup bloqueado. Permita popups para salvar o PDF.')
            return
        }

        // Collect all stylesheets from the current page
        const styles = Array.from(document.styleSheets)
            .map(sheet => {
                try {
                    return Array.from(sheet.cssRules).map(r => r.cssText).join("\n")
                } catch {
                    return ""
                }
            })
            .join("\n")

        printWindow.document.write(`
            <html>
            <head>
                <title>Resumo_Transacao_${saleCode}</title>
                <style>
                    ${styles}
                    @page { margin: 10mm; size: A4; }
                    body { margin: 0; padding: 20px; background: #fff; }
                    .no-print { display: none !important; }
                </style>
            </head>
            <body>${element.outerHTML}</body>
            </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
            printWindow.print()
        }, 500)
    }

    const handlePrintThermal = () => {
        const el = thermalRef.current
        if (!el) return

        const printWindow = window.open("", "_blank", "width=400,height=800")
        if (!printWindow) return

        printWindow.document.write(`
            <html>
            <head>
                <title>Cupom - ${saleCode}</title>
                <style>
                    @page { margin: 2mm 4mm; size: 80mm auto; }
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 12px;
                        line-height: 1.4;
                        color: #000;
                        margin: 0;
                        padding: 4px;
                        width: 72mm;
                    }
                    * { box-sizing: border-box; }
                </style>
            </head>
            <body>${el.innerHTML}</body>
            </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
            printWindow.print()
            printWindow.close()
        }, 300)
    }

    /* ─── Derive items for thermal ─── */
    const thermalItems = sale.items.map((item: any) => {
        const isService = item.itemType === "service"
        const name = isService
            ? item.service?.name || "Serviço"
            : item.product?.name || "Produto"
        return {
            name: name.substring(0, 28),
            qty: item.quantity,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
        }
    })

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            {/* ─── Toolbar ─── */}
            <div className="flex items-center justify-between no-print">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Voltar
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Resumo da Transação</h2>
                        <p className="text-sm text-muted-foreground">#{saleCode}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={handleDownloadPDF} className="text-muted-foreground hover:text-foreground gap-1.5">
                        <DownloadCloud className="h-4 w-4" />
                        <span className="hidden sm:inline">Salvar PDF</span>
                    </Button>
                    <div className="w-px h-5 bg-border" />
                    <Button variant="ghost" size="sm" onClick={handlePrintThermal} className="text-muted-foreground hover:text-foreground gap-1.5">
                        <Printer className="h-4 w-4" />
                        <span className="hidden sm:inline">Imprimir Cupom</span>
                    </Button>
                </div>
            </div>

            {/* ═══════════ DUAL LAYOUT ═══════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

                {/* ╔═══════════════════════════════════════╗
                   ║  ESQUERDA — Cupom do Dono (completo)  ║
                   ╚═══════════════════════════════════════╝ */}
                <div
                    ref={invoiceRef}
                    id="invoice-content"
                    className="bg-white rounded-2xl shadow-lg overflow-hidden print:shadow-none print:rounded-none"
                >
                    {/* ── Header com gradiente ── */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-8 py-6 text-white">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-xl font-bold tracking-wider uppercase">Resumo da Transação</h1>
                                <p className="text-slate-300 text-sm mt-1 font-mono">#{saleCode}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold">
                                    {company?.name || company?.tradingName || "Empresa"}
                                </div>
                                {company?.document && (
                                    <p className="text-slate-300 text-xs mt-0.5">
                                        CNPJ/CPF: {company.document}
                                    </p>
                                )}
                                {company?.address && (
                                    <p className="text-slate-400 text-xs">
                                        {company.address}
                                        {company.number ? `, ${company.number}` : ""} — {company.city || ""}/{company.state || ""}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-6">
                        {/* ── Cliente + Detalhes ── */}
                        <div className="grid grid-cols-2 gap-8">
                            {/* Cliente */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="h-4 w-4 text-slate-500" />
                                    <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">Cliente</h3>
                                </div>
                                <div className="space-y-0.5 text-sm text-slate-600">
                                    <p className="font-semibold text-slate-900 text-base">
                                        {sale.customer?.name || "Consumidor Final"}
                                    </p>
                                    {sale.customer?.document && <p>CPF/CNPJ: {sale.customer.document}</p>}
                                    {sale.customer?.phone && <p>Tel: {sale.customer.phone}</p>}
                                    {sale.customer?.email && <p>{sale.customer.email}</p>}
                                    {sale.customer?.address && (
                                        <p className="text-xs text-slate-400 mt-1">
                                            {sale.customer.address}, {sale.customer.number}
                                            {sale.customer.complement ? ` - ${sale.customer.complement}` : ""}
                                            <br />
                                            {sale.customer.neighborhood} — {sale.customer.city}/{sale.customer.state}
                                            {sale.customer.zipCode ? ` • CEP ${sale.customer.zipCode}` : ""}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Detalhes da venda */}
                            <div className="text-right">
                                <div className="flex items-center gap-2 mb-2 justify-end">
                                    <Calendar className="h-4 w-4 text-slate-500" />
                                    <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">Detalhes</h3>
                                </div>
                                <div className="space-y-1 text-sm text-slate-600">
                                    <p>
                                        <span className="text-slate-400">Data:</span>{" "}
                                        <span className="font-medium text-slate-900">
                                            {format(new Date(sale.date), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
                                        </span>
                                    </p>
                                    <p>
                                        <span className="text-slate-400">Status:</span>{" "}
                                        <Badge
                                            variant={sale.status === "COMPLETED" ? "default" : "secondary"}
                                            className="ml-1 text-xs"
                                        >
                                            {sale.status === "COMPLETED" ? "Concluída" : sale.status}
                                        </Badge>
                                    </p>
                                    {sale.paymentMethod && (
                                        <p>
                                            <span className="text-slate-400">Pagamento:</span>{" "}
                                            <span className="font-medium text-slate-900">
                                                {PAYMENT_ICONS[sale.paymentMethod] || ""} {PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}
                                                {sale.installments && sale.installments > 1
                                                    ? ` • ${sale.installments}x de ${formatBRL(total / sale.installments)}`
                                                    : " • À vista"
                                                }
                                            </span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* ── Itens ── */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Receipt className="h-4 w-4 text-slate-500" />
                                <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">Itens</h3>
                            </div>
                            <div className="rounded-lg border overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                            <th className="text-left py-2.5 px-4">Item</th>
                                            <th className="text-center py-2.5 px-3 w-16">Tipo</th>
                                            <th className="text-center py-2.5 px-3 w-16">Qtd</th>
                                            <th className="text-right py-2.5 px-4 w-28">Unit.</th>
                                            <th className="text-right py-2.5 px-4 w-28">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sale.items.map((item: any, idx: number) => {
                                            const isService = item.itemType === "service"
                                            const name = isService
                                                ? item.service?.name || "Serviço"
                                                : item.product?.name || "Produto"
                                            return (
                                                <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                                    <td className="py-2.5 px-4 font-medium text-slate-900">
                                                        {name}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        {isService ? (
                                                            <span className="inline-flex items-center gap-1 text-xs text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md">
                                                                <Wrench className="h-3 w-3" /> Serviço
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                                                                <Package className="h-3 w-3" /> Produto
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center text-slate-600">{item.quantity}</td>
                                                    <td className="py-2.5 px-4 text-right text-slate-600">
                                                        {formatBRL(Number(item.unitPrice))}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                                                        {formatBRL(Number(item.totalPrice))}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ── Frete ── */}
                        {shipping > 0 && (
                            <div className="rounded-lg border bg-amber-50/50 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Truck className="h-4 w-4 text-amber-600" />
                                        <span className="text-sm font-medium text-slate-700">Frete / Entrega</span>
                                    </div>
                                    <span className="font-semibold text-slate-900">{formatBRL(shipping)}</span>
                                </div>
                                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                                    {sale.carrier && (
                                        <span>Transportadora: <strong className="text-slate-700">{sale.carrier.name}</strong></span>
                                    )}
                                    {sale.freightPaidBy && (
                                        <span>
                                            Pago por: <strong className="text-slate-700">
                                                {sale.freightPaidBy === "EMPRESA" ? "Empresa (frete grátis)" : "Cliente"}
                                            </strong>
                                        </span>
                                    )}
                                    {sale.shippingStatus && (
                                        <Badge variant={sale.shippingStatus === "PAID" ? "default" : "secondary"} className="text-[10px]">
                                            {sale.shippingStatus === "PAID" ? "Frete Pago" : "Frete Pendente"}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Totais ── */}
                        <div className="bg-slate-50 rounded-xl p-5">
                            <div className="space-y-2 max-w-xs ml-auto">
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Subtotal ({sale.items.length} {sale.items.length === 1 ? "item" : "itens"})</span>
                                    <span className="text-slate-700">{formatBRL(subtotal)}</span>
                                </div>
                                {shipping > 0 && (
                                    <div className="flex justify-between text-sm text-slate-500">
                                        <span>Frete</span>
                                        <span className="text-slate-700">{formatBRL(shipping)}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-lg font-bold text-slate-900">Total</span>
                                    <span className="text-2xl font-bold text-emerald-600">{formatBRL(total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* ── Parcelas / Transações ── */}
                        {sale.transactions && sale.transactions.length > 0 && (
                            <>
                                <Separator />
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <CreditCard className="h-4 w-4 text-slate-500" />
                                        <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">
                                            {sale.transactions.length === 1 ? "Transação Financeira" : `Parcelas (${sale.transactions.length}x)`}
                                        </h3>
                                    </div>
                                    <div className="rounded-lg border overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                                    <th className="text-left py-2 px-4">#</th>
                                                    <th className="text-left py-2 px-4">Descrição</th>
                                                    <th className="text-right py-2 px-4 w-28">Valor</th>
                                                    <th className="text-center py-2 px-4 w-24">Status</th>
                                                    <th className="text-right py-2 px-4 w-32">Vencimento</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sale.transactions.map((tx: any, idx: number) => (
                                                    <tr key={tx.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                                        <td className="py-2 px-4 text-slate-400 font-mono text-xs">
                                                            {tx.installmentNumber || idx + 1}
                                                        </td>
                                                        <td className="py-2 px-4 text-slate-700 text-xs">
                                                            {tx.description}
                                                        </td>
                                                        <td className="py-2 px-4 text-right font-semibold text-slate-900">
                                                            {formatBRL(Number(tx.amount))}
                                                        </td>
                                                        <td className="py-2 px-4 text-center">
                                                            {tx.status === "paid" ? (
                                                                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                                    <BadgeCheck className="h-3 w-3" /> Pago
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                                    <Clock className="h-3 w-3" /> Pendente
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-4 text-right text-slate-500 text-xs">
                                                            {format(new Date(tx.date), "dd/MM/yyyy")}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {sale.transactions.some((tx: any) => tx.taxaAplicada && Number(tx.taxaAplicada) > 0) && (
                                        <p className="text-xs text-slate-400 mt-2 text-right">
                                            * Taxa de maquininha aplicada: {(Number(sale.transactions[0].taxaAplicada) * 100).toFixed(2)}%
                                        </p>
                                    )}
                                </div>
                            </>
                        )}

                        {/* ── Rodapé ── */}
                        <div className="border-t pt-4 text-center text-xs text-slate-400 space-y-0.5">
                            <p>Documento gerado eletronicamente em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                            <p className="font-mono text-[10px]">ID: {sale.id}</p>
                        </div>
                    </div>
                </div>

                {/* ╔═══════════════════════════════════════════════╗
                   ║  DIREITA — Cupom Térmico do Cliente (80mm)   ║
                   ╚═══════════════════════════════════════════════╝ */}
                <div className="lg:sticky lg:top-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Cupom do Cliente
                        </h3>
                        <Button variant="outline" size="sm" onClick={handlePrintThermal} className="text-xs">
                            <Printer className="mr-1.5 h-3.5 w-3.5" />
                            Imprimir
                        </Button>
                    </div>
                    <div
                        ref={thermalRef}
                        id="thermal-receipt"
                        className="bg-white border-2 border-dashed border-slate-300 rounded-lg shadow-sm w-full max-w-[360px] mx-auto overflow-hidden"
                    >
                        <div className="font-mono text-[11px] leading-[1.5] text-black p-4 whitespace-pre-wrap" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
                            {/* ── Cabeçalho ── */}
                            <div className="text-center space-y-0.5">
                                <div className="text-sm font-bold tracking-wide">
                                    {company?.name || company?.tradingName || "EMPRESA"}
                                </div>
                                {company?.document && (
                                    <div className="text-[10px]">CNPJ: {company.document}</div>
                                )}
                                {company?.address && (
                                    <div className="text-[10px]">
                                        {company.address}{company.number ? `, ${company.number}` : ""}
                                        {company.city ? ` - ${company.city}` : ""}{company.state ? `/${company.state}` : ""}
                                    </div>
                                )}
                                {company?.phone && (
                                    <div className="text-[10px]">Tel: {company.phone}</div>
                                )}
                            </div>

                            <div className="my-2 text-center text-[10px] tracking-widest text-slate-400">
                                {dashedLine(48)}
                            </div>

                            {/* ── Título ── */}
                            <div className="text-center font-bold text-xs tracking-wider my-1">
                                CUPOM NAO FISCAL
                            </div>

                            {/* ── Data + Nº ── */}
                            <div className="flex justify-between text-[10px] my-1">
                                <span>{format(new Date(sale.date), "dd/MM/yyyy HH:mm")}</span>
                                <span>Venda #{saleCode}</span>
                            </div>

                            <div className="text-center text-[10px] tracking-widest text-slate-400">
                                {dashedLine(48)}
                            </div>

                            {/* ── Itens ── */}
                            <div className="my-2 space-y-1">
                                <div className="flex justify-between text-[10px] font-bold">
                                    <span>ITEM</span>
                                    <span>TOTAL</span>
                                </div>
                                {thermalItems.map((item: any, idx: number) => (
                                    <div key={idx}>
                                        <div className="flex justify-between">
                                            <span className="truncate mr-2">{item.name}</span>
                                            <span className="font-bold whitespace-nowrap">{formatBRL(item.totalPrice)}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                            {item.qty}x {formatBRL(item.unitPrice)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="text-center text-[10px] tracking-widest text-slate-400">
                                {dashedLine(48)}
                            </div>

                            {/* ── Totais ── */}
                            <div className="my-2 space-y-0.5">
                                <div className="flex justify-between text-[10px]">
                                    <span>SUBTOTAL ({sale.items.length} {sale.items.length === 1 ? "item" : "itens"})</span>
                                    <span>{formatBRL(subtotal)}</span>
                                </div>
                                {shipping > 0 && (
                                    <div className="flex justify-between text-[10px]">
                                        <span>FRETE</span>
                                        <span>{formatBRL(shipping)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-sm mt-1 pt-1 border-t border-dashed border-slate-300">
                                    <span>TOTAL</span>
                                    <span>{formatBRL(total)}</span>
                                </div>
                            </div>

                            <div className="text-center text-[10px] tracking-widest text-slate-400">
                                {dashedLine(48)}
                            </div>

                            {/* ── Pagamento ── */}
                            <div className="my-2 space-y-0.5 text-[10px]">
                                <div className="font-bold">PAGAMENTO</div>
                                {paymentMethods.length > 0 ? (
                                    paymentMethods.map((pm: string, idx: number) => {
                                        const label = PAYMENT_LABELS[pm] || pm
                                        // Count transactions for this method
                                        const methodTxs = sale.transactions?.filter((tx: any) => {
                                            const match = tx.description?.match(/\(([^)]+)\)/)
                                            const txMethod = match ? match[1] : sale.paymentMethod
                                            return txMethod === pm
                                        }) || []
                                        const methodTotal = methodTxs.reduce((s: number, tx: any) => s + Number(tx.amount), 0)
                                        const installCount = methodTxs.length

                                        return (
                                            <div key={idx} className="flex justify-between">
                                                <span>
                                                    {label}
                                                    {installCount > 1 ? ` (${installCount}x)` : " (A vista)"}
                                                </span>
                                                <span>{methodTotal > 0 ? formatBRL(methodTotal) : formatBRL(total)}</span>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="flex justify-between">
                                        <span>{sale.paymentMethod ? (PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod) : "Dinheiro"}</span>
                                        <span>{formatBRL(total)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="text-center text-[10px] tracking-widest text-slate-400">
                                {dashedLine(48)}
                            </div>

                            {/* ── Cliente ── */}
                            {sale.customer?.name && (
                                <div className="my-2 text-[10px]">
                                    <span className="font-bold">CLIENTE: </span>
                                    <span>{sale.customer.name}</span>
                                    {sale.customer.document && (
                                        <div>CPF/CNPJ: {sale.customer.document}</div>
                                    )}
                                </div>
                            )}

                            {/* ── Mensagem final ── */}
                            <div className="my-3 text-center space-y-1">
                                <div className="text-[10px] tracking-widest text-slate-400">
                                    {dashedLine(48)}
                                </div>
                                <div className="font-bold text-xs">
                                    Obrigado pela preferencia!
                                </div>
                                <div className="text-[10px] text-slate-500">Volte sempre</div>
                            </div>

                            {/* ── Rodapé ── */}
                            <div className="text-center text-[9px] text-slate-400 mt-2 space-y-0.5">
                                <div>{format(new Date(sale.date), "dd/MM/yyyy HH:mm:ss")}</div>
                                <div>#{saleCode}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 15mm; }
                    body { visibility: hidden; }
                    .no-print { display: none !important; }
                    #invoice-content, #invoice-content * { visibility: visible; }
                    #thermal-receipt, #thermal-receipt * { visibility: visible; }
                    #invoice-content {
                        position: absolute;
                        left: 0; top: 0;
                        width: 60%;
                        margin: 0; padding: 0;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                    }
                    #thermal-receipt {
                        position: absolute;
                        right: 0; top: 0;
                        width: 35%;
                        border: 1px solid #ccc !important;
                    }
                }
            `}</style>
        </div>
    )
}
