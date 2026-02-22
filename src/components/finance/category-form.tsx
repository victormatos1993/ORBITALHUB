"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createCategory, updateCategory } from "@/app/actions/category"

const formSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    type: z.enum(["income", "expense"]),
    color: z.string().optional(),
})

interface CategoryFormProps {
    initialData?: {
        id: string
        name: string
        type: string
        color?: string | null
    }
}

export function CategoryForm({ initialData }: CategoryFormProps) {
    const router = useRouter()

    // Ensure initialData.type is valid, otherwise default to "expense"
    const defaultType = (initialData?.type === "income" || initialData?.type === "expense")
        ? initialData.type
        : "expense"

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialData?.name || "",
            type: defaultType,
            color: initialData?.color || "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            if (initialData?.id) {
                const result = await updateCategory(initialData.id, values)
                if (result.error) {
                    toast.error(result.error)
                    return
                }
                toast.success("Categoria atualizada com sucesso!")
            } else {
                const result = await createCategory(values)
                if (result.error) {
                    toast.error(result.error)
                    return
                }
                toast.success("Categoria criada com sucesso!")
            }
            router.push("/dashboard/financeiro/categorias")
            router.refresh()
        } catch (error) {
            toast.error("Ocorreu um erro ao salvar")
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome da Categoria</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Alimentação, Transporte, Vendas..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="income">Receita</SelectItem>
                                    <SelectItem value="expense">Despesa</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
                    <Button type="submit">Salvar Categoria</Button>
                </div>
            </form>
        </Form>
    )
}
