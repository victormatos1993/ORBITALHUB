"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { createSupplierQuote, updateSupplierQuote } from "@/app/actions/supplier-quote"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface QuoteItem {
    description: string
    quantity: number
    unitPrice: number
}

interface SupplierQuoteData {
    id: string
    description: string | null
    notes: string | null
    validUntil: Date | null
    items: { description: string; quantity: number; unitPrice: number | { toNumber?: () => number } }[]
}

interface SupplierQuoteModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    supplierId: string
    initialData?: SupplierQuoteData | null
    onSuccess?: () => void
}

const emptyItem = (): QuoteItem => ({ description: "", quantity: 1, unitPrice: 0 })

function toNum(v: number | { toNumber?: () => number } | any): number {
    if (typeof v === "number") return v
    if (v && typeof v.toNumber === "function") return v.toNumber()
    return Number(v) || 0
}

export function SupplierQuoteModal({
    open,
    onOpenChange,
    supplierId,
    initialData,
    onSuccess,
}: SupplierQuoteModalProps) {
    const isEdit = !!initialData

    const [description, setDescription] = useState(initialData?.description || "")
    const [notes, setNotes] = useState(initialData?.notes || "")
    const [validUntil, setValidUntil] = useState(
        initialData?.validUntil ? new Date(initialData.validUntil).toISOString().split("T")[0] : ""
    )
    const [items, setItems] = useState<QuoteItem[]>(
        initialData?.items?.length
            ? initialData.items.map(i => ({
                description: i.description,
                quantity: i.quantity,
                unitPrice: toNum(i.unitPrice),
            }))
            : [emptyItem()]
    )
    const [submitting, setSubmitting] = useState(false)

    const addItem = () => setItems([...items, emptyItem()])

    const removeItem = (index: number) => {
        if (items.length <= 1) return
        setItems(items.filter((_, i) => i !== index))
    }

    const updateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
        const updated = [...items]
        if (field === "description") {
            updated[index].description = value as string
        } else if (field === "quantity") {
            updated[index].quantity = Math.max(1, Number(value) || 1)
        } else if (field === "unitPrice") {
            updated[index].unitPrice = Math.max(0, Number(value) || 0)
        }
        setItems(updated)
    }

    const totalGeral = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

    const handleSubmit = async () => {
        const validItems = items.filter(i => i.description.trim())
        if (validItems.length === 0) {
            toast.error("Adicione pelo menos um item com descrição.")
            return
        }

        setSubmitting(true)
        try {
            const payload = {
                supplierId,
                description: description || undefined,
                notes: notes || undefined,
                validUntil: validUntil || null,
                items: validItems,
            }

            const result = isEdit
                ? await updateSupplierQuote(initialData!.id, payload)
                : await createSupplierQuote(payload)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(isEdit ? "Orçamento atualizado!" : "Orçamento cadastrado!")
                onOpenChange(false)
                onSuccess?.()
            }
        } catch (error) {
            toast.error("Erro ao salvar orçamento.")
            console.error(error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:!max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Editar Orçamento" : "Novo Orçamento de Compra"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                    {/* Descrição */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Descrição</label>
                        <Input
                            placeholder="Ex: Orçamento de materiais jan/2026"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            disabled={submitting}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Válido até</label>
                        <Input
                            type="date"
                            value={validUntil}
                            onChange={e => setValidUntil(e.target.value)}
                            disabled={submitting}
                            className="max-w-[220px]"
                        />
                    </div>

                    {/* Itens */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold">Itens do Orçamento</label>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="gap-1 rounded-xl text-xs"
                                onClick={addItem}
                                disabled={submitting}
                            >
                                <Plus className="h-3.5 w-3.5" /> Adicionar
                            </Button>
                        </div>

                        <div className="rounded-xl border overflow-hidden">
                            {/* Header */}
                            <div className="grid grid-cols-[1fr_80px_120px_100px_40px] gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                                <span>Descrição</span>
                                <span className="text-center">Qtd</span>
                                <span className="text-right">Valor Unit.</span>
                                <span className="text-right">Total</span>
                                <span></span>
                            </div>

                            {/* Rows */}
                            {items.map((item, i) => (
                                <div
                                    key={i}
                                    className="grid grid-cols-[1fr_80px_120px_100px_40px] gap-2 px-3 py-2 border-t items-center"
                                >
                                    <Input
                                        placeholder="Produto / Material"
                                        value={item.description}
                                        onChange={e => updateItem(i, "description", e.target.value)}
                                        disabled={submitting}
                                        className="h-8 text-sm"
                                    />
                                    <Input
                                        type="number"
                                        min={1}
                                        value={item.quantity}
                                        onChange={e => updateItem(i, "quantity", e.target.value)}
                                        disabled={submitting}
                                        className="h-8 text-sm text-center"
                                    />
                                    <Input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={item.unitPrice || ""}
                                        onChange={e => updateItem(i, "unitPrice", e.target.value)}
                                        disabled={submitting}
                                        className="h-8 text-sm text-right"
                                        placeholder="0,00"
                                    />
                                    <span className="text-sm font-medium text-right">
                                        {(item.quantity * item.unitPrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                    </span>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={() => removeItem(i)}
                                        disabled={submitting || items.length <= 1}
                                    >
                                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                </div>
                            ))}

                            {/* Total */}
                            <div className="grid grid-cols-[1fr_80px_120px_100px_40px] gap-2 px-3 py-3 border-t bg-muted/30">
                                <span className="text-sm font-semibold col-span-3 text-right">Total Geral:</span>
                                <span className="text-sm font-bold text-primary text-right">
                                    {totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </span>
                                <span></span>
                            </div>
                        </div>
                    </div>

                    {/* Observações — após o total */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Observações</label>
                        <Textarea
                            placeholder="Detalhes adicionais do orçamento, condições, prazos de entrega..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            disabled={submitting}
                            rows={4}
                        />
                    </div>

                    {/* Ações */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => onOpenChange(false)}
                            disabled={submitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="rounded-xl gap-2"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {isEdit ? "Salvar Alterações" : "Cadastrar Orçamento"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
