"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Package, CheckCircle2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import CurrencyInput from "react-currency-input-field"
import { createProduct, updateProduct } from "@/app/actions/product"

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
    name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
    description: z.string().optional().or(z.literal("")),
    price: z.coerce.number().min(0, "O preço não pode ser negativo"),
    stockQuantity: z.coerce.number().int().min(0, "A quantidade não pode ser negativa"),
    manageStock: z.boolean().default(true),
    ncm: z.string().optional().or(z.literal("")),
    sku: z.string().optional().or(z.literal("")),
})

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ProductModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Se fornecido, entra em modo edição */
    editingProduct?: {
        id: string
        name: string
        description?: string | null
        price: number
        stockQuantity: number
        manageStock: boolean
        ncm?: string | null
        sku?: string | null
    } | null
    /** Chamado após salvar com sucesso */
    onSaved?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductModal({ open, onOpenChange, editingProduct, onSaved }: ProductModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const isEditing = !!editingProduct

    const form = useForm<FormValues>({
        resolver: zodResolver(schema) as any,
        defaultValues: {
            name: "",
            description: "",
            price: 0,
            stockQuantity: 0,
            manageStock: true,
            ncm: "",
            sku: "",
        },
    })

    // Preenche o form ao abrir em modo edição
    useEffect(() => {
        if (open) {
            if (editingProduct) {
                form.reset({
                    name: editingProduct.name,
                    description: editingProduct.description || "",
                    price: editingProduct.price,
                    stockQuantity: editingProduct.stockQuantity,
                    manageStock: editingProduct.manageStock,
                    ncm: editingProduct.ncm || "",
                    sku: editingProduct.sku || "",
                })
            } else {
                form.reset({
                    name: "", description: "", price: 0, stockQuantity: 0,
                    manageStock: true, ncm: "", sku: "",
                })
            }
        }
    }, [open, editingProduct, form])

    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true)
        try {
            const payload = {
                name: data.name,
                description: data.description || null,
                price: data.price,
                stockQuantity: data.stockQuantity,
                ncm: data.ncm || null,
                sku: data.sku || null,
            }

            if (isEditing && editingProduct) {
                const result = await updateProduct(editingProduct.id, payload)
                if (result.error) {
                    toast.error(result.error)
                } else {
                    toast.success("Produto atualizado com sucesso!")
                    onOpenChange(false)
                    onSaved?.()
                }
            } else {
                const result = await createProduct(payload)
                if (result.error) {
                    toast.error(result.error)
                } else {
                    toast.success("Produto criado com sucesso!")
                    onOpenChange(false)
                    onSaved?.()
                }
            }
        } catch (error) {
            toast.error("Ocorreu um erro ao salvar.")
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const watchManageStock = form.watch("manageStock")

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                            <Package className="h-5 w-5 text-primary" />
                        </div>
                        {isEditing ? "Editar Produto" : "Novo Produto"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Altere os dados do produto."
                            : "Cadastre um novo produto no seu catálogo."
                        }
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                            {/* Nome */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>
                                            Nome do Produto <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Nome do produto"
                                                className="rounded-xl"
                                                autoFocus
                                                {...field}
                                                disabled={isSubmitting}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* SKU */}
                            <FormField
                                control={form.control}
                                name="sku"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SKU / Código</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Código do produto"
                                                className="rounded-xl"
                                                {...field}
                                                disabled={isSubmitting}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* NCM */}
                            <FormField
                                control={form.control}
                                name="ncm"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>NCM</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Código NCM"
                                                className="rounded-xl"
                                                {...field}
                                                disabled={isSubmitting}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Preço */}
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Preço de Venda <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <CurrencyInput
                                                id="product-modal-price"
                                                placeholder="R$ 0,00"
                                                defaultValue={field.value}
                                                decimalsLimit={2}
                                                onValueChange={(value) => {
                                                    field.onChange(value ? parseFloat(value.replace(",", ".")) : 0)
                                                }}
                                                prefix="R$ "
                                                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                disabled={isSubmitting}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Estoque ilimitado */}
                            <FormField
                                control={form.control}
                                name="manageStock"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border p-4">
                                        <FormControl>
                                            <Checkbox
                                                checked={!field.value}
                                                onCheckedChange={(checked) => {
                                                    field.onChange(!checked)
                                                    if (checked) form.setValue("stockQuantity", 0)
                                                }}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Estoque Ilimitado</FormLabel>
                                            <p className="text-sm text-muted-foreground">
                                                Marque se não há limite de estoque (ex: serviços digitais).
                                            </p>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {/* Quantidade em estoque */}
                            {watchManageStock && (
                                <FormField
                                    control={form.control}
                                    name="stockQuantity"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Quantidade em Estoque</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    className="rounded-xl"
                                                    {...field}
                                                    onChange={e => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                                                    disabled={isSubmitting}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {/* Descrição */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Descrição</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Descrição detalhada do produto"
                                                className="resize-none rounded-xl"
                                                rows={3}
                                                {...field}
                                                disabled={isSubmitting}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                                className="rounded-xl"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="rounded-xl gradient-primary text-white hover:opacity-90"
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                                ) : (
                                    <><CheckCircle2 className="mr-2 h-4 w-4" />{isEditing ? "Salvar" : "Criar Produto"}</>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
