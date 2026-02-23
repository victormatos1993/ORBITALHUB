"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    CalendarIcon,
    Plus,
    Trash2,
    Search,
    Check,
    ShoppingCart,
    Package,
    User,
    UserPlus,
    Truck,
    Minus,
    X,
    Receipt,
    CreditCard,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Wrench,
} from "lucide-react"
import { QuickCustomerDialog } from "@/components/customers/quick-customer-dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import CurrencyInput from "react-currency-input-field"

import { createSale } from "@/app/actions/sales"
import { getCustomers, createCustomer } from "@/app/actions/customer"
import { getSuppliers } from "@/app/actions/supplier"
import { getProducts } from "@/app/actions/product"
import { getServices } from "@/app/actions/service"

// Types
type CustomerOption = { id: string; name: string; document: string | null; email?: string | null; phone?: string | null }
type SupplierOption = { id: string; name: string }
type ProductOption = { id: string; name: string; price: number; stockQuantity: number; manageStock: boolean; sku: string | null }
type ServiceOption = { id: string; name: string; price: number; category: string | null; duration: number | null }

type CartItem = {
    itemId: string           // unique ID: productId or serviceId
    itemType: 'product' | 'service'
    productId?: string
    serviceId?: string
    name: string
    sku: string | null
    quantity: number
    unitPrice: number
    stock: number
    manageStock: boolean
    category?: string | null   // for services
    duration?: number | null   // for services
}

const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

// Input masks
function maskCpfCnpj(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 14)
    if (digits.length <= 11) {
        // CPF: 000.000.000-00
        return digits
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    } else {
        // CNPJ: 00.000.000/0000-00
        return digits
            .replace(/(\d{2})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1/$2")
            .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
    }
}

function maskPhone(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    if (digits.length <= 10) {
        // (00) 0000-0000
        return digits
            .replace(/(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{4})(\d{1,4})$/, "$1-$2")
    } else {
        // (00) 00000-0000
        return digits
            .replace(/(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{5})(\d{1,4})$/, "$1-$2")
    }
}

export function SaleForm({
    initialCustomerId,
    initialServiceId,
    initialProductId,
    sourceEventId,
}: {
    initialCustomerId?: string
    initialServiceId?: string
    initialProductId?: string
    sourceEventId?: string
} = {}) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [customers, setCustomers] = useState<CustomerOption[]>([])
    const [carriers, setCarriers] = useState<SupplierOption[]>([])
    const [products, setProducts] = useState<ProductOption[]>([])
    const [services, setServices] = useState<ServiceOption[]>([])

    // Sale state
    const [date, setDate] = useState<Date>(new Date())
    const [customerId, setCustomerId] = useState<string | null>(null)
    const [carrierId, setCarrierId] = useState<string | null>(null)
    const [shippingCost, setShippingCost] = useState<number>(0)
    const [shippingStatus, setShippingStatus] = useState<"PAID" | "PENDING">("PENDING")
    const [freightPaidBy, setFreightPaidBy] = useState<"CLIENTE" | "EMPRESA">("CLIENTE")
    const [cart, setCart] = useState<CartItem[]>([])

    // Pagamento
    const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
    const [installments, setInstallments] = useState<number>(2)

    // Search & UI state
    const [productSearch, setProductSearch] = useState("")
    const [productPopoverOpen, setProductPopoverOpen] = useState(false)
    const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false)
    const [showFreight, setShowFreight] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // New customer dialog
    const [newCustomerOpen, setNewCustomerOpen] = useState(false)

    const handleQuickCustomerSuccess = (created: CustomerOption) => {
        setCustomers(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        setCustomerId(created.id)
    }

    // Load data
    useEffect(() => {
        const loadData = async () => {
            const [customersData, suppliersData, productsData, servicesData] = await Promise.all([
                getCustomers({ pageSize: 1000 }),
                getSuppliers({ pageSize: 1000 }),
                getProducts({ pageSize: 1000 }),
                getServices()
            ])
            setCustomers(customersData.customers)
            setCarriers(suppliersData.suppliers)
            setProducts(productsData.products as any)
            setServices(
                servicesData
                    .filter((s: any) => s.active)
                    .map((s: any) => ({
                        id: s.id,
                        name: s.name,
                        price: Number(s.price),
                        category: s.category,
                        duration: s.duration,
                    }))
            )
        }
        loadData()
    }, [])

    // Pré-preencher dados vindos da agenda (quando aberto via notificação)
    useEffect(() => {
        if (!initialCustomerId && !initialServiceId && !initialProductId) return

        // Pré-selecionar o cliente
        if (initialCustomerId) {
            setCustomerId(initialCustomerId)
        }

        // Pré-adicionar serviço ao carrinho
        if (initialServiceId && services.length > 0) {
            const service = services.find(s => s.id === initialServiceId)
            if (service) addServiceToCart(service)
        }

        // Pré-adicionar produto ao carrinho
        if (initialProductId && products.length > 0) {
            const product = products.find(p => p.id === initialProductId)
            if (product) addProductToCart(product)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [services, products]) // roda quando os dados carregarem

    // Computed
    const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const total = subtotal + shippingCost
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
    const selectedCustomer = customers.find(c => c.id === customerId)

    // Cart operations
    const addProductToCart = useCallback((product: ProductOption) => {
        setCart(prev => {
            const existing = prev.find(item => item.itemType === 'product' && item.productId === product.id)
            if (existing) {
                return prev.map(item =>
                    item.itemType === 'product' && item.productId === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            return [...prev, {
                itemId: `product-${product.id}`,
                itemType: 'product' as const,
                productId: product.id,
                name: product.name,
                sku: product.sku,
                quantity: 1,
                unitPrice: Number(product.price),
                stock: product.stockQuantity,
                manageStock: product.manageStock,
            }]
        })
        setProductPopoverOpen(false)
        setProductSearch("")
    }, [])

    const addServiceToCart = useCallback((service: ServiceOption) => {
        setCart(prev => {
            const existing = prev.find(item => item.itemType === 'service' && item.serviceId === service.id)
            if (existing) {
                return prev.map(item =>
                    item.itemType === 'service' && item.serviceId === service.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            return [...prev, {
                itemId: `service-${service.id}`,
                itemType: 'service' as const,
                serviceId: service.id,
                name: service.name,
                sku: null,
                quantity: 1,
                unitPrice: Number(service.price),
                stock: 0,
                manageStock: false,
                category: service.category,
                duration: service.duration,
            }]
        })
        setProductPopoverOpen(false)
        setProductSearch("")
    }, [])

    const updateQuantity = (itemId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.itemId !== itemId) return item
            const newQty = Math.max(1, item.quantity + delta)
            return { ...item, quantity: newQty }
        }))
    }

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(item => item.itemId !== itemId))
    }

    const updateItemPrice = (itemId: string, price: number) => {
        setCart(prev => prev.map(item =>
            item.itemId === itemId ? { ...item, unitPrice: price } : item
        ))
    }

    // Submit
    async function handleSubmit() {
        if (cart.length === 0) {
            toast.error("Adicione pelo menos um item à venda")
            return
        }

        setIsLoading(true)
        try {
            // Métodos que suportam parcelamento
            const installablesMethods = ["CREDITO", "CARNE", "BOLETO"]
            const isInstallable = paymentMethod && installablesMethods.includes(paymentMethod)
            const paymentType = isInstallable && installments > 1 ? "PARCELADO" : "A_VISTA"

            const result = await createSale({
                date,
                customerId,
                carrierId: showFreight ? carrierId : null,
                shippingCost: showFreight ? shippingCost : 0,
                shippingStatus: showFreight ? shippingStatus : null,
                freightPaidBy: showFreight ? freightPaidBy : 'CLIENTE',
                paymentMethod: paymentMethod || null,
                paymentType,
                installments: isInstallable && installments > 1 ? installments : null,
                eventId: sourceEventId || null,
                items: cart.map(item => ({
                    itemType: item.itemType,
                    productId: item.productId,
                    serviceId: item.serviceId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                })),
            })

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Venda finalizada com sucesso!")
                router.push("/dashboard/vendas")
                router.refresh()
            }
        } catch {
            toast.error("Erro ao processar venda")
        } finally {
            setIsLoading(false)
        }
    }

    // Keyboard shortcut for search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "F2") {
                e.preventDefault()
                setProductPopoverOpen(true)
            }
            if (e.key === "F12") {
                e.preventDefault()
                handleSubmit()
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cart, date, customerId, carrierId, shippingCost, shippingStatus, showFreight])

    // Count items in cart by type
    const productCount = cart.filter(i => i.itemType === 'product').length
    const serviceCount = cart.filter(i => i.itemType === 'service').length

    return (
        <div className="flex flex-col lg:flex-row gap-5 min-h-[calc(100vh-180px)]">
            {/* ═══════════ LEFT: Product/Service Search + Cart Items ═══════════ */}
            <div className="flex-1 flex flex-col gap-4">

                {/* Banner de origem — agendamento */}
                {sourceEventId && (
                    <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-2.5">
                        <span className="text-lg">📅</span>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                Venda originada de um agendamento
                            </p>
                            <p className="text-xs text-amber-600/70 dark:text-amber-500/70">
                                Cliente e itens foram pré-preenchidos a partir do evento. Revise e finalize a venda.
                            </p>
                        </div>
                    </div>
                )}

                {/* Product/Service Search Bar */}
                <div className="relative">
                    <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                        <PopoverTrigger asChild>
                            <div className="relative group cursor-pointer">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                <Input
                                    ref={searchInputRef}
                                    placeholder="Buscar produto ou serviço... (F2)"
                                    className="h-14 pl-12 pr-4 text-base rounded-2xl bg-card border-border/60 focus:border-primary/50 shadow-sm transition-all"
                                    readOnly
                                />
                                <Badge variant="secondary" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono">
                                    F2
                                </Badge>
                            </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl shadow-xl" align="start">
                            <Command className="rounded-2xl">
                                <CommandInput
                                    placeholder="Digite o nome do produto ou serviço..."
                                    className="h-12"
                                    value={productSearch}
                                    onValueChange={setProductSearch}
                                />
                                <CommandList className="max-h-[400px]">
                                    <CommandEmpty>
                                        <div className="flex flex-col items-center py-6 gap-2">
                                            <Package className="h-10 w-10 text-muted-foreground/30" />
                                            <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/cadastros/produtos")}>
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Cadastrar Produto
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/servicos")}>
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Cadastrar Serviço
                                                </Button>
                                            </div>
                                        </div>
                                    </CommandEmpty>

                                    {/* ── Products Group ── */}
                                    {products.length > 0 && (
                                        <CommandGroup heading={`Produtos (${products.length})`}>
                                            {products.map((product) => {
                                                const inCart = cart.find(i => i.itemType === 'product' && i.productId === product.id)
                                                return (
                                                    <CommandItem
                                                        key={`product-${product.id}`}
                                                        value={`produto ${product.name} ${product.sku || ""}`}
                                                        onSelect={() => addProductToCart(product)}
                                                        className="flex items-center gap-3 py-3 px-3 cursor-pointer rounded-xl"
                                                    >
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                            <Package className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium truncate">{product.name}</span>
                                                                <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                                                                    Produto
                                                                </Badge>
                                                                {inCart && (
                                                                    <Badge variant="secondary" className="text-[10px] h-5">
                                                                        {inCart.quantity}x no carrinho
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                {product.sku && <span className="font-mono">{product.sku}</span>}
                                                                {product.manageStock && (
                                                                    <span className={product.stockQuantity <= 5 ? "text-destructive" : ""}>
                                                                        Estoque: {product.stockQuantity}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="font-semibold text-sm shrink-0">
                                                            {formatBRL(Number(product.price))}
                                                        </span>
                                                    </CommandItem>
                                                )
                                            })}
                                        </CommandGroup>
                                    )}

                                    {/* ── Services Group ── */}
                                    {services.length > 0 && (
                                        <CommandGroup heading={`Serviços (${services.length})`}>
                                            {services.map((service) => {
                                                const inCart = cart.find(i => i.itemType === 'service' && i.serviceId === service.id)
                                                return (
                                                    <CommandItem
                                                        key={`service-${service.id}`}
                                                        value={`servico ${service.name} ${service.category || ""}`}
                                                        onSelect={() => addServiceToCart(service)}
                                                        className="flex items-center gap-3 py-3 px-3 cursor-pointer rounded-xl"
                                                    >
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                                                            <Wrench className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium truncate">{service.name}</span>
                                                                <Badge variant="outline" className="text-[10px] h-5 shrink-0 border-amber-500/30 text-amber-500">
                                                                    Serviço
                                                                </Badge>
                                                                {inCart && (
                                                                    <Badge variant="secondary" className="text-[10px] h-5">
                                                                        {inCart.quantity}x no carrinho
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                {service.category && <span>{service.category}</span>}
                                                                {service.duration && <span>{service.duration}min</span>}
                                                            </div>
                                                        </div>
                                                        <span className="font-semibold text-sm shrink-0">
                                                            {formatBRL(Number(service.price))}
                                                        </span>
                                                    </CommandItem>
                                                )
                                            })}
                                        </CommandGroup>
                                    )}
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Cart Items Table */}
                <div className="flex-1 rounded-2xl border bg-card overflow-hidden flex flex-col">
                    {/* Table Header */}
                    <div className="grid grid-cols-[1fr_120px_140px_100px_40px] gap-3 px-5 py-3 bg-muted/30 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <span>Item</span>
                        <span className="text-center">Quantidade</span>
                        <span className="text-right">Preço Unit.</span>
                        <span className="text-right">Subtotal</span>
                        <span></span>
                    </div>

                    {/* Items */}
                    <div className="flex-1 overflow-y-auto">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
                                    <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">Nenhum item adicionado</p>
                                <p className="text-xs text-muted-foreground/60">
                                    Pressione <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold">F2</kbd> para buscar produtos e serviços
                                </p>
                            </div>
                        ) : (
                            cart.map((item, index) => (
                                <div
                                    key={item.itemId}
                                    className={cn(
                                        "grid grid-cols-[1fr_120px_140px_100px_40px] gap-3 px-5 py-3.5 items-center transition-colors hover:bg-muted/20",
                                        index !== cart.length - 1 && "border-b border-border/40"
                                    )}
                                >
                                    {/* Item Info */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn(
                                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                                            item.itemType === 'product'
                                                ? "bg-primary/8 text-primary"
                                                : "bg-amber-500/10 text-amber-500"
                                        )}>
                                            {item.itemType === 'product'
                                                ? <Package className="h-4 w-4" />
                                                : <Wrench className="h-4 w-4" />
                                            }
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-sm font-medium truncate">{item.name}</p>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[9px] h-4 shrink-0",
                                                        item.itemType === 'service' && "border-amber-500/30 text-amber-500"
                                                    )}
                                                >
                                                    {item.itemType === 'product' ? 'Produto' : 'Serviço'}
                                                </Badge>
                                            </div>
                                            {item.sku && (
                                                <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                                            )}
                                            {item.itemType === 'service' && item.category && (
                                                <p className="text-xs text-muted-foreground">{item.category}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quantity Controls */}
                                    <div className="flex items-center justify-center gap-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg"
                                            onClick={() => updateQuantity(item.itemId, -1)}
                                            disabled={item.quantity <= 1}
                                        >
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 1
                                                setCart(prev => prev.map(i =>
                                                    i.itemId === item.itemId ? { ...i, quantity: Math.max(1, val) } : i
                                                ))
                                            }}
                                            className="h-8 w-12 text-center px-1 rounded-lg text-sm font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg"
                                            onClick={() => updateQuantity(item.itemId, 1)}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    {/* Unit Price */}
                                    <div className="text-right">
                                        <CurrencyInput
                                            className="h-8 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm text-right focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            prefix="R$ "
                                            decimalsLimit={2}
                                            value={item.unitPrice}
                                            onValueChange={(value) => updateItemPrice(item.itemId, Number(value || 0))}
                                        />
                                    </div>

                                    {/* Subtotal */}
                                    <p className="text-right text-sm font-semibold">
                                        {formatBRL(item.quantity * item.unitPrice)}
                                    </p>

                                    {/* Remove */}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                        onClick={() => removeFromCart(item.itemId)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ═══════════ RIGHT: Checkout Panel ═══════════ */}
            <div className="w-full lg:w-[380px] flex flex-col gap-4 shrink-0">
                {/* Customer */}
                <div className="rounded-2xl border bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            <Label className="text-sm font-semibold">Cliente</Label>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                            onClick={() => setNewCustomerOpen(true)}
                        >
                            <UserPlus className="h-3.5 w-3.5" />
                            Novo
                        </Button>
                        <QuickCustomerDialog
                            open={newCustomerOpen}
                            onOpenChange={setNewCustomerOpen}
                            onSuccess={handleQuickCustomerSuccess}
                        />
                    </div>
                    <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                    "w-full justify-between rounded-xl h-10",
                                    !customerId && "text-muted-foreground"
                                )}
                            >
                                {selectedCustomer ? (
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <User className="h-3 w-3 text-primary" />
                                        </div>
                                        <span className="truncate text-sm">{selectedCustomer.name}</span>
                                    </div>
                                ) : (
                                    "Consumidor Final"
                                )}
                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0 rounded-xl" align="start">
                            <Command>
                                <CommandInput placeholder="Buscar cliente..." />
                                <CommandList className="max-h-[260px]">
                                    <CommandEmpty>
                                        <div className="flex flex-col items-center py-4 gap-2">
                                            <User className="h-8 w-8 text-muted-foreground/30" />
                                            <p className="text-sm text-muted-foreground">Nenhum cliente encontrado</p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5"
                                                onClick={() => {
                                                    setCustomerPopoverOpen(false)
                                                    setNewCustomerOpen(true)
                                                }}
                                            >
                                                <UserPlus className="h-4 w-4" />
                                                Cadastrar Novo Cliente
                                            </Button>
                                        </div>
                                    </CommandEmpty>
                                    <CommandGroup>
                                        {/* Option to clear */}
                                        <CommandItem
                                            value="consumidor-final"
                                            onSelect={() => { setCustomerId(null); setCustomerPopoverOpen(false) }}
                                            className="py-2.5 rounded-lg"
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", !customerId ? "opacity-100" : "opacity-0")} />
                                            <span className="text-muted-foreground">Consumidor Final</span>
                                        </CommandItem>
                                        {customers.map((customer) => (
                                            <CommandItem
                                                key={customer.id}
                                                value={`${customer.name} ${customer.document || ""} ${customer.email || ""}`}
                                                onSelect={() => { setCustomerId(customer.id); setCustomerPopoverOpen(false) }}
                                                className="py-2.5 rounded-lg"
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", customer.id === customerId ? "opacity-100" : "opacity-0")} />
                                                <div className="flex flex-col">
                                                    <span className="text-sm">{customer.name}</span>
                                                    {customer.document && (
                                                        <span className="text-xs text-muted-foreground">{customer.document}</span>
                                                    )}
                                                </div>
                                            </CommandItem>
                                        ))}
                                        {/* Add new customer at the bottom of the list */}
                                        <div className="p-1 border-t mt-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full justify-start font-normal text-muted-foreground hover:text-primary gap-2"
                                                onClick={() => {
                                                    setCustomerPopoverOpen(false)
                                                    setNewCustomerOpen(true)
                                                }}
                                            >
                                                <UserPlus className="h-4 w-4" />
                                                Cadastrar Novo Cliente
                                            </Button>
                                        </div>
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Date */}
                <div className="rounded-2xl border bg-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-semibold">Data da Venda</Label>
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full justify-start rounded-xl h-10 font-normal"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                {format(date, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(d) => d && setDate(d)}
                                disabled={(d) => d > new Date() || d < new Date("1900-01-01")}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                {/* Freight (Collapsible) */}
                <div className="rounded-2xl border bg-card overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowFreight(!showFreight)}
                        className="flex items-center justify-between w-full p-4 hover:bg-muted/30 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold">Frete / Entrega</span>
                        </div>
                        <Badge
                            variant={showFreight ? (freightPaidBy === "EMPRESA" ? "outline" : "default") : "secondary"}
                            className={cn(
                                "text-xs",
                                showFreight && freightPaidBy === "EMPRESA" && "border-amber-500/50 text-amber-600 dark:text-amber-400"
                            )}
                        >
                            {!showFreight ? "Sem frete" : freightPaidBy === "EMPRESA" ? "Frete Grátis" : "Ativo"}
                        </Badge>
                    </button>
                    <div className={cn(
                        "overflow-hidden transition-all duration-300",
                        showFreight ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
                    )}>
                        <div className="px-4 pb-4 space-y-3 border-t">

                            {/* ── Quem paga o frete? ── */}
                            <div className="pt-3">
                                <Label className="text-xs text-muted-foreground mb-2 block">Quem paga o frete?</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFreightPaidBy("CLIENTE")}
                                        className={cn(
                                            "flex flex-col items-center justify-center gap-1 rounded-xl border py-3 text-xs font-semibold transition-all",
                                            freightPaidBy === "CLIENTE"
                                                ? "border-primary bg-primary/10 text-primary shadow-sm"
                                                : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/30"
                                        )}
                                    >
                                        <span className="text-base">👤</span>
                                        <span>Cliente paga</span>
                                        <span className="text-[10px] font-normal opacity-70">incluído no total</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFreightPaidBy("EMPRESA")}
                                        className={cn(
                                            "flex flex-col items-center justify-center gap-1 rounded-xl border py-3 text-xs font-semibold transition-all",
                                            freightPaidBy === "EMPRESA"
                                                ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm"
                                                : "border-border text-muted-foreground hover:border-amber-500/40 hover:bg-muted/30"
                                        )}
                                    >
                                        <span className="text-base">🏢</span>
                                        <span>Empresa arca</span>
                                        <span className="text-[10px] font-normal opacity-70">frete grátis</span>
                                    </button>
                                </div>

                                {/* Aviso quando empresa paga */}
                                {freightPaidBy === "EMPRESA" && (
                                    <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-2">
                                        <span className="text-sm mt-0.5">⚠️</span>
                                        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                            O valor do frete <strong>não será cobrado do cliente</strong>, mas será lançado como{" "}
                                            <strong>despesa da empresa</strong> no financeiro.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <Label className="text-xs text-muted-foreground">Transportadora</Label>
                                <Select onValueChange={setCarrierId} value={carrierId || undefined}>
                                    <SelectTrigger className="mt-1 rounded-xl">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {carriers.map((carrier) => (
                                            <SelectItem key={carrier.id} value={carrier.id}>
                                                {carrier.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Valor do Frete</Label>
                                <CurrencyInput
                                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm mt-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    prefix="R$ "
                                    decimalsLimit={2}
                                    value={shippingCost || undefined}
                                    onValueChange={(value) => setShippingCost(Number(value || 0))}
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Status de Pagamento do Frete</Label>
                                <Select onValueChange={(v) => setShippingStatus(v as "PAID" | "PENDING")} defaultValue="PENDING">
                                    <SelectTrigger className="mt-1 rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PENDING">A Pagar</SelectItem>
                                        <SelectItem value="PAID">Pago</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Forma de Pagamento ─── */}
                {(() => {
                    const METHODS = [
                        { id: "PIX", label: "PIX", icon: "⚡", color: "emerald", installable: false },
                        { id: "DINHEIRO", label: "Dinheiro", icon: "💵", color: "green", installable: false },
                        { id: "CREDITO", label: "Crédito", icon: "💳", color: "blue", installable: true },
                        { id: "DEBITO", label: "Débito", icon: "🏦", color: "indigo", installable: false },
                        { id: "VOUCHER", label: "Voucher", icon: "🎟️", color: "purple", installable: false },
                        { id: "CHEQUE", label: "Cheque", icon: "📝", color: "amber", installable: true },
                        { id: "CARNE", label: "Carnê", icon: "📋", color: "orange", installable: true },
                        { id: "BOLETO", label: "Boleto", icon: "🧾", color: "slate", installable: true },
                    ]
                    const selected = METHODS.find(m => m.id === paymentMethod)
                    const installable = selected?.installable ?? false

                    return (
                        <div className="rounded-2xl border bg-card p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <CreditCard className="h-4 w-4 text-primary" />
                                <Label className="text-sm font-semibold">Forma de Pagamento</Label>
                                {paymentMethod && (
                                    <Badge variant="secondary" className="ml-auto text-xs">
                                        {selected?.label}
                                        {installable && installments > 1 ? ` ${installments}x` : " à vista"}
                                    </Badge>
                                )}
                            </div>

                            {/* Grade de botões */}
                            <div className="grid grid-cols-4 gap-2">
                                {METHODS.map((m) => {
                                    const isActive = paymentMethod === m.id
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setPaymentMethod(isActive ? null : m.id)}
                                            className={cn(
                                                "flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 px-1 text-xs font-semibold transition-all duration-150 select-none",
                                                isActive
                                                    ? "border-primary bg-primary/10 text-primary shadow-sm scale-[0.97]"
                                                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/40 hover:text-foreground"
                                            )}
                                        >
                                            <span className="text-base leading-none">{m.icon}</span>
                                            <span className="leading-none truncate w-full text-center">{m.label}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Parcelas — aparece só para métodos parceláveis */}
                            {installable && (
                                <div className="mt-3 pt-3 border-t">
                                    <Label className="text-xs text-muted-foreground mb-2 block">
                                        Número de Parcelas
                                    </Label>
                                    <div className="flex gap-2 flex-wrap">
                                        {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setInstallments(n)}
                                                className={cn(
                                                    "flex items-center justify-center rounded-lg border w-10 h-9 text-sm font-semibold transition-all",
                                                    installments === n
                                                        ? "border-primary bg-primary/10 text-primary"
                                                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                                )}
                                            >
                                                {n === 1 ? "1x" : `${n}x`}
                                            </button>
                                        ))}
                                    </div>
                                    {installments > 1 && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                            {installments}x de{" "}
                                            <strong className="text-foreground">
                                                {formatBRL((cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0) + (showFreight && freightPaidBy === "CLIENTE" ? shippingCost : 0)) / installments)}
                                            </strong>
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })()}

                {/* ═══════════ Totals & Checkout ═══════════ */}
                <div className="rounded-2xl border bg-card p-5 mt-auto">
                    <div className="flex items-center gap-2 mb-4">
                        <Receipt className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">Resumo da Venda</span>
                    </div>

                    <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                                Itens ({itemCount})
                                {productCount > 0 && serviceCount > 0 && (
                                    <span className="text-xs ml-1">
                                        ({productCount} prod. + {serviceCount} serv.)
                                    </span>
                                )}
                            </span>
                            <span className="font-medium">{formatBRL(subtotal)}</span>
                        </div>
                        {showFreight && shippingCost > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Frete</span>
                                <span className="font-medium">{formatBRL(shippingCost)}</span>
                            </div>
                        )}
                        <Separator className="my-3" />
                        <div className="flex justify-between items-center">
                            <span className="text-base font-bold">Total</span>
                            <span className="text-2xl font-bold text-primary tracking-tight">
                                {formatBRL(total)}
                            </span>
                        </div>
                    </div>

                    <Button
                        type="button"
                        className="w-full h-14 mt-5 rounded-2xl text-base font-bold gradient-primary hover:opacity-90 text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-primary/40"
                        size="lg"
                        disabled={isLoading || cart.length === 0}
                        onClick={handleSubmit}
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processando...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5" />
                                Finalizar Venda
                                <Badge variant="secondary" className="ml-1 text-[10px] font-mono bg-white/20 text-white border-0">
                                    F12
                                </Badge>
                            </div>
                        )}
                    </Button>

                    {cart.length === 0 && (
                        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground justify-center">
                            <AlertCircle className="h-3 w-3" />
                            Adicione itens para finalizar
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
