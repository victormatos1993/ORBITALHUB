"use client"

import { useState, useEffect } from "react"
import { Users, Plus, Mail, Shield, Crown, ShoppingBag, CreditCard, Eye, Trash2, Key, Info, UserPlus, AlertTriangle, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getTeamMembers, createTeamMember, deleteTeamMember, updateTeamMemberRole } from "@/app/actions/team"
import { Role } from "@prisma/client"

// Friendly labels for roles
const roleLabels: Record<Role, string> = {
    ORACULO: "Oráculo",
    ADMINISTRADOR: "Administrador",
    GERENTE: "Gerente",
    VENDEDOR: "Vendedor",
    FINANCEIRO: "Financeiro",
    VISUALIZADOR: "Visualizador",
    USER: "Usuário",
    ADMIN: "Admin (Legado)",
}

const roleDescriptions: Record<Role, string> = {
    ORACULO: "Acesso total ao sistema (Master)",
    ADMINISTRADOR: "Controle total da conta e equipe",
    GERENTE: "Gestão de vendas, clientes e financeiro",
    VENDEDOR: "Acesso ao PDV e cadastro de clientes",
    FINANCEIRO: "Gestão de transações e relatórios",
    VISUALIZADOR: "Acesso somente leitura",
    USER: "Acesso básico",
    ADMIN: "Controle administrativo básico",
}

const roleColors: Record<Role, { text: string, bg: string, icon: any }> = {
    ORACULO: { text: "text-purple-500", bg: "bg-purple-500/10", icon: Shield },
    ADMINISTRADOR: { text: "text-red-500", bg: "bg-red-500/10", icon: Crown },
    GERENTE: { text: "text-amber-500", bg: "bg-amber-500/10", icon: Users },
    VENDEDOR: { text: "text-blue-500", bg: "bg-blue-500/10", icon: ShoppingBag },
    FINANCEIRO: { text: "text-emerald-500", bg: "bg-emerald-500/10", icon: CreditCard },
    VISUALIZADOR: { text: "text-neutral-500", bg: "bg-neutral-500/10", icon: Eye },
    USER: { text: "text-slate-500", bg: "bg-slate-500/10", icon: User },
    ADMIN: { text: "text-orange-500", bg: "bg-orange-500/10", icon: Shield },
}

function SettingsCard({ title, description, children, className, badge }: {
    title: string
    description?: string
    children: React.ReactNode
    className?: string
    badge?: React.ReactNode
}) {
    return (
        <div className={cn(
            "rounded-2xl border bg-card p-6 shadow-sm shadow-black/5 transition-shadow hover:shadow-md hover:shadow-black/10",
            className
        )}>
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h3 className="text-base font-semibold">{title}</h3>
                    {description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                    )}
                </div>
                {badge}
            </div>
            {children}
        </div>
    )
}

export function TeamTab() {
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "VENDEDOR" as Role
    })

    const fetchMembers = async () => {
        setLoading(true)
        try {
            const data = await getTeamMembers()
            setMembers(data)
        } catch (error) {
            toast.error("Erro ao carregar equipe")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMembers()
    }, [])

    const handleCreateMember = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        const toastId = toast.loading("Criando membro...")

        try {
            const res = await createTeamMember(formData)
            if (res.success) {
                toast.success("Membro adicionado com sucesso!", { id: toastId })
                setIsCreateModalOpen(false)
                setFormData({ name: "", email: "", password: "", role: "VENDEDOR" })
                fetchMembers()
            } else {
                toast.error(res.error || "Erro ao criar membro", { id: toastId })
            }
        } catch (error) {
            toast.error("Erro interno ao criar membro", { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteMember = async (id: string) => {
        const toastId = toast.loading("Removendo membro...")
        try {
            const res = await deleteTeamMember(id)
            if (res.success) {
                toast.success("Membro removido!", { id: toastId })
                fetchMembers()
            } else {
                toast.error(res.error || "Erro ao remover membro", { id: toastId })
            }
        } catch (error) {
            toast.error("Erro ao remover membro", { id: toastId })
        }
    }

    const handleUpdateRole = async (id: string, newRole: Role) => {
        const toastId = toast.loading("Atualizando perfil...")
        try {
            const res = await updateTeamMemberRole(id, newRole)
            if (res.success) {
                toast.success("Perfil atualizado!", { id: toastId })
                fetchMembers()
            } else {
                toast.error(res.error || "Erro ao atualizar perfil", { id: toastId })
            }
        } catch (error) {
            toast.error("Erro ao atualizar perfil", { id: toastId })
        }
    }

    if (loading && members.length === 0) {
        return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
    }

    return (
        <div className="space-y-6">
            <SettingsCard
                title="Membros da Equipe"
                description="Gerencie quem tem acesso ao sistema e suas permissões."
                badge={
                    <Badge variant="secondary" className="text-xs">{members.length} usuários</Badge>
                }
            >
                <div className="space-y-3 mb-4">
                    {members.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3 border rounded-xl bg-muted/5">
                            <Users className="h-10 w-10 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">Nenhum membro da equipe cadastrado.</p>
                        </div>
                    ) : (
                        members.map((member) => (
                            <div key={member.id} className="flex items-center gap-4 p-4 rounded-xl border bg-muted/10 hover:bg-muted/20 transition-colors">
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                                        {member.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium">{member.name}</p>
                                        <Badge variant="outline" className={cn("text-[10px] h-5", roleColors[member.role as Role]?.bg, roleColors[member.role as Role]?.text)}>
                                            {roleLabels[member.role as Role] || member.role}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{member.email}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select
                                        defaultValue={member.role}
                                        onValueChange={(val) => handleUpdateRole(member.id, val as Role)}
                                    >
                                        <SelectTrigger className="h-8 w-32 rounded-lg text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(roleLabels).filter(r => r !== "ORACULO").map((r) => (
                                                <SelectItem key={r} value={r} className="text-xs">
                                                    {roleLabels[r as Role]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-2xl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Remover Membro</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Tem certeza que deseja remover {member.name}? Esta ação não pode ser desfeita.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDeleteMember(member.id)}
                                                    className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Remover
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="rounded-xl gap-1.5 shadow-sm border-primary/20 hover:bg-primary/5 hover:text-primary transition-all">
                            <UserPlus className="h-4 w-4" />
                            Adicionar Membro
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[480px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
                        <form onSubmit={handleCreateMember}>
                            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-2">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-xl">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                                            <UserPlus className="h-5 w-5" />
                                        </div>
                                        Novo Membro da Equipe
                                    </DialogTitle>
                                    <DialogDescription className="text-muted-foreground pt-1">
                                        Configure os dados de acesso para o novo colaborador.
                                    </DialogDescription>
                                </DialogHeader>
                            </div>

                            <div className="p-6 space-y-5">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Nome Completo</Label>
                                        <Input
                                            placeholder="Nome do colaborador"
                                            className="rounded-xl h-11"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">E-mail de Acesso</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="email"
                                                placeholder="email@exemplo.com"
                                                className="rounded-xl pl-10 h-11"
                                                required
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Senha Inicial</Label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="text"
                                                placeholder="Crie uma senha temporária"
                                                className="rounded-xl pl-10 h-11"
                                                required
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground px-1 flex items-center gap-1">
                                            <Info className="h-3 w-3" /> O membro poderá alterar esta senha posteriormente.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Perfil de Acesso</Label>
                                        <Select
                                            value={formData.role}
                                            onValueChange={(val) => setFormData({ ...formData, role: val as Role })}
                                        >
                                            <SelectTrigger className="rounded-xl h-11">
                                                <SelectValue placeholder="Selecione um perfil..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-none shadow-xl">
                                                {Object.keys(roleLabels).filter(r => r !== "ORACULO").map((r) => (
                                                    <SelectItem key={r} value={r} className="rounded-lg py-3">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-semibold">{roleLabels[r as Role]}</span>
                                                            <span className="text-[10px] text-muted-foreground font-normal">{roleDescriptions[r as Role]}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 p-4 flex justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="rounded-xl h-11 px-6"
                                    onClick={() => setIsCreateModalOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="rounded-xl gradient-primary text-white hover:opacity-90 h-11 px-6 shadow-lg shadow-primary/20"
                                >
                                    {isSubmitting ? "Criando..." : "Criar Membro"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </SettingsCard>

            {/* Roles explanation */}
            <SettingsCard title="Perfis de Acesso" description="Entenda as permissões de cada perfil disponível no sistema.">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.keys(roleLabels).filter(r => r !== "ORACULO").map((r) => {
                        const role = r as Role
                        const config = roleColors[role]
                        const Icon = config.icon
                        return (
                            <div key={role} className="flex items-start gap-3 p-4 rounded-xl border bg-muted/10 hover:bg-muted/20 transition-all border-transparent hover:border-border">
                                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", config.bg, config.text)}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold">{roleLabels[role]}</p>
                                    <p className="text-[11px] leading-relaxed text-muted-foreground">{roleDescriptions[role]}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </SettingsCard>
        </div>
    )
}
