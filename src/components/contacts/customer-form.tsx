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
import { createCustomer, updateCustomer } from "@/app/actions/customer"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useCepLookup } from "@/lib/use-cep-lookup"


const customerFormSchema = z.object({
    name: z.string().min(2, {
        message: "O nome deve ter pelo menos 2 caracteres.",
    }),
    email: z.string().email({
        message: "Email inválido.",
    }).optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    document: z.string().optional().or(z.literal('')),
    zipCode: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    number: z.string().optional().or(z.literal('')),
    complement: z.string().optional().or(z.literal('')),
    neighborhood: z.string().optional().or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
    state: z.string().optional().or(z.literal('')),
})

type CustomerFormValues = z.infer<typeof customerFormSchema>

interface CustomerFormProps {
    initialData?: {
        id: string
        name: string
        email?: string | null
        phone?: string | null
        document?: string | null
        zipCode?: string | null
        address?: string | null
        number?: string | null
        complement?: string | null
        neighborhood?: string | null
        city?: string | null
        state?: string | null
    }
}

export function CustomerForm({ initialData }: CustomerFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { fetchAddress, isSearching: isSearchingCep } = useCepLookup()

    const form = useForm<CustomerFormValues>({
        resolver: zodResolver(customerFormSchema),
        defaultValues: {
            name: initialData?.name || "",
            email: initialData?.email || "",
            phone: initialData?.phone || "",
            document: initialData?.document || "",
            zipCode: initialData?.zipCode || "",
            address: initialData?.address || "",
            number: initialData?.number || "",
            complement: initialData?.complement || "",
            neighborhood: initialData?.neighborhood || "",
            city: initialData?.city || "",
            state: initialData?.state || "",
        },
    })

    const maskPhone = (value: string) => {
        return value
            .replace(/\D/g, "")
            .replace(/^(\d{2})(\d)/g, "($1) $2")
            .replace(/(\d)(\d{4})$/, "$1-$2")
    }

    const maskDocument = (value: string) => {
        const clean = value.replace(/\D/g, "")
        if (clean.length <= 11) {
            return clean
                .replace(/(\d{3})(\d)/, "$1.$2")
                .replace(/(\d{3})(\d)/, "$1.$2")
                .replace(/(\d{3})(\d{1,2})/, "$1-$2")
                .replace(/(-\d{2})\d+?$/, "$1")
        }
        return clean
            .replace(/^(\d{2})(\d)/, "$1.$2")
            .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1/$2")
            .replace(/(\d{4})(\d)/, "$1-$2")
            .replace(/(-\d{2})\d+?$/, "$1")
    }

    const maskZipCode = (value: string) => {
        return value
            .replace(/\D/g, "")
            .replace(/^(\d{5})(\d)/, "$1-$2")
            .substring(0, 9)
    }

    const handleCepChange = async (value: string) => {
        const masked = maskZipCode(value)
        form.setValue("zipCode", masked)

        const cleanCep = masked.replace(/\D/g, "")
        if (cleanCep.length === 8) {
            const result = await fetchAddress(cleanCep)
            if (result) {
                form.setValue("address", result.address)
                form.setValue("neighborhood", result.neighborhood)
                form.setValue("city", result.city)
                form.setValue("state", result.state)
                if (result.complement && !form.getValues("complement")) {
                    form.setValue("complement", result.complement)
                }
                toast.success("Endereço preenchido automaticamente!")
            } else {
                toast.error("CEP não encontrado.")
            }
        }
    }

    async function onSubmit(data: CustomerFormValues) {
        setIsSubmitting(true)
        try {
            const formattedData = {
                name: data.name,
                email: data.email || null,
                phone: data.phone || null,
                document: data.document || null,
                zipCode: data.zipCode || null,
                address: data.address || null,
                number: data.number || null,
                complement: data.complement || null,
                neighborhood: data.neighborhood || null,
                city: data.city || null,
                state: data.state || null,
            }

            if (initialData) {
                const result = await updateCustomer(initialData.id, formattedData)
                if (result.error) {
                    toast.error(result.error)
                } else {
                    toast.success("Cliente atualizado com sucesso!")
                    router.push("/dashboard/cadastros/clientes")
                    router.refresh()
                }
            } else {
                const result = await createCustomer(formattedData)
                if (result.error) {
                    toast.error(result.error)
                } else {
                    toast.success("Cliente criado com sucesso!")
                    router.push("/dashboard/cadastros/clientes")
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
                    <Link href="/dashboard/cadastros/clientes">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">
                    {initialData ? "Editar Cliente" : "Novo Cliente"}
                </h1>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nome do cliente" {...field} disabled={isSubmitting} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="email@exemplo.com" {...field} disabled={isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Telefone</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="(99) 99999-9999"
                                                {...field}
                                                disabled={isSubmitting}
                                                maxLength={15}
                                                onChange={(e) => {
                                                    const masked = maskPhone(e.target.value)
                                                    field.onChange(masked)
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="document"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CPF/CNPJ</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="CPF ou CNPJ"
                                            {...field}
                                            disabled={isSubmitting}
                                            maxLength={18}
                                            onChange={(e) => {
                                                const masked = maskDocument(e.target.value)
                                                field.onChange(masked)
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="zipCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>CEP</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    placeholder="00000-000"
                                                    {...field}
                                                    disabled={isSubmitting || isSearchingCep}
                                                    maxLength={9}
                                                    onChange={(e) => handleCepChange(e.target.value)}
                                                />
                                                {isSearchingCep && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                    </div>
                                                )}
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cidade</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Cidade" {...field} disabled={isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estado</FormLabel>
                                            <FormControl>
                                                <Input placeholder="UF" maxLength={2} {...field} disabled={isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Endereço</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Rua, Avenida..." {...field} disabled={isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-4 gap-4">
                                <FormField
                                    control={form.control}
                                    name="number"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Número</FormLabel>
                                            <FormControl>
                                                <Input placeholder="123" {...field} disabled={isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="complement"
                                    render={({ field }) => (
                                        <FormItem className="col-span-1">
                                            <FormLabel>Complemento</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Apto 101" {...field} disabled={isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="neighborhood"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Bairro</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Bairro" {...field} disabled={isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-4">
                            <Button
                                variant="outline"
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => router.push("/dashboard/cadastros/clientes")}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Salvando..." : (initialData ? "Salvar Alterações" : "Criar Cliente")}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    )
}
