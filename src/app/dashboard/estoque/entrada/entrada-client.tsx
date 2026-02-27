"use client"

import { useState, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    Package, Plus, Trash2, Loader2, FileText, Truck, Calculator,
    CheckCircle2, ClipboardList, Upload, PenLine, ArrowLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { DataTable } from "@/components/ui/data-table"
import CurrencyInput from "react-currency-input-field"
import { createPurchaseInvoice, deletePurchaseInvoice } from "@/app/actions/purchase-invoice"
import { ColumnDef } from "@tanstack/react-table"

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = { id: string; name: string; sku?: string | null; price: number }
type Supplier = { id: string; name: string }
type Conta = { id: string; name: string; type: string }

type ItemRow = {
    key: string
    // Produto existente
    productId?: string
    // Produto novo
    isNewProduct?: boolean
    productName: string
    productSku?: string
    productNcm?: string
    // Dados do item
    quantity: number
    rawUnitCost: number
    subtotal: number
    allocatedCost: number
}

type Invoice = {
    id: string
    invoiceNumber: string | null
    entryDate: string
    subtotal: number
    totalCost: number
    paymentStatus: string
    supplier: { id: string; name: string } | null
    items: any[]
    _count: { items: number }
}

type EntryMode = null | "xml" | "manual"

// ─── XML NF-e Parser ──────────────────────────────────────────────────────────

function parseNFeXml(xmlText: string): {
    invoiceNumber?: string
    invoiceKey?: string
    supplierName?: string
    supplierDoc?: string
    entryDate?: string
    items: { name: string; ncm?: string; quantity: number; unitCost: number; sku?: string }[]
    freightCost: number
    totalTax: number
} {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlText, "text/xml")

    // Namespace-aware helper
    const getVal = (parent: Element, tags: string[]): string => {
        for (const tag of tags) {
            // Try without namespace
            let el = parent.getElementsByTagName(tag)[0]
            if (el?.textContent) return el.textContent.trim()
            // Try with nfe namespace prefix variations
            for (const ns of [`nfe:${tag}`, `ns:${tag}`]) {
                el = parent.getElementsByTagName(ns)[0]
                if (el?.textContent) return el.textContent.trim()
            }
        }
        return ""
    }

    // Invoice info
    const ide = doc.getElementsByTagName("ide")[0]
    const invoiceNumber = ide ? getVal(ide, ["nNF"]) : ""
    const dateStr = ide ? getVal(ide, ["dhEmi", "dEmi"]) : ""
    const entryDate = dateStr ? dateStr.substring(0, 10) : ""

    // Chave de acesso from protNFe or infNFe Id attribute
    let invoiceKey = ""
    const infNFe = doc.getElementsByTagName("infNFe")[0]
    if (infNFe) {
        const idAttr = infNFe.getAttribute("Id") || ""
        invoiceKey = idAttr.replace(/^NFe/, "")
    }
    if (!invoiceKey) {
        const chNFe = doc.getElementsByTagName("chNFe")[0]
        if (chNFe?.textContent) invoiceKey = chNFe.textContent.trim()
    }

    // Supplier (emit)
    const emit = doc.getElementsByTagName("emit")[0]
    const supplierName = emit ? getVal(emit, ["xNome", "xFant"]) : ""
    const supplierDoc = emit ? (getVal(emit, ["CNPJ"]) || getVal(emit, ["CPF"])) : ""

    // Items (det)
    const detEls = doc.getElementsByTagName("det")
    const items: { name: string; ncm?: string; quantity: number; unitCost: number; sku?: string }[] = []

    for (let i = 0; i < detEls.length; i++) {
        const det = detEls[i]
        const prod = det.getElementsByTagName("prod")[0]
        if (!prod) continue

        const name = getVal(prod, ["xProd"])
        const ncm = getVal(prod, ["NCM"])
        const sku = getVal(prod, ["cProd", "cEAN"])
        const quantity = parseFloat(getVal(prod, ["qCom", "qTrib"]) || "0")
        const unitCost = parseFloat(getVal(prod, ["vUnCom", "vUnTrib"]) || "0")

        if (name && quantity > 0) {
            items.push({ name, ncm: ncm || undefined, sku: sku || undefined, quantity, unitCost })
        }
    }

    // Freight (transp > vol > pesoB or ICMSTot > vFrete)
    const icmsTot = doc.getElementsByTagName("ICMSTot")[0]
    const freightCost = icmsTot ? parseFloat(getVal(icmsTot, ["vFrete"]) || "0") : 0

    // Total taxes from ICMSTot
    let totalTax = 0
    if (icmsTot) {
        const taxFields = ["vICMS", "vST", "vIPI", "vPIS", "vCOFINS", "vOutro"]
        for (const field of taxFields) {
            totalTax += parseFloat(getVal(icmsTot, [field]) || "0")
        }
    }

    return { invoiceNumber, invoiceKey, supplierName, supplierDoc, entryDate, items, freightCost, totalTax }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    products: Product[]
    suppliers: Supplier[]
    invoices: Invoice[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EntradaMercadoriasClient({ products, suppliers, invoices: initialInvoices }: Props) {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // ── Dialogs ──
    const [choiceOpen, setChoiceOpen] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [entryMode, setEntryMode] = useState<EntryMode>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // ── NF Data ──
    const [invoiceNumber, setInvoiceNumber] = useState("")
    const [invoiceKey, setInvoiceKey] = useState("")
    const [supplierId, setSupplierId] = useState("")
    const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0])
    const [notes, setNotes] = useState("")

    // ── Items ──
    const [items, setItems] = useState<ItemRow[]>([])

    // ── New item form ──
    const [itemMode, setItemMode] = useState<"catalog" | "new">("catalog")
    const [selectedProductId, setSelectedProductId] = useState("")
    const [newProductName, setNewProductName] = useState("")
    const [newProductSku, setNewProductSku] = useState("")
    const [newProductNcm, setNewProductNcm] = useState("")
    const [itemQuantity, setItemQuantity] = useState(1)
    const [itemRawCost, setItemRawCost] = useState(0)

    // ── Costs ──
    const [freightCost, setFreightCost] = useState(0)
    const [taxPercent, setTaxPercent] = useState(0)
    const [otherCostsList, setOtherCostsList] = useState<{ id: string; description: string; value: number }[]>([])

    // ── Calculations ──
    const otherCosts = useMemo(() =>
        otherCostsList.reduce((sum, c) => sum + c.value, 0), [otherCostsList])

    const subtotal = useMemo(() =>
        items.reduce((sum, item) => sum + item.subtotal, 0), [items])

    const taxAmount = useMemo(() =>
        (subtotal + freightCost + otherCosts) * (taxPercent / 100), [subtotal, freightCost, otherCosts, taxPercent])

    const totalCost = useMemo(() =>
        subtotal + freightCost + otherCosts + taxAmount, [subtotal, freightCost, otherCosts, taxAmount])

    const allocatedItems = useMemo(() => {
        if (items.length === 0) return []
        const extras = freightCost + otherCosts + taxAmount

        return items.map(item => {
            const proportion = subtotal > 0 ? item.subtotal / subtotal : 0
            const extraShare = extras * proportion
            const allocatedCost = item.quantity > 0
                ? (item.subtotal + extraShare) / item.quantity
                : 0
            return { ...item, allocatedCost: Math.round(allocatedCost * 100) / 100 }
        })
    }, [items, freightCost, otherCosts, taxAmount, subtotal])

    // ── Add Item (catalog or new) ──
    const addItem = useCallback(() => {
        if (itemQuantity <= 0 || itemRawCost <= 0) {
            toast.error("Preencha quantidade e custo unitário.")
            return
        }

        if (itemMode === "catalog") {
            if (!selectedProductId) {
                toast.error("Selecione um produto do catálogo.")
                return
            }
            const product = products.find(p => p.id === selectedProductId)
            if (!product) return

            const existing = items.find(i => i.productId === selectedProductId)
            if (existing) {
                toast.error("Produto já adicionado.")
                return
            }

            setItems(prev => [...prev, {
                key: `${selectedProductId}-${Date.now()}`,
                productId: selectedProductId,
                productName: product.name,
                isNewProduct: false,
                quantity: itemQuantity,
                rawUnitCost: itemRawCost,
                subtotal: itemQuantity * itemRawCost,
                allocatedCost: 0,
            }])
        } else {
            if (!newProductName.trim()) {
                toast.error("Informe o nome do produto.")
                return
            }

            setItems(prev => [...prev, {
                key: `new-${Date.now()}`,
                isNewProduct: true,
                productName: newProductName.trim(),
                productSku: newProductSku.trim() || undefined,
                productNcm: newProductNcm.trim() || undefined,
                quantity: itemQuantity,
                rawUnitCost: itemRawCost,
                subtotal: itemQuantity * itemRawCost,
                allocatedCost: 0,
            }])
        }

        // Reset fields
        setSelectedProductId("")
        setNewProductName("")
        setNewProductSku("")
        setNewProductNcm("")
        setItemQuantity(1)
        setItemRawCost(0)
    }, [itemMode, selectedProductId, newProductName, newProductSku, newProductNcm, itemQuantity, itemRawCost, products, items])

    const removeItem = useCallback((key: string) => {
        setItems(prev => prev.filter(i => i.key !== key))
    }, [])

    // ── Reset Form ──
    const resetForm = () => {
        setInvoiceNumber("")
        setInvoiceKey("")
        setSupplierId("")
        setEntryDate(new Date().toISOString().split("T")[0])
        setNotes("")
        setItems([])
        setFreightCost(0)
        setTaxPercent(0)
        setOtherCostsList([])
        setItemMode("catalog")
        setEntryMode(null)
    }

    // ── Handle XML Upload ──
    const handleXmlUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                const xmlText = evt.target?.result as string
                const parsed = parseNFeXml(xmlText)

                // Populate NF data
                if (parsed.invoiceNumber) setInvoiceNumber(parsed.invoiceNumber)
                if (parsed.invoiceKey) setInvoiceKey(parsed.invoiceKey)
                if (parsed.entryDate) setEntryDate(parsed.entryDate)
                if (parsed.freightCost > 0) setFreightCost(parsed.freightCost)

                // Calculate tax % from total tax vs subtotal
                const xmlSubtotal = parsed.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0)
                if (parsed.totalTax > 0 && xmlSubtotal > 0) {
                    const pct = Math.round((parsed.totalTax / xmlSubtotal) * 10000) / 100
                    setTaxPercent(pct)
                }

                // Try to match supplier by name
                if (parsed.supplierName) {
                    const match = suppliers.find(s =>
                        s.name.toLowerCase().includes(parsed.supplierName!.toLowerCase()) ||
                        parsed.supplierName!.toLowerCase().includes(s.name.toLowerCase())
                    )
                    if (match) setSupplierId(match.id)
                    else setNotes(`Fornecedor NF: ${parsed.supplierName}${parsed.supplierDoc ? ` (${parsed.supplierDoc})` : ""}`)
                }

                // Populate items — try to match by name/SKU or create as new
                const newItems: ItemRow[] = parsed.items.map((pi, idx) => {
                    const matchedProduct = products.find(p =>
                        (pi.sku && p.sku && p.sku === pi.sku) ||
                        p.name.toLowerCase() === pi.name.toLowerCase()
                    )

                    return {
                        key: `xml-${idx}-${Date.now()}`,
                        productId: matchedProduct?.id,
                        isNewProduct: !matchedProduct,
                        productName: matchedProduct?.name || pi.name,
                        productSku: pi.sku,
                        productNcm: pi.ncm,
                        quantity: pi.quantity,
                        rawUnitCost: Math.round(pi.unitCost * 100) / 100,
                        subtotal: Math.round(pi.quantity * pi.unitCost * 100) / 100,
                        allocatedCost: 0,
                    }
                })

                setItems(newItems)
                setChoiceOpen(false)
                setEntryMode("xml")
                setModalOpen(true)

                toast.success(`XML processado: ${newItems.length} item(ns) encontrado(s).`)
            } catch (err) {
                console.error("Erro ao processar XML:", err)
                toast.error("Erro ao processar o arquivo XML. Verifique o formato.")
            }
        }
        reader.readAsText(file)

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = ""
    }, [products, suppliers])

    // ── Submit ──
    const handleSubmit = async () => {
        if (items.length === 0) {
            toast.error("Adicione pelo menos um item à nota de entrada.")
            return
        }

        setIsSubmitting(true)
        try {
            const result = await createPurchaseInvoice({
                invoiceNumber: invoiceNumber || null,
                invoiceKey: invoiceKey || null,
                supplierId: supplierId || null,
                entryDate: new Date(entryDate + "T12:00:00"),
                freightCost,
                taxPercent: taxPercent / 100,
                otherCosts,
                notes: notes || null,
                items: items.map(item => ({
                    productId: item.productId,
                    newProduct: item.isNewProduct ? {
                        name: item.productName,
                        sku: item.productSku,
                        ncm: item.productNcm,
                    } : undefined,
                    quantity: item.quantity,
                    rawUnitCost: item.rawUnitCost,
                })),
            })

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Nota de entrada processada com sucesso!")
                resetForm()
                setModalOpen(false)
                router.refresh()
            }
        } catch (error) {
            toast.error("Erro ao processar nota de entrada.")
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // ── Delete Invoice ──
    const handleDelete = async (id: string) => {
        if (!confirm("Excluir esta nota de entrada? O estoque e as transações vinculadas serão revertidos.")) return
        const result = await deletePurchaseInvoice(id)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Nota de entrada excluída.")
            router.refresh()
        }
    }

    // ── History table columns ──
    const invoiceColumns: ColumnDef<Invoice>[] = [
        {
            accessorKey: "entryDate",
            header: "Data",
            cell: ({ row }) => new Date(row.original.entryDate).toLocaleDateString("pt-BR"),
        },
        {
            accessorKey: "invoiceNumber",
            header: "Nº NF",
            cell: ({ row }) => row.original.invoiceNumber || "—",
        },
        {
            accessorKey: "supplier",
            header: "Fornecedor",
            cell: ({ row }) => row.original.supplier?.name || "—",
        },
        {
            id: "itemCount",
            header: "Itens",
            cell: ({ row }) => row.original._count?.items || row.original.items?.length || 0,
        },
        {
            accessorKey: "totalCost",
            header: "Total",
            cell: ({ row }) => `R$ ${Number(row.original.totalCost).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        },
        {
            accessorKey: "paymentStatus",
            header: "Pgto",
            cell: ({ row }) => (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${row.original.paymentStatus === "PAID"
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-amber-500/10 text-amber-500"
                    }`}>
                    {row.original.paymentStatus === "PAID" ? "Pago" : "Pendente"}
                </span>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.id)}
                    className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                </Button>
            ),
        },
    ]

    // ── Open flow ──
    const openNewEntry = () => {
        resetForm()
        setChoiceOpen(true)
    }

    const chooseManual = () => {
        setChoiceOpen(false)
        setEntryMode("manual")
        setModalOpen(true)
    }

    const chooseXml = () => {
        fileInputRef.current?.click()
    }

    return (
        <div className="space-y-6">
            {/* Hidden file input for XML */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".xml"
                className="hidden"
                onChange={handleXmlUpload}
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Entrada de Mercadorias</h1>
                <Button onClick={openNewEntry}
                    className="rounded-xl gradient-primary text-white hover:opacity-90 gap-2">
                    <Plus className="h-4 w-4" /> Nova Entrada
                </Button>
            </div>

            {/* History Table */}
            <DataTable
                columns={invoiceColumns}
                data={initialInvoices}
                enableSearch
                searchPlaceholder="Filtrar por nº NF, fornecedor..."
            />

            {/* ━━━ Choice Dialog ━━━ */}
            <Dialog open={choiceOpen} onOpenChange={setChoiceOpen}>
                <DialogContent className="sm:max-w-[520px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl">Como deseja dar entrada?</DialogTitle>
                        <DialogDescription className="text-center">
                            Escolha como deseja registrar a entrada de mercadorias
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-6">
                        {/* XML Card */}
                        <button onClick={chooseXml}
                            className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-muted-foreground/20 
                                       p-6 transition-all hover:border-primary hover:bg-primary/5 hover:shadow-lg cursor-pointer">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                <Upload className="h-8 w-8 text-primary" />
                            </div>
                            <div className="text-center">
                                <p className="font-semibold text-sm">Carregar XML</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Importe o arquivo XML da NF-e e os dados serão preenchidos automaticamente
                                </p>
                            </div>
                        </button>

                        {/* Manual Card */}
                        <button onClick={chooseManual}
                            className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-muted-foreground/20 
                                       p-6 transition-all hover:border-primary hover:bg-primary/5 hover:shadow-lg cursor-pointer">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                <PenLine className="h-8 w-8 text-primary" />
                            </div>
                            <div className="text-center">
                                <p className="font-semibold text-sm">Entrada Manual</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Preencha os dados da nota fiscal e dos produtos manualmente
                                </p>
                            </div>
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ━━━ Main Entry Modal ━━━ */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-[850px] max-h-[92vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                                <ClipboardList className="h-5 w-5 text-primary" />
                            </div>
                            Nova Entrada de Mercadoria
                            {entryMode === "xml" && (
                                <span className="ml-2 text-xs font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                    via XML
                                </span>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Dê entrada nos produtos da nota fiscal. O custo será rateado automaticamente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* ── Dados da NF ── */}
                        <div className="rounded-xl border p-4 space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Dados da Nota Fiscal
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Nº NF-e</Label>
                                    <Input placeholder="000.001.234" className="rounded-xl mt-1"
                                        value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                                </div>
                                <div>
                                    <Label>Data de Entrada</Label>
                                    <Input type="date" className="rounded-xl mt-1"
                                        value={entryDate} onChange={e => setEntryDate(e.target.value)} />
                                </div>
                                <div className="col-span-2">
                                    <Label>Chave de Acesso NF-e (44 dígitos)</Label>
                                    <Input placeholder="Chave de acesso..." className="rounded-xl mt-1"
                                        value={invoiceKey} onChange={e => setInvoiceKey(e.target.value)} maxLength={44} />
                                </div>
                                <div>
                                    <Label>Fornecedor</Label>
                                    <Select value={supplierId} onValueChange={setSupplierId}>
                                        <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Nenhum</SelectItem>
                                            {suppliers.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Observações</Label>
                                    <Input placeholder="Obs..." className="rounded-xl mt-1"
                                        value={notes} onChange={e => setNotes(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* ── Itens ── */}
                        <div className="rounded-xl border p-4 space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Package className="h-4 w-4" /> Itens da Nota
                            </h3>

                            {/* Catalog vs New toggle */}
                            <div className="flex gap-2">
                                <Button variant={itemMode === "catalog" ? "default" : "outline"}
                                    onClick={() => setItemMode("catalog")}
                                    className="rounded-xl text-xs h-8 gap-1" size="sm">
                                    <Package className="h-3.5 w-3.5" /> Do Catálogo
                                </Button>
                                <Button variant={itemMode === "new" ? "default" : "outline"}
                                    onClick={() => setItemMode("new")}
                                    className="rounded-xl text-xs h-8 gap-1" size="sm">
                                    <Plus className="h-3.5 w-3.5" /> Novo Produto
                                </Button>
                            </div>

                            {/* Add item row */}
                            {itemMode === "catalog" ? (
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-5">
                                        <Label className="text-xs">Produto</Label>
                                        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                            <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Selecione o produto..." /></SelectTrigger>
                                            <SelectContent>
                                                {products.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name} {p.sku ? `(${p.sku})` : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs">Quantidade</Label>
                                        <Input type="number" min={1} className="rounded-xl mt-1"
                                            value={itemQuantity} onChange={e => setItemQuantity(Number(e.target.value))} />
                                    </div>
                                    <div className="col-span-3">
                                        <Label className="text-xs">Custo Unit. (NF)</Label>
                                        <CurrencyInput placeholder="R$ 0,00" decimalsLimit={2}
                                            onValueChange={v => setItemRawCost(v ? parseFloat(v.replace(",", ".")) : 0)}
                                            prefix="R$ " value={itemRawCost || ""}
                                            className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Button onClick={addItem} className="rounded-xl w-full gap-1" variant="outline">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-dashed">
                                    <div className="grid grid-cols-12 gap-2 items-end">
                                        <div className="col-span-5">
                                            <Label className="text-xs">Nome do Produto *</Label>
                                            <Input placeholder="Nome do produto" className="rounded-xl mt-1"
                                                value={newProductName} onChange={e => setNewProductName(e.target.value)} />
                                        </div>
                                        <div className="col-span-3">
                                            <Label className="text-xs">SKU</Label>
                                            <Input placeholder="SKU" className="rounded-xl mt-1"
                                                value={newProductSku} onChange={e => setNewProductSku(e.target.value)} />
                                        </div>
                                        <div className="col-span-2">
                                            <Label className="text-xs">NCM</Label>
                                            <Input placeholder="NCM" className="rounded-xl mt-1"
                                                value={newProductNcm} onChange={e => setNewProductNcm(e.target.value)} />
                                        </div>

                                    </div>
                                    <div className="grid grid-cols-12 gap-2 items-end">
                                        <div className="col-span-5"></div>
                                        <div className="col-span-2">
                                            <Label className="text-xs">Quantidade</Label>
                                            <Input type="number" min={1} className="rounded-xl mt-1"
                                                value={itemQuantity} onChange={e => setItemQuantity(Number(e.target.value))} />
                                        </div>
                                        <div className="col-span-3">
                                            <Label className="text-xs">Custo Unit. (NF)</Label>
                                            <CurrencyInput placeholder="R$ 0,00" decimalsLimit={2}
                                                onValueChange={v => setItemRawCost(v ? parseFloat(v.replace(",", ".")) : 0)}
                                                prefix="R$ " value={itemRawCost || ""}
                                                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <Button onClick={addItem} className="rounded-xl w-full gap-1" variant="outline">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Items table */}
                            {allocatedItems.length > 0 && (
                                <div className="rounded-lg border overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="text-left p-2 font-medium">Produto</th>
                                                <th className="text-center p-2 font-medium">Qtd</th>
                                                <th className="text-right p-2 font-medium">Custo NF</th>
                                                <th className="text-right p-2 font-medium">Subtotal</th>
                                                <th className="text-right p-2 font-medium text-primary">Custo Rateado</th>
                                                <th className="p-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allocatedItems.map(item => (
                                                <tr key={item.key} className="border-t">
                                                    <td className="p-2">
                                                        <div className="font-medium">{item.productName}</div>
                                                        {item.isNewProduct && (
                                                            <span className="text-[10px] text-amber-500 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                                                                Novo
                                                            </span>
                                                        )}
                                                        {item.productSku && (
                                                            <span className="text-[10px] text-muted-foreground ml-1">
                                                                SKU: {item.productSku}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-2 text-center">{item.quantity}</td>
                                                    <td className="p-2 text-right">
                                                        R$ {item.rawUnitCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="p-2 text-right">
                                                        R$ {item.subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="p-2 text-right font-semibold text-primary">
                                                        R$ {item.allocatedCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="p-2">
                                                        <Button variant="ghost" size="sm" onClick={() => removeItem(item.key)}
                                                            className="text-destructive hover:text-destructive h-7 w-7 p-0">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* ── Custos Adicionais ── */}
                        <div className="rounded-xl border p-4 space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Truck className="h-4 w-4" /> Custos Adicionais
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Frete</Label>
                                    <CurrencyInput placeholder="R$ 0,00" decimalsLimit={2}
                                        onValueChange={v => setFreightCost(v ? parseFloat(v.replace(",", ".")) : 0)}
                                        prefix="R$ " value={freightCost || ""}
                                        className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Impostos (%)</Label>
                                    <Input type="number" min={0} max={100} step={0.01} placeholder="0"
                                        className="rounded-xl mt-1"
                                        value={taxPercent || ""} onChange={e => setTaxPercent(Number(e.target.value))} />
                                </div>
                                <div className="col-span-full space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label>Outros Custos</Label>
                                        <Button variant="outline" size="sm" className="rounded-xl h-7 gap-1 text-xs"
                                            onClick={() => setOtherCostsList(prev => [...prev, { id: `oc-${Date.now()}`, description: "", value: 0 }])}>
                                            <Plus className="h-3 w-3" /> Adicionar
                                        </Button>
                                    </div>
                                    {otherCostsList.map((oc, idx) => (
                                        <div key={oc.id} className="flex gap-2 items-center">
                                            <div className="flex-1 min-w-0">
                                                <Input placeholder="Descrição do custo"
                                                    className="rounded-xl text-sm h-8 w-full"
                                                    value={oc.description}
                                                    onChange={e => setOtherCostsList(prev =>
                                                        prev.map(c => c.id === oc.id ? { ...c, description: e.target.value } : c)
                                                    )} />
                                            </div>
                                            <div className="w-[140px] shrink-0">
                                                <CurrencyInput placeholder="R$ 0,00" decimalsLimit={2}
                                                    onValueChange={v => setOtherCostsList(prev =>
                                                        prev.map(c => c.id === oc.id ? { ...c, value: v ? parseFloat(v.replace(",", ".")) : 0 } : c)
                                                    )}
                                                    prefix="R$ " value={oc.value || ""}
                                                    className="flex h-8 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                />
                                            </div>
                                            <Button variant="ghost" size="sm"
                                                className="h-7 w-7 p-0 shrink-0 text-destructive hover:text-destructive"
                                                onClick={() => setOtherCostsList(prev => prev.filter(c => c.id !== oc.id))}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                    {otherCostsList.length === 0 && (
                                        <p className="text-xs text-muted-foreground italic">Nenhum custo adicional adicionado.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Resumo ── */}
                        {items.length > 0 && (
                            <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Calculator className="h-4 w-4" /> Resumo da Entrada
                                </h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-muted-foreground">Subtotal (itens):</span>
                                    <span className="text-right">R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                    <span className="text-muted-foreground">Frete:</span>
                                    <span className="text-right">R$ {freightCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                    <span className="text-muted-foreground">Outros custos:</span>
                                    <span className="text-right">R$ {otherCosts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                    {otherCostsList.filter(c => c.description).map(c => (
                                        <>
                                            <span key={`lbl-${c.id}`} className="text-muted-foreground pl-3 text-xs">↳ {c.description}:</span>
                                            <span key={`val-${c.id}`} className="text-right text-xs">R$ {c.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                        </>
                                    ))}
                                    <span className="text-muted-foreground">Impostos ({taxPercent}%):</span>
                                    <span className="text-right">R$ {taxAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                    <span className="font-bold text-base border-t pt-2">Total:</span>
                                    <span className="font-bold text-base text-right border-t pt-2 text-primary">
                                        R$ {totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        )}

                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isSubmitting}
                            className="rounded-xl">
                            Cancelar
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting || items.length === 0}
                            className="rounded-xl gradient-primary text-white hover:opacity-90">
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</>
                            ) : (
                                <><CheckCircle2 className="mr-2 h-4 w-4" />Dar Entrada</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
