"use client"

import { Supplier } from "@prisma/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { deleteSupplier } from "@/app/actions/supplier"
import { deleteSupplierQuote, updateSupplierQuoteStatus } from "@/app/actions/supplier-quote"
import { SupplierQuoteModal } from "./supplier-quote-modal"
import {
    ArrowLeft,
    Pencil,
    Trash2,
    Building2,
    Mail,
    Phone,
    FileText,
    MapPin,
    Package,
    Factory,
    Hammer,
    ShoppingCart,
    Plus,
    CheckCircle2,
    XCircle,
    Clock,
    MoreHorizontal,
} from "lucide-react"
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const SUPPLIER_TYPE_MAP: Record<string, { label: string; color: string; icon: typeof Package }> = {
    MATERIAL_INTERNO: { label: "Material Interno", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Factory },
    PRODUTO: { label: "Produto para Revenda", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: Package },
    MATERIA_PRIMA: { label: "Matéria Prima", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Hammer },
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    PENDENTE: { label: "Pendente", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Clock },
    APROVADO: { label: "Aprovado", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
    REJEITADO: { label: "Rejeitado", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
}

interface SupplierQuoteWithItems {
    id: string
    description: string | null
    status: string
    totalAmount: any
    notes: string | null
    validUntil: Date | null
    createdAt: Date
    items: { id: string; description: string; quantity: number; unitPrice: any; totalPrice: any }[]
}

export function SupplierDetail({ supplier, quotes = [] }: { supplier: Supplier; quotes?: SupplierQuoteWithItems[] }) {
    const router = useRouter()
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)

    // Quote state
    const [quoteModalOpen, setQuoteModalOpen] = useState(false)
    const [editingQuote, setEditingQuote] = useState<SupplierQuoteWithItems | null>(null)
    const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null)
    const [deletingQuote, setDeletingQuote] = useState(false)

    const supplierTypes = (supplier.supplierType || "").split(",").filter(Boolean)
    const typeInfos = supplierTypes.map(t => SUPPLIER_TYPE_MAP[t]).filter(Boolean)

    const handleDelete = async () => {
        setDeleting(true)
        const res = await deleteSupplier(supplier.id)
        if (res.error) {
            toast.error(res.error)
            setDeleting(false)
        } else {
            toast.success("Fornecedor excluído")
            router.push("/dashboard/cadastros/fornecedores")
        }
        setDeleteOpen(false)
    }

    const hasAddress = supplier.address || supplier.city || supplier.state || supplier.zipCode
    const fullAddress = [
        supplier.address,
        supplier.number ? `nº ${supplier.number}` : null,
        supplier.complement,
        supplier.neighborhood,
    ].filter(Boolean).join(", ")

    const handleDeleteQuote = async () => {
        if (!deleteQuoteId) return
        setDeletingQuote(true)
        const res = await deleteSupplierQuote(deleteQuoteId)
        if (res.error) toast.error(res.error)
        else {
            toast.success("Orçamento excluído")
            router.refresh()
        }
        setDeleteQuoteId(null)
        setDeletingQuote(false)
    }

    const handleStatusChange = async (quoteId: string, status: string) => {
        const res = await updateSupplierQuoteStatus(quoteId, status)
        if (res.error) toast.error(res.error)
        else {
            toast.success(`Orçamento ${status === "APROVADO" ? "aprovado" : "rejeitado"}!`)
            router.refresh()
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/cadastros/fornecedores">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{supplier.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            {typeInfos.map((info, i) => {
                                const Icon = info.icon
                                return (
                                    <Badge key={i} variant="outline" className={`gap-1 ${info.color}`}>
                                        <Icon className="h-3 w-3" />
                                        {info.label}
                                    </Badge>
                                )
                            })}
                            {supplier.document && (
                                <span className="text-sm text-muted-foreground">{supplier.document}</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="gap-2 rounded-xl"
                        onClick={() => router.push(`/dashboard/cadastros/fornecedores/${supplier.id}/editar`)}
                    >
                        <Pencil className="h-4 w-4" /> Editar
                    </Button>
                    <Button
                        variant="outline"
                        className="gap-2 rounded-xl text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteOpen(true)}
                    >
                        <Trash2 className="h-4 w-4" /> Excluir
                    </Button>
                </div>
            </div>

            {/* Cards de informação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dados principais */}
                <div className="rounded-2xl border bg-card p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Building2 className="h-4 w-4" /> Dados do Fornecedor
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-muted-foreground">Nome / Razão Social</p>
                            <p className="font-medium">{supplier.name}</p>
                        </div>
                        {supplier.document && (
                            <div>
                                <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                                <p className="font-medium flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                    {supplier.document}
                                </p>
                            </div>
                        )}
                        {typeInfos.length > 0 && (
                            <div>
                                <p className="text-xs text-muted-foreground">Categorias</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {typeInfos.map((info, i) => {
                                        const Icon = info.icon
                                        return (
                                            <Badge key={i} variant="outline" className={`gap-1 ${info.color}`}>
                                                <Icon className="h-3 w-3" />
                                                {info.label}
                                            </Badge>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Contato */}
                <div className="rounded-2xl border bg-card p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Phone className="h-4 w-4" /> Contato
                    </h3>
                    <div className="space-y-3">
                        {supplier.email ? (
                            <div>
                                <p className="text-xs text-muted-foreground">E-mail</p>
                                <p className="font-medium flex items-center gap-1.5">
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                    {supplier.email}
                                </p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-xs text-muted-foreground">E-mail</p>
                                <p className="text-sm text-muted-foreground/50">Não informado</p>
                            </div>
                        )}
                        {supplier.phone ? (
                            <div>
                                <p className="text-xs text-muted-foreground">Telefone</p>
                                <p className="font-medium flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    {supplier.phone}
                                </p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-xs text-muted-foreground">Telefone</p>
                                <p className="text-sm text-muted-foreground/50">Não informado</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Endereço */}
            <div className="rounded-2xl border bg-card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Endereço
                </h3>
                {hasAddress ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <p className="text-xs text-muted-foreground">Logradouro</p>
                            <p className="font-medium">{fullAddress || "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">CEP</p>
                            <p className="font-medium">{supplier.zipCode || "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Cidade</p>
                            <p className="font-medium">{supplier.city || "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Estado</p>
                            <p className="font-medium">{supplier.state || "—"}</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground/50">Endereço não cadastrado</p>
                )}
            </div>

            {/* Orçamentos do Fornecedor */}
            <div className="rounded-2xl border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" /> Orçamentos do Fornecedor
                    </h3>
                    <Button
                        size="sm"
                        className="gap-1 rounded-xl text-xs"
                        onClick={() => { setEditingQuote(null); setQuoteModalOpen(true) }}
                    >
                        <Plus className="h-3.5 w-3.5" /> Novo Orçamento
                    </Button>
                </div>

                {quotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                            <ShoppingCart className="h-7 w-7 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Nenhum orçamento cadastrado</p>
                        <p className="text-xs text-muted-foreground/70 max-w-sm mt-1">
                            Cadastre orçamentos de compra deste fornecedor para apreciação do setor de compras.
                        </p>
                    </div>
                ) : (
                    <div className="rounded-xl border overflow-hidden">
                        <div className="grid grid-cols-[1fr_120px_130px_120px_48px] gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground">
                            <span>Descrição</span>
                            <span>Status</span>
                            <span className="text-right">Total</span>
                            <span className="text-right">Data</span>
                            <span></span>
                        </div>
                        {quotes.map(q => {
                            const statusInfo = STATUS_MAP[q.status] || STATUS_MAP.PENDENTE
                            const StatusIcon = statusInfo.icon
                            const total = typeof q.totalAmount === "object" && q.totalAmount.toNumber
                                ? q.totalAmount.toNumber()
                                : Number(q.totalAmount)
                            return (
                                <div
                                    key={q.id}
                                    className="grid grid-cols-[1fr_120px_130px_120px_48px] gap-2 px-4 py-3 border-t items-center hover:bg-muted/20 transition-colors cursor-pointer"
                                    onClick={() => { setEditingQuote(q); setQuoteModalOpen(true) }}
                                >
                                    <div>
                                        <p className="text-sm font-medium truncate">{q.description || "Orçamento sem descrição"}</p>
                                        <p className="text-xs text-muted-foreground">{q.items.length} {q.items.length === 1 ? "item" : "itens"}</p>
                                    </div>
                                    <div>
                                        <Badge variant="outline" className={`gap-1 text-xs ${statusInfo.color}`}>
                                            <StatusIcon className="h-3 w-3" />
                                            {statusInfo.label}
                                        </Badge>
                                    </div>
                                    <p className="text-sm font-semibold text-right">
                                        {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                    </p>
                                    <p className="text-xs text-muted-foreground text-right">
                                        {new Date(q.createdAt).toLocaleDateString("pt-BR")}
                                    </p>
                                    <div onClick={e => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-xl">
                                                <DropdownMenuItem onClick={() => { setEditingQuote(q); setQuoteModalOpen(true) }}>
                                                    <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                                                </DropdownMenuItem>
                                                {q.status !== "APROVADO" && (
                                                    <DropdownMenuItem onClick={() => handleStatusChange(q.id, "APROVADO")}>
                                                        <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-600" /> Aprovar
                                                    </DropdownMenuItem>
                                                )}
                                                {q.status !== "REJEITADO" && (
                                                    <DropdownMenuItem onClick={() => handleStatusChange(q.id, "REJEITADO")}>
                                                        <XCircle className="h-3.5 w-3.5 mr-2 text-red-600" /> Rejeitar
                                                    </DropdownMenuItem>
                                                )}
                                                {q.status !== "PENDENTE" && (
                                                    <DropdownMenuItem onClick={() => handleStatusChange(q.id, "PENDENTE")}>
                                                        <Clock className="h-3.5 w-3.5 mr-2 text-yellow-600" /> Voltar a Pendente
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => setDeleteQuoteId(q.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Quote Modal */}
            <SupplierQuoteModal
                open={quoteModalOpen}
                onOpenChange={(open) => { setQuoteModalOpen(open); if (!open) setEditingQuote(null) }}
                supplierId={supplier.id}
                initialData={editingQuote}
                onSuccess={() => router.refresh()}
            />

            {/* Delete Dialog */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O fornecedor <strong>{supplier.name}</strong> será removido permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? "Excluindo..." : "Excluir"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Quote Dialog */}
            <AlertDialog open={!!deleteQuoteId} onOpenChange={(open) => { if (!open) setDeleteQuoteId(null) }}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O orçamento será removido permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteQuote}
                            disabled={deletingQuote}
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deletingQuote ? "Excluindo..." : "Excluir"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
