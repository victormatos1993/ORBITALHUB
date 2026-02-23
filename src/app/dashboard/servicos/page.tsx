"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
    Wrench,
    Plus,
    Search,
    Pencil,
    Trash2,
    Clock,
    DollarSign,
    Tag,
    MoreHorizontal,
    Loader2,
    Power,
    PowerOff,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

import { getServices, updateService, deleteService } from "@/app/actions/service"
import { ServiceModal } from "@/components/services/service-modal"

type ServiceItem = {
    id: string
    name: string
    description: string | null
    price: number
    duration: number | null
    category: string | null
    active: boolean
    createdAt: Date
}

const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

function formatDuration(minutes: number | null) {
    if (!minutes) return null
    if (minutes < 60) return `${minutes}min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export default function ServicosPage() {
    const [services, setServices] = useState<ServiceItem[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [modalOpen, setModalOpen] = useState(false)
    const [editingService, setEditingService] = useState<ServiceItem | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const loadServices = async () => {
        try {
            const data = await getServices()
            setServices(data as ServiceItem[])
        } catch {
            toast.error("Erro ao carregar serviços")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadServices() }, [])

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category?.toLowerCase().includes(search.toLowerCase()) ||
        s.description?.toLowerCase().includes(search.toLowerCase())
    )

    const handleOpenCreate = () => {
        setEditingService(null)
        setModalOpen(true)
    }

    const handleOpenEdit = (service: ServiceItem) => {
        setEditingService(service)
        setModalOpen(true)
    }

    const handleToggleActive = async (service: ServiceItem) => {
        const res = await updateService(service.id, {
            name: service.name,
            description: service.description,
            price: service.price,
            duration: service.duration,
            category: service.category,
            active: !service.active,
        })
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(service.active ? "Serviço desativado" : "Serviço ativado")
            loadServices()
        }
    }

    const handleDelete = async () => {
        if (!deletingId) return
        const res = await deleteService(deletingId)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Serviço excluído")
            loadServices()
        }
        setDeleteDialogOpen(false)
        setDeletingId(null)
    }

    const activeCount = services.filter(s => s.active).length

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">Catálogo de Serviços</h1>
                    <p className="text-sm text-muted-foreground">
                        Gerencie os serviços tabelados da sua empresa
                    </p>
                </div>
                <Button
                    className="rounded-xl gradient-primary text-white hover:opacity-90 gap-2"
                    onClick={handleOpenCreate}
                >
                    <Plus className="h-4 w-4" />
                    Novo Serviço
                </Button>
            </div>

            {/* Stats + Search */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar serviço por nome, categoria..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 rounded-xl"
                    />
                </div>
                <Badge variant="secondary" className="rounded-lg px-3 py-1.5 text-xs whitespace-nowrap">
                    {activeCount} ativo{activeCount !== 1 ? "s" : ""} · {services.length} total
                </Badge>
            </div>

            {/* Service Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredServices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 rounded-2xl border bg-card">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                        <Wrench className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">
                        {search ? "Nenhum serviço encontrado" : "Nenhum serviço cadastrado"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        {search ? "Tente buscar por outro termo." : "Comece cadastrando seus serviços tabelados."}
                    </p>
                    {!search && (
                        <Button onClick={handleOpenCreate} className="rounded-xl gradient-primary text-white hover:opacity-90 gap-2">
                            <Plus className="h-4 w-4" /> Cadastrar Primeiro Serviço
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredServices.map(service => (
                        <div
                            key={service.id}
                            className={`group relative rounded-2xl border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-primary/20 ${!service.active ? "opacity-60" : ""}`}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0 pr-2">
                                    <h3 className="font-semibold text-sm truncate">{service.name}</h3>
                                    {service.description && (
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                            {service.description}
                                        </p>
                                    )}
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl">
                                        <DropdownMenuItem onClick={() => handleOpenEdit(service)} className="gap-2">
                                            <Pencil className="h-3.5 w-3.5" /> Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleActive(service)} className="gap-2">
                                            {service.active ? (
                                                <><PowerOff className="h-3.5 w-3.5" /> Desativar</>
                                            ) : (
                                                <><Power className="h-3.5 w-3.5" /> Ativar</>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => { setDeletingId(service.id); setDeleteDialogOpen(true) }}
                                            className="gap-2 text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Price */}
                            <div className="flex items-center gap-1.5 mb-3">
                                <DollarSign className="h-4 w-4 text-emerald-500" />
                                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatBRL(service.price)}
                                </span>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                {service.category && (
                                    <Badge variant="secondary" className="text-[10px] gap-1 rounded-lg">
                                        <Tag className="h-2.5 w-2.5" />
                                        {service.category}
                                    </Badge>
                                )}
                                {service.duration && (
                                    <Badge variant="outline" className="text-[10px] gap-1 rounded-lg">
                                        <Clock className="h-2.5 w-2.5" />
                                        {formatDuration(service.duration)}
                                    </Badge>
                                )}
                                {!service.active && (
                                    <Badge variant="destructive" className="text-[10px] rounded-lg">Inativo</Badge>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Service Modal (avulso) */}
            <ServiceModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                editingService={editingService}
                onSaved={loadServices}
            />

            {/* Delete Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O serviço será removido permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
