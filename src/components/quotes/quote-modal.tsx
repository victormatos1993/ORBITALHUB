"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
    FileText, Plus, Trash2, Loader2, CheckCircle2,
    CreditCard, Mail, Phone, Check, ChevronsUpDown
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
import { cn } from "@/lib/utils"
import { createQuote } from "@/app/actions/quote"

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuoteItem = {
    id?: string
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
    serviceId: string | null
    productId: string | null
}

export type ServiceOption = { id: string; name: string; price: number }
export type ProductOption = { id: string; name: string; price: number }
export type CustomerOption = { id: string; name: string; email?: string | null; phone?: string | null }

export interface QuoteModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    services?: ServiceOption[]
    products?: ProductOption[]
    customers?: CustomerOption[]
    /** Pré-preenche o nome do cliente (ex: vindo da ficha do cliente) */
    initialClientName?: string
    initialClientEmail?: string
    initialClientPhone?: string
    /** Chamado após criar com sucesso — recebe o número do orçamento */
    onSaved?: (quoteNumber: number) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

function maskCurrency(value: string): string {
    const digits = value.replace(/\D/g, "")
    if (!digits) return ""
    const cents = parseInt(digits, 10)
    const reais = (cents / 100).toFixed(2)
    const [intPart, decPart] = reais.split(".")
    return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + decPart
}

function parseCurrency(value: string): number {
    if (!value) return 0
    return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0
}

function maskPhone(value: string): string {
    let v = value.replace(/\D/g, "")
    if (v.length > 11) v = v.slice(0, 11)
    if (v.length > 6) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
    if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`
    if (v.length > 0) return `(${v}`
    return v
}

const emptyItem = (): QuoteItem => ({
    description: "", quantity: 1, unitPrice: 0, totalPrice: 0, serviceId: null, productId: null,
})

// ─── Component ────────────────────────────────────────────────────────────────

export function QuoteModal({
    open,
    onOpenChange,
    services = [],
    products = [],
    customers = [],
    initialClientName = "",
    initialClientEmail = "",
    initialClientPhone = "",
    onSaved,
}: QuoteModalProps) {
    const [saving, setSaving] = useState(false)

    // Form state
    const [clientName, setClientName] = useState(initialClientName)
    const [clientEmail, setClientEmail] = useState(initialClientEmail)
    const [clientPhone, setClientPhone] = useState(initialClientPhone)
    const [notes, setNotes] = useState("")
    const [validUntil, setValidUntil] = useState("")
    const [discount, setDiscount] = useState("")
    const [paymentMethod, setPaymentMethod] = useState("")
    const [paymentType, setPaymentType] = useState("UPFRONT")
    const [installments, setInstallments] = useState("")
    const [items, setItems] = useState<QuoteItem[]>([emptyItem()])
    const [openCustomer, setOpenCustomer] = useState(false)

    // Sync initial values on open
    useEffect(() => {
        if (open) {
            setClientName(initialClientName)
            setClientEmail(initialClientEmail)
            setClientPhone(initialClientPhone)
            setNotes("")
            setValidUntil("")
            setDiscount("")
            setPaymentMethod("")
            setPaymentType("UPFRONT")
            setInstallments("")
            setItems([emptyItem()])
        }
    }, [open, initialClientName, initialClientEmail, initialClientPhone])

    // Items helpers
    const addItem = () => setItems(prev => [...prev, emptyItem()])
    const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index))
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
                const s = services.find(s => s.id === id)
                if (s) updated[index] = { ...updated[index], serviceId: id, productId: null, description: s.name, unitPrice: s.price, totalPrice: updated[index].quantity * s.price }
            } else if (type === "product") {
                const p = products.find(p => p.id === id)
                if (p) updated[index] = { ...updated[index], productId: id, serviceId: null, description: p.name, unitPrice: p.price, totalPrice: updated[index].quantity * p.price }
            }
            return updated
        })
    }

    const itemsTotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
    const discountValue = parseCurrency(discount)
    const grandTotal = Math.max(0, itemsTotal - discountValue)

    const handleSave = async () => {
        if (!clientName.trim()) { toast.error("Nome do cliente é obrigatório"); return }
        const validItems = items.filter(i => i.description.trim())
        if (validItems.length === 0) { toast.error("Adicione ao menos um item ao orçamento"); return }

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
                onOpenChange(false)
                onSaved?.(res.quote?.number ?? 0)
            }
        } catch {
            toast.error("Erro ao criar orçamento")
        } finally {
            setSaving(false)
        }
    }

    const canSave = clientName.trim() && items.some(i => i.description.trim())

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                            <Label className="text-sm font-medium">
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
                                        <span className="truncate">{clientName || "Selecione ou digite..."}</span>
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
                                                Nenhum cliente encontrado.<br />
                                                <span className="text-muted-foreground text-xs">Será salvo como novo cadastro.</span>
                                            </CommandEmpty>
                                            <CommandGroup heading="Clientes da Base">
                                                {customers.map((c) => (
                                                    <CommandItem
                                                        key={c.id}
                                                        value={c.name}
                                                        onSelect={() => {
                                                            setClientName(c.name)
                                                            if (c.email && !clientEmail) setClientEmail(c.email)
                                                            if (c.phone && !clientPhone) setClientPhone(c.phone)
                                                            setOpenCustomer(false)
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", clientName === c.name ? "opacity-100" : "opacity-0")} />
                                                        {c.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                                Se não existir, um novo cadastro será criado ao aprovar.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Válido até</Label>
                            <Input
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
                            <Label className="text-sm font-medium flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> E-mail
                            </Label>
                            <Input
                                type="email"
                                placeholder="cliente@email.com"
                                value={clientEmail}
                                onChange={e => setClientEmail(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Telefone
                            </Label>
                            <Input
                                type="tel"
                                placeholder="(00) 00000-0000"
                                value={clientPhone}
                                onChange={e => setClientPhone(maskPhone(e.target.value))}
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
                                                                        <SelectLabel className="text-xs text-muted-foreground">Produtos</SelectLabel>
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
                                                            const masked = maskCurrency(e.target.value)
                                                            updateItem(idx, "unitPrice", parseCurrency(masked))
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

                    {/* Payment */}
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
                                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
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
                                        type="number" min="2" max="999" placeholder="Ex: 3"
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
                        <Label className="text-sm font-medium">Observações</Label>
                        <Textarea
                            placeholder="Condições de pagamento, prazo de execução, garantias..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="rounded-xl resize-none"
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !canSave}
                        className="rounded-xl gradient-primary text-white hover:opacity-90"
                    >
                        {saving ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                        ) : (
                            <><CheckCircle2 className="mr-2 h-4 w-4" />Criar Orçamento</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
