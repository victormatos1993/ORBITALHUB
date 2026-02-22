"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import {
    FileText,
    Plus,
    Search,
    Trash2,
    MoreHorizontal,
    Loader2,
    CheckCircle2,
    Send,
    ThumbsUp,
    ThumbsDown,
    Eye,
    User,
    Hash,
    CalendarClock,
    AlertTriangle,
    ArrowLeft,
    CreditCard,
    Repeat,
    Mail,
    Phone,
    Printer,
    DownloadCloud
} from "lucide-react"


import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"

import { getQuotes, createQuote, updateQuoteStatus, deleteQuote } from "@/app/actions/quote"
import { getServices } from "@/app/actions/service"
import { getProducts } from "@/app/actions/product"
import { getCompany } from "@/app/actions/company"
import { getCustomers } from "@/app/actions/customer"
import { cn } from "@/lib/utils"

// ═══════ TYPES ═══════

type QuoteItem = {
    id?: string
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
    serviceId: string | null
    productId: string | null
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

type ServiceOption = { id: string; name: string; price: number }
type ProductOption = { id: string; name: string; price: number }
type CustomerOption = { id: string; name: string; email?: string | null; phone?: string | null }

// ═══════ HELPERS ═══════

const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

/** Máscara de moeda: R$0.000,00 */
function maskCurrency(value: string): string {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, "")
    if (!digits) return ""
    // Converte para centavos
    const cents = parseInt(digits, 10)
    const reais = (cents / 100).toFixed(2)
    // Formata com pontos e vírgula
    const [intPart, decPart] = reais.split(".")
    const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + decPart
    return formatted
}

/** Converte string formatada para número */
function parseCurrency(value: string): number {
    if (!value) return 0
    // Remove pontos (separador de milhar) e troca vírgula por ponto
    const cleaned = value.replace(/\./g, "").replace(",", ".")
    return parseFloat(cleaned) || 0
}

const STATUS_COLORS: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    EXPIRED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
}

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Rascunho",
    SENT: "Enviado",
    APPROVED: "Aprovado",
    REJECTED: "Rejeitado",
    EXPIRED: "Vencido",
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] || ""}`}>
            {STATUS_LABELS[status] || status}
        </span>
    )
}

function formatDateBR(date: Date | string | null) {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("pt-BR")
}

function daysUntil(date: Date | string | null) {
    if (!date) return null
    const d = new Date(date)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    d.setHours(0, 0, 0, 0)
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// ═══════ PAGE ═══════

export default function OrcamentosPage() {
    const [quotes, setQuotes] = useState<QuoteData[]>([])
    const [services, setServices] = useState<ServiceOption[]>([])
    const [products, setProducts] = useState<ProductOption[]>([])
    const [customers, setCustomers] = useState<CustomerOption[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [showExpired, setShowExpired] = useState(false)
    const [company, setCompany] = useState<any>(null)

    // New quote
    const [dialogOpen, setDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [clientName, setClientName] = useState("")
    const [clientEmail, setClientEmail] = useState("")
    const [clientPhone, setClientPhone] = useState("")
    const [notes, setNotes] = useState("")
    const [validUntil, setValidUntil] = useState("")
    const [discount, setDiscount] = useState("")
    const [paymentMethod, setPaymentMethod] = useState("")
    const [paymentType, setPaymentType] = useState("UPFRONT")
    const [installments, setInstallments] = useState("")
    const [items, setItems] = useState<QuoteItem[]>([{ description: "", quantity: 1, unitPrice: 0, totalPrice: 0, serviceId: null, productId: null }])

    // Customer Combobox State
    const [openCustomer, setOpenCustomer] = useState(false)

    // View/Delete
    const [viewQuote, setViewQuote] = useState<QuoteData | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        try {
            const [quotesData, servicesData, productsData, companyData, customersData] = await Promise.all([
                getQuotes(),
                getServices(),
                getProducts(),
                getCompany(),
                getCustomers()
            ])
            setQuotes(quotesData as unknown as QuoteData[])
            setServices(servicesData.map((s: { id: string; name: string; price: number }) => ({
                id: s.id, name: s.name, price: Number(s.price),
            })))
            setProducts(productsData.products.map((p: { id: string; name: string; price: number }) => ({
                id: p.id, name: p.name, price: Number(p.price),
            })))
            setCustomers(customersData.customers.map((c: any) => ({
                id: c.id, name: c.name, email: c.email, phone: c.phone
            })))
            if (companyData && 'data' in companyData && companyData.data) {
                setCompany(companyData.data)
            }
        } catch {
            toast.error("Erro ao carregar dados")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()

        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search)
            if (params.get("new") === "true") {
                const urlClientName = params.get("clientName") || ""
                const urlClientEmail = params.get("clientEmail") || ""
                const urlClientPhone = params.get("clientPhone") || ""

                setClientName(urlClientName)
                setClientEmail(urlClientEmail)
                setClientPhone(urlClientPhone)
                setNotes("")
                setValidUntil("")
                setDiscount("")
                setPaymentMethod("")
                setPaymentType("UPFRONT")
                setInstallments("")
                setItems([{ description: "", quantity: 1, unitPrice: 0, totalPrice: 0, serviceId: null, productId: null }])
                setDialogOpen(true)

                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname)
            }
        }
    }, [loadData])

    // Filter active vs expired
    const activeQuotes = quotes.filter(q => q.status !== "EXPIRED")
    const expiredQuotes = quotes.filter(q => q.status === "EXPIRED")

    const displayedQuotes = showExpired ? expiredQuotes : activeQuotes
    const filteredQuotes = displayedQuotes.filter(q =>
        q.clientName.toLowerCase().includes(search.toLowerCase()) ||
        String(q.number).includes(search)
    )

    // ═══════ CREATE LOGIC ═══════

    const handleOpenCreate = () => {
        setClientName("")
        setClientEmail("")
        setClientPhone("")
        setNotes("")
        setValidUntil("")
        setDiscount("")
        setPaymentMethod("")
        setPaymentType("UPFRONT")
        setInstallments("")
        setItems([{ description: "", quantity: 1, unitPrice: 0, totalPrice: 0, serviceId: null, productId: null }])
        setDialogOpen(true)
    }

    const addItem = () => {
        setItems(prev => [...prev, { description: "", quantity: 1, unitPrice: 0, totalPrice: 0, serviceId: null, productId: null }])
    }

    const removeItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index))
    }

    const updateItem = (index: number, field: string, value: string | number) => {
        setItems(prev => {
            const updated = [...prev]
            const item = { ...updated[index], [field]: value }
            item.totalPrice = item.quantity * item.unitPrice
            updated[index] = item
            return updated
        })
    }

    const selectCatalogItem = (index: number, val: string) => {
        const [type, id] = val.split(":")

        setItems(prev => {
            const updated = [...prev]

            if (type === "service") {
                const service = services.find(s => s.id === id)
                if (service) {
                    updated[index] = {
                        ...updated[index],
                        serviceId: id,
                        productId: null,
                        description: service.name,
                        unitPrice: service.price,
                        totalPrice: updated[index].quantity * service.price,
                    }
                }
            } else if (type === "product") {
                const product = products.find(p => p.id === id)
                if (product) {
                    updated[index] = {
                        ...updated[index],
                        serviceId: null,
                        productId: id,
                        description: product.name,
                        unitPrice: product.price,
                        totalPrice: updated[index].quantity * product.price,
                    }
                }
            }
            return updated
        })
    }

    const itemsTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const discountValue = parseCurrency(discount)
    const grandTotal = Math.max(0, itemsTotal - discountValue)

    const handleSaveQuote = async () => {
        if (!clientName.trim()) {
            toast.error("Nome do cliente é obrigatório")
            return
        }
        const validItems = items.filter(i => i.description.trim())
        if (validItems.length === 0) {
            toast.error("Adicione ao menos um item ao orçamento")
            return
        }

        setSaving(true)
        try {
            const res = await createQuote({
                clientName: clientName.trim(),
                clientEmail: clientEmail.trim() || null,
                clientPhone: clientPhone.trim() || null,
                notes: notes.trim() || null,
                validUntil: validUntil || null,
                discount: discountValue,
                paymentMethod: paymentMethod || null,
                paymentType: paymentType || null,
                installments: paymentType === "INSTALLMENT" && installments ? parseInt(installments) : null,
                items: validItems.map(i => ({
                    description: i.description,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    serviceId: i.serviceId || null,
                    productId: i.productId || null,
                })),
            })

            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(`Orçamento #${res.quote?.number} criado!`)
                setDialogOpen(false)
                loadData()
            }
        } catch {
            toast.error("Erro ao criar orçamento")
        } finally {
            setSaving(false)
        }
    }

    const handleStatusChange = async (quoteId: string, status: string) => {
        const res = await updateQuoteStatus(quoteId, status)
        if (res.error) {
            toast.error(res.error)
        } else {
            if (status === "APPROVED" && 'integration' in res) {
                toast.success("Orçamento aprovado! Cliente cadastrado e transação criada no financeiro.", {
                    duration: 5000,
                })
            } else {
                toast.success(`Status alterado para "${STATUS_LABELS[status] || status}"`)
            }
            loadData()
        }
    }

    const handleDelete = async () => {
        if (!deletingId) return
        const res = await deleteQuote(deletingId)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Orçamento excluído")
            loadData()
        }
        setDeleteDialogOpen(false)
        setDeletingId(null)
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">
                        {showExpired ? "Orçamentos Vencidos" : "Orçamentos"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {showExpired
                            ? "Orçamentos que passaram da data de validade"
                            : "Crie e gerencie orçamentos de serviços"
                        }
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {showExpired ? (
                        <Button
                            variant="outline"
                            onClick={() => setShowExpired(false)}
                            className="rounded-xl gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setShowExpired(true)}
                                className="rounded-xl gap-2"
                            >
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                Vencidos
                                {expiredQuotes.length > 0 && (
                                    <Badge variant="secondary" className="ml-1 rounded-full h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                                        {expiredQuotes.length}
                                    </Badge>
                                )}
                            </Button>
                            <Button
                                className="rounded-xl gradient-primary text-white hover:opacity-90 gap-2"
                                onClick={handleOpenCreate}
                            >
                                <Plus className="h-4 w-4" />
                                Novo Orçamento
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome do cliente ou número..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 rounded-xl"
                    />
                </div>
                <Badge variant="secondary" className="rounded-lg px-3 py-1.5 text-xs whitespace-nowrap">
                    {filteredQuotes.length} orçamento{filteredQuotes.length !== 1 ? "s" : ""}
                </Badge>
            </div>

            {/* ═══════ CARDS GRID 4x4 ═══════ */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredQuotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 rounded-2xl border bg-card">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                        {showExpired ? (
                            <AlertTriangle className="h-8 w-8 text-amber-500" />
                        ) : (
                            <FileText className="h-8 w-8 text-primary" />
                        )}
                    </div>
                    <h3 className="text-lg font-semibold mb-1">
                        {showExpired ? "Nenhum orçamento vencido" : search ? "Nenhum orçamento encontrado" : "Nenhum orçamento criado"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        {showExpired
                            ? "Todos os orçamentos estão dentro da validade."
                            : search
                                ? "Tente buscar por outro termo."
                                : "Crie seu primeiro orçamento de serviço."
                        }
                    </p>
                    {!search && !showExpired && (
                        <Button onClick={handleOpenCreate} className="rounded-xl gradient-primary text-white hover:opacity-90 gap-2">
                            <Plus className="h-4 w-4" /> Criar Primeiro Orçamento
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {filteredQuotes.map(quote => {
                        const days = daysUntil(quote.validUntil)
                        const isUrgent = days !== null && days <= 3 && days >= 0
                        const isExpired = quote.status === "EXPIRED"

                        return (
                            <div
                                key={quote.id}
                                className={`group relative rounded-2xl border bg-card p-4 transition-all duration-200 hover:shadow-lg hover:border-primary/20 cursor-pointer ${isExpired ? "opacity-70 border-amber-500/30" : isUrgent ? "border-amber-400/50" : ""
                                    }`}
                                onClick={() => setViewQuote(quote)}
                            >
                                {/* Top: Number + Status */}
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-mono text-muted-foreground">
                                        #{String(quote.number).padStart(4, "0")}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <StatusBadge status={quote.status} />
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-xl w-44">
                                                <DropdownMenuItem onClick={e => { e.stopPropagation(); setViewQuote(quote) }} className="gap-2">
                                                    <Eye className="h-3.5 w-3.5" /> Visualizar
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {quote.status === "DRAFT" && (
                                                    <DropdownMenuItem onClick={e => { e.stopPropagation(); handleStatusChange(quote.id, "SENT") }} className="gap-2">
                                                        <Send className="h-3.5 w-3.5" /> Marcar Enviado
                                                    </DropdownMenuItem>
                                                )}
                                                {(quote.status === "SENT" || quote.status === "DRAFT") && (
                                                    <>
                                                        <DropdownMenuItem onClick={e => { e.stopPropagation(); handleStatusChange(quote.id, "APPROVED") }} className="gap-2 text-emerald-600">
                                                            <ThumbsUp className="h-3.5 w-3.5" /> Aprovar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={e => { e.stopPropagation(); handleStatusChange(quote.id, "REJECTED") }} className="gap-2 text-red-600">
                                                            <ThumbsDown className="h-3.5 w-3.5" /> Rejeitar
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={e => { e.stopPropagation(); setDeletingId(quote.id); setDeleteDialogOpen(true) }}
                                                    className="gap-2 text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* Client Name */}
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <User className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-sm truncate">{quote.clientName}</h3>
                                </div>

                                {/* Total */}
                                <p className="text-lg font-bold text-primary mb-2">{formatBRL(quote.totalAmount)}</p>

                                {/* Validity + Extras */}
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <CalendarClock className="h-3 w-3" />
                                        <span>
                                            {quote.validUntil
                                                ? `Vence: ${formatDateBR(quote.validUntil)}`
                                                : "Sem vencimento"
                                            }
                                        </span>
                                        {isUrgent && (
                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-400 text-amber-600 rounded-md ml-auto">
                                                {days === 0 ? "Hoje" : `${days}d`}
                                            </Badge>
                                        )}
                                    </div>
                                    {(quote.paymentMethod || quote.paymentType || quote.installments) && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                            <CreditCard className="h-3 w-3" />
                                            <span>
                                                {quote.paymentMethod || "Pagamento"}:{" "}
                                                {quote.paymentType === "INSTALLMENT" && quote.installments
                                                    ? `${quote.installments}x parcelas`
                                                    : "À vista"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ═══════ CREATE QUOTE DIALOG ═══════ */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                                <FileText className="h-5 w-5 text-primary" />
                            </div>
                            Novo Orçamento
                        </DialogTitle>
                        <DialogDescription>
                            Preencha os dados do orçamento. O cliente não precisa estar cadastrado.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 py-4">
                        {/* Client + Validity */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="quote-client" className="text-sm font-medium">
                                    Nome do Cliente <span className="text-destructive">*</span>
                                </Label>
                                <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCustomer}
                                            className="w-full justify-between rounded-xl px-3 font-normal"
                                        >
                                            <span className="truncate">
                                                {clientName || "Selecione ou digite..."}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0 rounded-xl" align="start">
                                        <Command>
                                            <CommandInput
                                                placeholder="Buscar cliente..."
                                                value={clientName}
                                                onValueChange={setClientName}
                                            />
                                            <CommandList>
                                                <CommandEmpty className="py-2 px-4 text-sm">
                                                    Nenhum cliente encontrado. <br />
                                                    <span className="text-muted-foreground text-xs">Será salvo como um novo cadastro.</span>
                                                </CommandEmpty>
                                                <CommandGroup heading="Clientes da Base">
                                                    {customers.map((c) => (
                                                        <CommandItem
                                                            key={c.id}
                                                            value={c.name}
                                                            onSelect={(currentValue) => {
                                                                setClientName(c.name)
                                                                if (c.email && !clientEmail) setClientEmail(c.email)
                                                                if (c.phone && !clientPhone) setClientPhone(c.phone)
                                                                setOpenCustomer(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    clientName === c.name ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {c.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                                    Se o nome digitado não existir, um novo cadastro será criado automaticamente ao aprovar.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="quote-validity" className="text-sm font-medium">Válido até</Label>
                                <Input
                                    id="quote-validity"
                                    type="date"
                                    value={validUntil}
                                    onChange={e => setValidUntil(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        {/* Email + Phone */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="quote-email" className="text-sm font-medium flex items-center gap-1.5">
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                    E-mail
                                </Label>
                                <Input
                                    id="quote-email"
                                    type="email"
                                    placeholder="cliente@email.com"
                                    value={clientEmail}
                                    onChange={e => setClientEmail(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="quote-phone" className="text-sm font-medium flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    Telefone
                                </Label>
                                <Input
                                    id="quote-phone"
                                    type="tel"
                                    placeholder="(00) 00000-0000"
                                    value={clientPhone}
                                    onChange={e => {
                                        // Máscara de telefone
                                        let v = e.target.value.replace(/\D/g, "")
                                        if (v.length > 11) v = v.slice(0, 11)
                                        if (v.length > 6) {
                                            v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
                                        } else if (v.length > 2) {
                                            v = `(${v.slice(0, 2)}) ${v.slice(2)}`
                                        } else if (v.length > 0) {
                                            v = `(${v}`
                                        }
                                        setClientPhone(v)
                                    }}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>


                        {/* Items */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Itens do Orçamento</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addItem}
                                    className="h-7 text-xs gap-1 rounded-lg"
                                >
                                    <Plus className="h-3 w-3" /> Adicionar Item
                                </Button>
                            </div>

                            <div className="rounded-xl border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent text-xs">
                                            <TableHead className="h-8">Serviço / Descrição</TableHead>
                                            <TableHead className="h-8 w-[70px]">Qtd</TableHead>
                                            <TableHead className="h-8 w-[140px]">Preço Unit. (R$)</TableHead>
                                            <TableHead className="h-8 w-[100px] text-right">Subtotal</TableHead>
                                            <TableHead className="h-8 w-[40px]" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="py-1.5">
                                                    <div className="flex flex-col gap-1">
                                                        {(services.length > 0 || products.length > 0) && (
                                                            <Select
                                                                value={item.serviceId ? `service:${item.serviceId}` : item.productId ? `product:${item.productId}` : ""}
                                                                onValueChange={val => selectCatalogItem(idx, val)}
                                                            >
                                                                <SelectTrigger className="h-7 text-xs rounded-lg">
                                                                    <SelectValue placeholder="Buscar do catálogo..." />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-xl">
                                                                    {products.length > 0 && (
                                                                        <SelectGroup>
                                                                            <SelectLabel className="text-xs text-muted-foreground">Produtos (Estoque)</SelectLabel>
                                                                            {products.map(p => (
                                                                                <SelectItem key={`product:${p.id}`} value={`product:${p.id}`} className="text-xs">
                                                                                    {p.name} — {formatBRL(p.price)}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectGroup>
                                                                    )}
                                                                    {services.length > 0 && (
                                                                        <SelectGroup>
                                                                            <SelectLabel className="text-xs text-muted-foreground">Serviços</SelectLabel>
                                                                            {services.map(s => (
                                                                                <SelectItem key={`service:${s.id}`} value={`service:${s.id}`} className="text-xs">
                                                                                    {s.name} — {formatBRL(s.price)}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectGroup>
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                        <Input
                                                            placeholder="Descrição do item..."
                                                            value={item.description}
                                                            onChange={e => updateItem(idx, "description", e.target.value)}
                                                            className="h-7 text-xs rounded-lg"
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-1.5">
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                                                        className="h-7 text-xs rounded-lg"
                                                    />
                                                </TableCell>
                                                <TableCell className="py-1.5">
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                                                        <Input
                                                            placeholder="0,00"
                                                            value={item.unitPrice ? maskCurrency(String(Math.round(item.unitPrice * 100))) : ""}
                                                            onChange={e => {
                                                                const val = e.target.value
                                                                const masked = maskCurrency(val)
                                                                const numVal = parseCurrency(masked)
                                                                updateItem(idx, "unitPrice", numVal)
                                                            }}
                                                            className="h-7 text-xs rounded-lg pl-7"
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-1.5 text-right text-xs font-semibold">
                                                    {formatBRL(item.quantity * item.unitPrice)}
                                                </TableCell>
                                                <TableCell className="py-1.5">
                                                    {items.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeItem(idx)}
                                                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Totals */}
                            <div className="flex justify-end">
                                <div className="w-64 space-y-1.5 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>{formatBRL(itemsTotal)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Desconto (R$)</span>
                                        <div className="relative w-28">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                                            <Input
                                                placeholder="0,00"
                                                value={discount}
                                                onChange={e => setDiscount(maskCurrency(e.target.value))}
                                                className="w-full h-7 text-xs text-right rounded-lg pl-7"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between pt-1.5 border-t font-bold text-base">
                                        <span>Total</span>
                                        <span className="text-primary">{formatBRL(grandTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Options */}
                        <div className="rounded-xl border p-4 bg-muted/20 space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-primary" />
                                Condições de Pagamento
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">Forma de Pagamento</Label>
                                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                                            <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                                            <SelectItem value="PIX">PIX</SelectItem>
                                            <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                            <SelectItem value="Cheque">Cheque</SelectItem>
                                            <SelectItem value="Crediário">Crediário/Boleto</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {["Cartão de Crédito", "Cheque", "Crediário"].includes(paymentMethod) && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                        <Label className="text-xs">Tipo</Label>
                                        <Select value={paymentType} onValueChange={setPaymentType}>
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="UPFRONT">À vista</SelectItem>
                                                <SelectItem value="INSTALLMENT">Parcelado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {paymentType === "INSTALLMENT" && ["Cartão de Crédito", "Cheque", "Crediário"].includes(paymentMethod) && (
                                <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-1">
                                    <Label className="text-xs">Quantidade de Parcelas</Label>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            type="number"
                                            min="2"
                                            max="999"
                                            placeholder="Ex: 3"
                                            value={installments}
                                            onChange={e => setInstallments(e.target.value)}
                                            className="rounded-xl w-32"
                                        />
                                        {installments && parseInt(installments) > 0 && grandTotal > 0 && (
                                            <p className="text-sm text-muted-foreground">
                                                {installments}x de <span className="font-medium text-foreground">{formatBRL(grandTotal / parseInt(installments))}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="quote-notes" className="text-sm font-medium">Observações</Label>
                            <Textarea
                                id="quote-notes"
                                placeholder="Condições de pagamento, prazo de execução, garantias..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="rounded-xl resize-none"
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveQuote}
                            disabled={saving || !clientName.trim() || items.every(i => !i.description.trim())}
                            className="rounded-xl gradient-primary text-white hover:opacity-90"
                        >
                            {saving ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                            ) : (
                                <><CheckCircle2 className="mr-2 h-4 w-4" /> Criar Orçamento</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══════ VIEW QUOTE DIALOG ═══════ */}
            <Dialog open={!!viewQuote} onOpenChange={open => { if (!open) setViewQuote(null) }}>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto rounded-2xl">
                    {viewQuote && (
                        <>
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
                                {company?.logoUrl && (
                                    <div className="absolute top-4 right-4 print:block hidden" data-html2canvas-ignore="false">
                                        {/* Optional logo placement for canvas/printing */}
                                    </div>
                                )}
                                {/* Print Button */}
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
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O orçamento e seus itens serão removidos permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    )
}
