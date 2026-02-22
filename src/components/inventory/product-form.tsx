"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createProduct, updateProduct } from "@/app/actions/product"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"

import CurrencyInput from "react-currency-input-field"

const productFormSchema = z.object({
    name: z.string().min(2, {
        message: "O nome deve ter pelo menos 2 caracteres.",
    }),
    description: z.string().optional().or(z.literal('')),
    price: z.coerce.number().min(0, "O preço não pode ser negativo"),
    stockQuantity: z.coerce.number().int().min(0, "A quantidade não pode ser negativa"),
    manageStock: z.boolean().default(true),
    ncm: z.string().optional().or(z.literal('')),
    sku: z.string().optional().or(z.literal('')),
})

type ProductFormValues = z.infer<typeof productFormSchema>

interface ProductFormProps {
    initialData?: {
        id: string
        name: string
        description?: string | null
        price: number
        stockQuantity: number
        manageStock: boolean
        ncm?: string | null
    }
}

export function ProductForm({ initialData }: ProductFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productFormSchema) as any,
        defaultValues: {
            name: initialData?.name || "",
            description: initialData?.description || "",
            price: initialData?.price || 0,
            stockQuantity: initialData?.stockQuantity || 0,
            manageStock: initialData?.manageStock ?? true,
            ncm: initialData?.ncm || "",
            sku: (initialData as any)?.sku || "",
        },
    })




    async function onSubmit(data: ProductFormValues) {
        setIsSubmitting(true)
        try {
            const formattedData = {
                name: data.name,
                description: data.description || null,
                price: data.price,
                stockQuantity: data.stockQuantity,
                ncm: data.ncm || null,
                sku: data.sku || null,
            }

            if (initialData) {
                const result = await updateProduct(initialData.id, formattedData)
                if (result.error) {
                    toast.error(result.error)
                } else {
                    toast.success("Produto atualizado com sucesso!")
                    router.push("/dashboard/cadastros/produtos")
                    router.refresh()
                }
            } else {
                const result = await createProduct(formattedData)
                if (result.error) {
                    toast.error(result.error)
                } else {
                    toast.success("Produto criado com sucesso!")
                    router.push("/dashboard/cadastros/produtos")
                    router.refresh()
                }
            }
        } catch (error) {
            toast.error("Ocorreu um erro ao salvar.")
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/cadastros/produtos">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">
                    {initialData ? "Editar Produto" : "Novo Produto"}
                </h1>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Nome do Produto</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nome do produto" {...field} disabled={isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="sku"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SKU / Código</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Código do produto" {...field} disabled={isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="ncm"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>NCM</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Código NCM" {...field} disabled={isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Preço de Venda</FormLabel>
                                        <FormControl>
                                            <CurrencyInput
                                                id="price"
                                                name="price"
                                                placeholder="R$ 0,00"
                                                defaultValue={field.value}
                                                decimalsLimit={2}
                                                onValueChange={(value) => {
                                                    field.onChange(value ? parseFloat(value.replace(',', '.')) : 0)
                                                }}
                                                prefix="R$ "
                                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                disabled={isSubmitting}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="manageStock"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                            <Checkbox
                                                checked={!field.value}
                                                onCheckedChange={(checked) => {
                                                    field.onChange(!checked)
                                                    if (checked) {
                                                        form.setValue("stockQuantity", 0)
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Estoque Ilimitado
                                            </FormLabel>
                                            <p className="text-sm text-muted-foreground">
                                                Marque esta opção se o produto/serviço não possui limite de estoque (ex: serviços).
                                            </p>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {form.watch("manageStock") && (
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
                                                    {...field}
                                                    onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                                    disabled={isSubmitting}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Descrição</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Descrição detalhada do produto"
                                                className="resize-none"
                                                {...field}
                                                disabled={isSubmitting}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end space-x-4">
                            <Button
                                variant="outline"
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => router.push("/dashboard/cadastros/produtos")}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Salvando..." : (initialData ? "Salvar Alterações" : "Criar Produto")}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    )
}
