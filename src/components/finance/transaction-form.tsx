"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { createTransaction, updateTransaction } from "@/app/actions/transaction"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"
import CurrencyInput from 'react-currency-input-field';

const transactionFormSchema = z.object({
    description: z.string().min(2, "Descrição deve ter pelo menos 2 caracteres"),
    amount: z.any().transform((val) => {
        if (typeof val === 'string') {
            return parseFloat(val.replace(',', '.'));
        }
        return Number(val);
    }).pipe(z.number().min(0.01, "Valor deve ser maior que 0")),
    type: z.enum(["income", "expense"], {
        message: "Selecione o tipo de transação",
    }),
    categoryId: z.string().optional(),
    customerId: z.string().optional(),
    supplierId: z.string().optional(),
    date: z.date({
        message: "Data é obrigatória",
    }),
    status: z.enum(["pending", "paid"], {
        message: "Selecione o status",
    }),
})

type TransactionFormValues = z.infer<typeof transactionFormSchema>

interface Category {
    id: string
    name: string
    type: string
}

interface Customer {
    id: string
    name: string
    document?: string | null
    phone?: string | null
}

interface Supplier {
    id: string
    name: string
    document?: string | null
    phone?: string | null
}

interface TransactionFormProps {
    initialData?: {
        id: string
        description: string
        amount: number
        type: string
        date: string | Date
        status: string
        userId: string
        createdAt: Date // Prisma default
        updatedAt: Date
        categoryId?: string | null
        customerId?: string | null
        supplierId?: string | null
    } | null
    categories?: Category[]
    customers?: Customer[]
    suppliers?: Supplier[]
}

export function TransactionForm({
    initialData,
    categories = [],
    customers = [],
    suppliers = []
}: TransactionFormProps) {
    const router = useRouter()
    const [openCustomer, setOpenCustomer] = useState(false)
    const [openSupplier, setOpenSupplier] = useState(false)
    const [customerSearch, setCustomerSearch] = useState("")
    const [supplierSearch, setSupplierSearch] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const defaultValues: Partial<TransactionFormValues> = {
        description: initialData?.description || "",
        amount: initialData?.amount || 0,
        type: (initialData?.type as "income" | "expense") || "expense",
        status: (initialData?.status as "pending" | "paid") || "paid",
        date: initialData?.date ? new Date(initialData.date) : new Date(),
        categoryId: initialData?.categoryId || undefined,
        customerId: initialData?.customerId || undefined,
        supplierId: initialData?.supplierId || undefined,
    }

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionFormSchema),
        defaultValues,
    })

    const selectedType = form.watch("type");
    const selectedCustomerId = form.watch("customerId");
    const selectedSupplierId = form.watch("supplierId");

    const filteredCategories = categories.filter(c => c.type.toLowerCase() === selectedType);

    // Filter customers/suppliers based on search
    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.document?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.toLowerCase().includes(customerSearch.toLowerCase())
    );

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        s.document?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        s.phone?.toLowerCase().includes(supplierSearch.toLowerCase())
    );

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

    async function onSubmit(data: TransactionFormValues) {
        setIsSubmitting(true)
        try {
            let result;
            if (initialData) {
                result = await updateTransaction(initialData.id, data)
            } else {
                result = await createTransaction(data)
            }

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(initialData ? "Transação atualizada!" : "Transação criada!")
                router.push("/dashboard/financeiro/transacoes")
                router.refresh()
            }
        } catch (error) {
            toast.error("Ocorreu um erro ao salvar.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Descrição</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Ex: Venda de Produto X"
                                        {...field}
                                        disabled={isSubmitting}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {selectedType === "income" && (
                        <>
                            <FormField
                                control={form.control}
                                name="customerId"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Cliente</FormLabel>
                                        <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={openCustomer}
                                                        className={cn(
                                                            "w-full justify-between",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                        disabled={isSubmitting}
                                                    >
                                                        {field.value
                                                            ? customers.find((c) => c.id === field.value)?.name
                                                            : "Selecione o cliente"}
                                                        <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50 rotate-90" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0" align="start">
                                                <div className="p-2">
                                                    <Input
                                                        placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
                                                        value={customerSearch}
                                                        onChange={(e) => setCustomerSearch(e.target.value)}
                                                        className="mb-2"
                                                    />
                                                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                                                        {filteredCustomers.length > 0 ? (
                                                            filteredCustomers.map((customer) => (
                                                                <div
                                                                    key={customer.id}
                                                                    onClick={() => {
                                                                        field.onChange(customer.id)
                                                                        setOpenCustomer(false)
                                                                    }}
                                                                    className={cn(
                                                                        "cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                                                                        field.value === customer.id && "bg-accent text-accent-foreground"
                                                                    )}
                                                                >
                                                                    <div className="font-medium">{customer.name}</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {[customer.document, customer.phone].filter(Boolean).join(" • ")}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                                                Nenhum cliente encontrado.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormItem>
                                    <FormLabel>CPF/CNPJ</FormLabel>
                                    <Input
                                        value={selectedCustomer?.document || ""}
                                        readOnly
                                        disabled
                                        className="bg-muted"
                                        placeholder="Preenchido automaticamente"
                                    />
                                </FormItem>
                                <FormItem>
                                    <FormLabel>Telefone</FormLabel>
                                    <Input
                                        value={selectedCustomer?.phone || ""}
                                        readOnly
                                        disabled
                                        className="bg-muted"
                                        placeholder="Preenchido automaticamente"
                                    />
                                </FormItem>
                            </div>
                        </>
                    )}

                    {selectedType === "expense" && (
                        <>
                            <FormField
                                control={form.control}
                                name="supplierId"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Fornecedor</FormLabel>
                                        <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={openSupplier}
                                                        className={cn(
                                                            "w-full justify-between",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                        disabled={isSubmitting}
                                                    >
                                                        {field.value
                                                            ? suppliers.find((s) => s.id === field.value)?.name
                                                            : "Selecione o fornecedor"}
                                                        <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50 rotate-90" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0" align="start">
                                                <div className="p-2">
                                                    <Input
                                                        placeholder="Buscar por nome, CNPJ ou telefone..."
                                                        value={supplierSearch}
                                                        onChange={(e) => setSupplierSearch(e.target.value)}
                                                        className="mb-2"
                                                    />
                                                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                                                        {filteredSuppliers.length > 0 ? (
                                                            filteredSuppliers.map((supplier) => (
                                                                <div
                                                                    key={supplier.id}
                                                                    onClick={() => {
                                                                        field.onChange(supplier.id)
                                                                        setOpenSupplier(false)
                                                                    }}
                                                                    className={cn(
                                                                        "cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                                                                        field.value === supplier.id && "bg-accent text-accent-foreground"
                                                                    )}
                                                                >
                                                                    <div className="font-medium">{supplier.name}</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {[supplier.document, supplier.phone].filter(Boolean).join(" • ")}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                                                Nenhum fornecedor encontrado.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormItem>
                                    <FormLabel>CNPJ/CPF</FormLabel>
                                    <Input
                                        value={selectedSupplier?.document || ""}
                                        readOnly
                                        disabled
                                        className="bg-muted"
                                        placeholder="Preenchido automaticamente"
                                    />
                                </FormItem>
                                <FormItem>
                                    <FormLabel>Telefone</FormLabel>
                                    <Input
                                        value={selectedSupplier?.phone || ""}
                                        readOnly
                                        disabled
                                        className="bg-muted"
                                        placeholder="Preenchido automaticamente"
                                    />
                                </FormItem>
                            </div>
                        </>
                    )}

                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Valor (R$)</FormLabel>
                                <FormControl>
                                    <CurrencyInput
                                        id="input-amount"
                                        name="input-amount"
                                        placeholder="R$ 0,00"
                                        defaultValue={field.value}
                                        decimalsLimit={2}
                                        onValueChange={(value, name, values) => {
                                            field.onChange(values?.float ?? 0);
                                        }}
                                        prefix="R$ "
                                        disabled={isSubmitting}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    />
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
                                <Select
                                    onValueChange={(val) => {
                                        field.onChange(val);
                                        // Reset category and contacts when type changes
                                        form.setValue("categoryId", undefined);
                                        form.setValue("customerId", undefined);
                                        form.setValue("supplierId", undefined);
                                    }}
                                    defaultValue={field.value}
                                    value={field.value}
                                    disabled={isSubmitting}
                                >
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

                    <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Categoria</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    value={field.value || ""}
                                    disabled={isSubmitting}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a categoria" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {filteredCategories.length > 0 ? (
                                            filteredCategories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="no-category" disabled>
                                                Nenhuma categoria {selectedType === "income" ? "de receita" : "de despesa"} disponível
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    value={field.value}
                                    disabled={isSubmitting}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="paid">Pago/Recebido</SelectItem>
                                        <SelectItem value="pending">Pendente</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Data</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                disabled={isSubmitting}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "dd/MM/yyyy")
                                                ) : (
                                                    <span>Selecione uma data</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) =>
                                                date > new Date("2100-01-01") || date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Salvando..." : "Salvar Transação"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
