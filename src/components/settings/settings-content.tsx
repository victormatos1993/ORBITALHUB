"use client"

import { useState, useEffect } from "react"
import { getCompany, saveCompany } from "@/app/actions/company"
import {
    User,
    Building2,
    CreditCard,
    Bell,
    Receipt,
    Users,
    Palette,
    Shield,
    ChevronRight,
    Mail,
    Phone,
    Pencil,
    Camera,
    Eye,
    EyeOff,
    Check,
    Crown,
    Clock,
    Download,
    Plus,
    Trash2,
    Key,
    Smartphone,
    Globe,
    FileText,
    Upload,
    Info,
    AlertTriangle,
    Zap,
    MonitorSmartphone,
    LogOut,
    Lock,
    MapPin,
    Hash,
    ShoppingBag,
    Settings,
    Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { TeamTab } from "./team-tab"
import { useSession } from "next-auth/react"
import { updateUserProfile } from "@/app/actions/user"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { MaintenanceOverlay } from "@/components/ui/maintenance-overlay"

// ─── Tab configuration ───
const settingsTabs = [
    { id: "profile", label: "Perfil", icon: User },
    { id: "company", label: "Empresa", icon: Building2 },
    { id: "billing", label: "Plano e Cobrança", icon: CreditCard },
    { id: "team", label: "Equipe", icon: Users },
    { id: "fiscal", label: "Fiscal (NF-e)", icon: Receipt },
    { id: "notifications", label: "Notificações", icon: Bell },
    { id: "appearance", label: "Aparência", icon: Palette },
    { id: "security", label: "Segurança", icon: Shield },
]

// ─── Reusable Section Card ───
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

// ═══════════ PROFILE TAB ═══════════
function ProfileTab() {
    const { data: session, update: updateSession } = useSession()
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Form states
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        position: ""
    })

    // Initial load
    useEffect(() => {
        if (session?.user) {
            setFormData({
                name: session.user.name || "",
                phone: (session.user as any).phone || "",
                position: (session.user as any).position || ""
            })
        }
    }, [session])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const result = await updateUserProfile(formData)
            if (result.success) {
                await updateSession({
                    ...session,
                    user: {
                        ...session?.user,
                        name: formData.name,
                        phone: formData.phone,
                        position: formData.position
                    }
                })
                toast.success("Perfil atualizado com sucesso!")
            } else {
                toast.error(result.error || "Erro ao atualizar perfil.")
            }
        } catch (error) {
            toast.error("Ocorreu um erro ao salvar as alterações.")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Avatar & Name */}
            <SettingsCard title="Informações Pessoais" description="Gerencie seus dados pessoais e informações de contato.">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                    {/* Avatar */}
                    <div className="relative group">
                        <Avatar className="h-24 w-24 border-2 border-border shadow-inner">
                            <AvatarImage src={session?.user?.image || ""} />
                            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary uppercase">
                                {formData.name ? formData.name.substring(0, 2) : session?.user?.email?.substring(0, 2) || "U"}
                            </AvatarFallback>
                        </Avatar>
                        <button className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Camera className="h-6 w-6 text-white" />
                        </button>
                    </div>

                    {/* Fields */}
                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Nome Completo</Label>
                            <Input
                                placeholder="Seu nome"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">E-mail</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="email@exemplo.com"
                                    value={session?.user?.email || ""}
                                    disabled
                                    className="rounded-xl pl-10 bg-muted/50 cursor-not-allowed"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Telefone</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="(00) 00000-0000"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    className="rounded-xl pl-10"
                                    maxLength={15}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Cargo</Label>
                            <Input
                                placeholder="Ex: Gerente, Diretor..."
                                value={formData.position}
                                onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                                className="rounded-xl"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end mt-6">
                    <Button
                        className="rounded-xl gradient-primary text-white hover:opacity-90 min-w-[140px]"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                </div>
            </SettingsCard>

            {/* Change Password */}
            <SettingsCard title="Alterar Senha" description="Mantenha sua conta segura atualizando sua senha regularmente.">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Senha Atual</Label>
                        <div className="relative">
                            <Input
                                type={showCurrentPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="rounded-xl pr-10"
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Nova Senha</Label>
                        <div className="relative">
                            <Input
                                type={showNewPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="rounded-xl pr-10"
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Confirmar Nova Senha</Label>
                        <Input type="password" placeholder="••••••••" className="rounded-xl" />
                    </div>
                </div>
                <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>A senha deve ter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais.</span>
                </div>
                <div className="flex justify-end mt-4">
                    <Button variant="outline" className="rounded-xl" onClick={() => toast.success("Senha alterada com sucesso!")}>
                        <Lock className="mr-2 h-4 w-4" />
                        Alterar Senha
                    </Button>
                </div>
            </SettingsCard>
        </div>
    )
}

// ═══════════ COMPANY TAB ═══════════
function CompanyTab() {
    const [loading, setLoading] = useState(true)
    const [savingSection, setSavingSection] = useState<string | null>(null)
    const [companyData, setCompanyData] = useState<any>({
        name: "",
        tradingName: "",
        document: "",
        email: "",
        phone: "",
        mobile: "",
        address: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zipCode: "",
        logoUrl: "",
        quoteNotes: "",
    })

    // Load initial data
    useEffect(() => {
        async function load() {
            setLoading(true)
            const res = await getCompany()
            if (res?.data) {
                // Merge data
                setCompanyData((prev: any) => ({ ...prev, ...res.data }))
            }
            setLoading(false)
        }
        load()
    }, [])

    const handleChange = (field: string, value: string) => {
        let formattedValue = value

        if (field === "document") {
            formattedValue = value.replace(/\D/g, '')
                .replace(/^(\d{2})(\d)/, '$1.$2')
                .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                .replace(/\.(\d{3})(\d)/, '.$1/$2')
                .replace(/(\d{4})(\d)/, '$1-$2')
                .slice(0, 18)
        } else if (field === "phone" || field === "mobile") {
            formattedValue = value.replace(/\D/g, '')
                .replace(/^(\d{2})(\d)/g, '($1) $2')
                .replace(/(\d{4,5})(\d{4})$/, '$1-$2')
                .slice(0, 15)
        } else if (field === "zipCode") {
            formattedValue = value.replace(/\D/g, '')
                .replace(/^(\d{5})(\d)/, '$1-$2')
                .slice(0, 9)
        }

        setCompanyData((prev: any) => ({ ...prev, [field]: formattedValue }))

        if (field === "zipCode" && formattedValue.length === 9) {
            handleCepSearch(formattedValue)
        }
    }

    const handleCepSearch = async (cep: string) => {
        const cleanCep = cep.replace(/\D/g, '')
        if (cleanCep.length === 8) {
            try {
                const toastId = toast.loading("Buscando CEP...")
                const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
                const data = await res.json()
                toast.dismiss(toastId)
                if (!data.erro) {
                    setCompanyData((prev: any) => ({
                        ...prev,
                        address: data.logradouro || prev.address,
                        neighborhood: data.bairro || prev.neighborhood,
                        city: data.localidade || prev.city,
                        state: data.uf || prev.state
                    }))
                    toast.success("Endereço preenchido automaticamente")
                } else {
                    toast.error("CEP não encontrado")
                }
            } catch (error) {
                toast.error("Erro ao buscar CEP")
            }
        }
    }

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error("A imagem deve ter no máximo 2MB")
                return
            }
            const reader = new FileReader()
            reader.onloadend = () => {
                const base64String = reader.result as string
                handleChange("logoUrl", base64String)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSave = async (section: string) => {
        setSavingSection(section)
        const toastId = toast.loading(`Salvando ${section}...`)
        try {
            const res = await saveCompany(companyData)
            if (res.error) {
                toast.error(res.error, { id: toastId })
            } else {
                toast.success(`${section} salvo com sucesso!`, { id: toastId })
            }
        } catch {
            toast.error("Erro interno ao salvar", { id: toastId })
        } finally {
            setSavingSection(null)
        }
    }

    if (loading) {
        return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
    }

    return (
        <div className="space-y-6">
            <SettingsCard title="Dados da Empresa" description="Informações cadastrais que aparecerão nos documentos e notas fiscais.">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                    {/* Logo */}
                    <div className="shrink-0">
                        <Label className="text-xs text-muted-foreground mb-2 block">Logotipo</Label>
                        <div className="relative group h-24 w-24 rounded-2xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden">
                            {companyData.logoUrl ? (
                                <img src={companyData.logoUrl} alt="Logo da empresa" className="w-full h-full object-contain" />
                            ) : (
                                <Upload className="h-8 w-8 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                            )}
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoUpload} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">PNG, JPG até 2MB</p>
                    </div>

                    {/* Fields */}
                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 space-y-2">
                            <Label className="text-sm font-medium">Razão Social</Label>
                            <Input placeholder="Nome da empresa conforme contrato social" value={companyData.name} onChange={e => handleChange("name", e.target.value)} className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Nome Fantasia</Label>
                            <Input placeholder="Nome comercial da empresa" value={companyData.tradingName} onChange={e => handleChange("tradingName", e.target.value)} className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">CNPJ</Label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="00.000.000/0000-00" value={companyData.document} onChange={e => handleChange("document", e.target.value)} className="rounded-xl pl-10" maxLength={18} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end mt-6">
                    <Button disabled={savingSection === "Dados da empresa"} className="rounded-xl gradient-primary text-white hover:opacity-90" onClick={() => handleSave("Dados da empresa")}>
                        Salvar Dados
                    </Button>
                </div>
            </SettingsCard>

            {/* Address */}
            <SettingsCard title="Endereço" description="Endereço da sede da empresa.">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">CEP</Label>
                        <Input placeholder="00000-000" value={companyData.zipCode} onChange={e => handleChange("zipCode", e.target.value)} className="rounded-xl" maxLength={9} />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <Label className="text-sm font-medium">Endereço</Label>
                        <Input placeholder="Rua, Avenida..." value={companyData.address} onChange={e => handleChange("address", e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Número</Label>
                        <Input placeholder="Nº" value={companyData.number} onChange={e => handleChange("number", e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Complemento</Label>
                        <Input placeholder="Sala, Andar..." value={companyData.complement} onChange={e => handleChange("complement", e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Bairro</Label>
                        <Input placeholder="Bairro" value={companyData.neighborhood} onChange={e => handleChange("neighborhood", e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Cidade</Label>
                        <Input placeholder="Cidade" value={companyData.city} onChange={e => handleChange("city", e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Estado</Label>
                        <Select value={companyData.state} onValueChange={val => handleChange("state", val)}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="UF" />
                            </SelectTrigger>
                            <SelectContent>
                                {["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"].map(uf => (
                                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">País</Label>
                        <Input placeholder="Brasil" defaultValue="Brasil" className="rounded-xl" />
                    </div>
                </div>
                <div className="flex justify-end mt-6">
                    <Button disabled={savingSection === "Endereço"} className="rounded-xl gradient-primary text-white hover:opacity-90" onClick={() => handleSave("Endereço")}>
                        Salvar Endereço
                    </Button>
                </div>
            </SettingsCard>

            {/* Contact */}
            <SettingsCard title="Contato Comercial" description="Informações de contato da empresa para clientes e fornecedores.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Telefone Comercial</Label>
                        <Input placeholder="(00) 0000-0000" value={companyData.phone} onChange={e => handleChange("phone", e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">WhatsApp</Label>
                        <Input placeholder="(00) 00000-0000" value={companyData.mobile} onChange={e => handleChange("mobile", e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">E-mail Comercial</Label>
                        <Input placeholder="contato@empresa.com" value={companyData.email} onChange={e => handleChange("email", e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Website</Label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="www.suaempresa.com.br" className="rounded-xl pl-10" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end mt-6">
                    <Button disabled={savingSection === "Contato Comercial"} className="rounded-xl gradient-primary text-white hover:opacity-90" onClick={() => handleSave("Contato Comercial")}>
                        Salvar Contato
                    </Button>
                </div>
            </SettingsCard>
        </div>
    )
}

// ═══════════ BILLING TAB ═══════════
function BillingTab() {
    // Simula dados do trial (em produção virá do banco)
    const trialDaysLeft = 5
    const trialEndDate = "24/02/2026"

    return (
        <div className="relative">
            <div className="absolute inset-0 z-10">
                <MaintenanceOverlay
                    title="Plano e Cobrança em Manutenção"
                    description="Estamos finalizando as integrações com gateways de pagamento para garantir a máxima segurança em suas transações."
                />
            </div>
            <div className="opacity-20 pointer-events-none select-none filter blur-[2px] space-y-6">
                {/* Trial Banner */}
                <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15">
                            <Clock className="h-6 w-6 text-amber-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-amber-400">
                                Teste Gratuito — {trialDaysLeft} dias restantes
                            </h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Seu período de teste expira em <span className="font-semibold text-foreground">{trialEndDate}</span>.
                                Após o término, sua conta será migrada automaticamente para o plano <span className="font-semibold text-foreground">Starter</span>.
                            </p>
                        </div>
                        <Button className="rounded-xl gradient-primary text-white hover:opacity-90 shrink-0 gap-1.5">
                            <Zap className="h-4 w-4" />
                            Assinar Agora
                        </Button>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-4 relative">
                        <div className="h-1.5 w-full rounded-full bg-amber-500/10 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
                                style={{ width: `${((7 - trialDaysLeft) / 7) * 100}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-1.5">
                            <span className="text-[10px] text-muted-foreground">Início do teste</span>
                            <span className="text-[10px] text-amber-500 font-medium">{trialDaysLeft} de 7 dias</span>
                        </div>
                    </div>
                </div>

                {/* Plans */}
                <SettingsCard
                    title="Planos Disponíveis"
                    description="Escolha o plano ideal para o seu negócio. Todos os planos incluem 7 dias de teste grátis."
                    badge={
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1.5 font-semibold">
                            <Clock className="h-3.5 w-3.5" />
                            Período de Teste
                        </Badge>
                    }
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Starter Plan */}
                        <div className="rounded-xl border-2 border-primary bg-primary/5 p-5 relative flex flex-col">
                            <div className="absolute -top-2.5 left-4">
                                <Badge className="bg-primary text-white text-[10px] shadow-lg shadow-primary/25">Após o teste</Badge>
                            </div>
                            <h4 className="font-bold text-lg mt-1">Starter</h4>
                            <p className="text-2xl font-bold mt-1">R$ 49,90<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                            <Separator className="my-3" />
                            <ul className="space-y-2.5 text-sm text-muted-foreground flex-1">
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Até 100 clientes</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Até 200 vendas/mês</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> PDV completo</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Relatórios básicos</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> 2 usuários</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" /> Suporte por e-mail</li>
                            </ul>
                            <Button variant="outline" className="w-full mt-5 rounded-xl border-primary/40 text-primary hover:bg-primary/10 h-11">
                                Plano Inicial
                            </Button>
                        </div>

                        {/* Profissional Plan */}
                        <div className="rounded-xl border-2 border-emerald-500/50 bg-gradient-to-b from-emerald-500/5 to-transparent p-5 hover:border-emerald-500/70 transition-all relative flex flex-col shadow-lg shadow-emerald-500/5">
                            <div className="absolute -top-2.5 right-4">
                                <Badge className="bg-emerald-500 text-white text-[10px] shadow-lg shadow-emerald-500/25">⭐ Mais Popular</Badge>
                            </div>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/8 to-transparent rounded-bl-[48px]" />
                            <h4 className="font-bold text-lg mt-1">Profissional</h4>
                            <p className="text-2xl font-bold mt-1">R$ 97<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                            <Separator className="my-3" />
                            <ul className="space-y-2.5 text-sm text-muted-foreground flex-1">
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Clientes ilimitados</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Vendas ilimitadas</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Emissão de NF-e</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> 5 usuários</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Relatórios avançados</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Suporte prioritário</li>
                            </ul>
                            <Button className="w-full mt-5 rounded-xl gradient-primary text-white hover:opacity-90 h-11 shadow-lg shadow-primary/20">
                                <Zap className="mr-2 h-4 w-4" />
                                Fazer Upgrade
                            </Button>
                        </div>

                        {/* Enterprise Plan */}
                        <div className="rounded-xl border bg-card p-5 hover:border-primary/40 transition-all relative overflow-hidden flex flex-col">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-purple-500/8 to-transparent rounded-bl-[40px]" />
                            <h4 className="font-bold text-lg mt-1">Enterprise</h4>
                            <p className="text-2xl font-bold mt-1">R$ 247<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                            <Separator className="my-3" />
                            <ul className="space-y-2.5 text-sm text-muted-foreground flex-1">
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> Tudo do Profissional</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> Usuários ilimitados</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> API dedicada</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> Suporte dedicado</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> White-label</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-purple-400 shrink-0" /> SLA garantido</li>
                            </ul>
                            <Button variant="outline" className="w-full mt-5 rounded-xl h-11">
                                Falar com Vendas
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-muted/20 text-xs text-muted-foreground">
                        <Info className="h-4 w-4 shrink-0" />
                        <span>Todos os planos incluem acesso completo durante os 7 dias de teste. Cancele a qualquer momento sem cobrança.</span>
                    </div>
                </SettingsCard>

                {/* Payment Method */}
                <SettingsCard title="Método de Pagamento" description="Adicione um método de pagamento para continuar usando após o período de teste.">
                    <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/20">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                            <CreditCard className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Nenhum método de pagamento cadastrado</p>
                            <p className="text-xs text-muted-foreground/60 mt-0.5">Adicione um cartão para garantir a continuidade após o teste</p>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-xl gap-1.5">
                            <Plus className="h-4 w-4" />
                            Adicionar Cartão
                        </Button>
                    </div>
                </SettingsCard>

                {/* Payment History */}
                <SettingsCard title="Histórico de Pagamentos" description="Visualize seus pagamentos e baixe as notas fiscais.">
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                            <FileText className="h-7 w-7 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Nenhum pagamento realizado</p>
                        <p className="text-xs text-muted-foreground/60">Você está no período de teste gratuito. Pagamentos aparecerão aqui após a assinatura.</p>
                    </div>
                </SettingsCard>
            </div>
        </div>
    )
}

// ═══════════ FISCAL TAB ═══════════
function FiscalTab() {
    const [provider, setProvider] = useState("")

    return (
        <div className="relative">
            <div className="absolute inset-0 z-10">
                <MaintenanceOverlay
                    title="Emissão Fiscal em Manutenção"
                    description="Estamos certificando nosso motor de emissão de notas fiscais com os órgãos reguladores para garantir conformidade total."
                />
            </div>
            <div className="opacity-20 pointer-events-none select-none filter blur-[2px] space-y-6">
                {/* Status Overview */}
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-amber-500">Emissão de NF-e não configurada</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Para emitir notas fiscais, você precisa configurar um provedor de emissão e cadastrar o certificado digital da sua empresa.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Provider Selection */}
                <SettingsCard title="Provedor de NF-e" description="Selecione e configure o provedor que irá processar suas notas fiscais.">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Provedor</Label>
                            <Select value={provider} onValueChange={setProvider}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Selecione um provedor..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="nuvemfiscal">🔵 Nuvem Fiscal</SelectItem>
                                    <SelectItem value="focusnfe">🟢 Focus NFe</SelectItem>
                                    <SelectItem value="plugnotas">🟡 Plug Notas</SelectItem>
                                    <SelectItem value="enotas">🟣 eNotas</SelectItem>
                                    <SelectItem value="webmania">🔴 Webmania</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {provider && (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Token / API Key</Label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="Cole aqui o token fornecido pelo provedor" className="rounded-xl pl-10 font-mono text-sm" type="password" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Você encontra esse token no painel do provedor selecionado.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Ambiente</Label>
                                    <Select defaultValue="homologacao">
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="homologacao">🧪 Homologação (Testes)</SelectItem>
                                            <SelectItem value="producao">🚀 Produção</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex justify-end mt-6">
                        <Button className="rounded-xl gradient-primary text-white hover:opacity-90" disabled={!provider} onClick={() => toast.success("Provedor configurado!")}>
                            Salvar Configuração
                        </Button>
                    </div>
                </SettingsCard>

                {/* Digital Certificate */}
                <SettingsCard title="Certificado Digital" description="Faça upload do certificado digital e-CNPJ A1 (.pfx) da sua empresa.">
                    <div className="flex items-center gap-4 p-5 rounded-xl border-2 border-dashed border-border bg-muted/10 hover:border-primary/40 transition-colors cursor-pointer relative">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted">
                            <Shield className="h-7 w-7 text-muted-foreground/40" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium">Nenhum certificado cadastrado</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Arraste ou clique para enviar seu certificado digital (.pfx)</p>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-xl gap-1.5 shrink-0">
                            <Upload className="h-4 w-4" />
                            Enviar Certificado
                        </Button>
                        <input type="file" accept=".pfx,.p12" className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Senha do Certificado</Label>
                            <Input type="password" placeholder="Senha do arquivo .pfx" className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Validade</Label>
                            <Input placeholder="Será preenchido automaticamente" className="rounded-xl" disabled />
                        </div>
                    </div>
                </SettingsCard>

                {/* NF-e Config */}
                <SettingsCard title="Configurações da NF-e" description="Defina os parâmetros padrão para emissão de notas fiscais.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Série da NF-e</Label>
                            <Input placeholder="1" defaultValue="1" className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Próximo Nº da NF-e</Label>
                            <Input placeholder="1" defaultValue="1" className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Natureza da Operação</Label>
                            <Input placeholder="Venda de mercadoria" defaultValue="Venda de mercadoria" className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Informações Complementares</Label>
                            <Textarea placeholder="Texto padrão para informações complementares da NF-e" className="rounded-xl resize-none" rows={2} />
                        </div>
                    </div>
                </SettingsCard>
            </div>
        </div>
    )
}

// ═══════════ NOTIFICATIONS TAB ═══════════
function NotificationsTab() {
    return (
        <div className="relative">
            <div className="absolute inset-0 z-10">
                <MaintenanceOverlay
                    title="Notificações em Manutenção"
                    description="Estamos aprimorando nosso sistema de mensageria para incluir alertas via WhatsApp e SMS em tempo real."
                />
            </div>
            <div className="opacity-20 pointer-events-none select-none filter blur-[2px] space-y-6">
                <SettingsCard title="Notificações por E-mail" description="Escolha quais notificações deseja receber por e-mail.">
                    <div className="space-y-4">
                        {[
                            { title: "Vendas realizadas", desc: "Receba um e-mail para cada venda finalizada no PDV.", default: true },
                            { title: "Pagamentos recebidos", desc: "Notificação quando um pagamento pendente for confirmado.", default: true },
                            { title: "Contas a pagar vencendo", desc: "Alerta 3 dias antes do vencimento de contas a pagar.", default: true },
                            { title: "Estoque baixo", desc: "Aviso quando o estoque de um produto atingir o mínimo.", default: false },
                            { title: "Novo cliente cadastrado", desc: "Notificação quando um novo cliente se cadastrar.", default: false },
                            { title: "Relatório semanal", desc: "Resumo semanal com faturamento, vendas e métricas.", default: true },
                        ].map((item) => (
                            <div key={item.title} className="flex items-center justify-between py-2">
                                <div>
                                    <p className="text-sm font-medium">{item.title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                                </div>
                                <Switch defaultChecked={item.default} />
                            </div>
                        ))}
                    </div>
                </SettingsCard>

                <SettingsCard title="Notificações no Sistema" description="Configurações de notificações dentro do Orbital Hub.">
                    <div className="space-y-4">
                        {[
                            { title: "Som de notificação", desc: "Tocar um som ao receber notificações no sistema.", default: true },
                            { title: "Notificações push", desc: "Receber notificações push no navegador.", default: false },
                            { title: "Alertas de NF-e", desc: "Notificar sobre status de notas fiscais (autorizada, rejeitada).", default: true },
                        ].map((item) => (
                            <div key={item.title} className="flex items-center justify-between py-2">
                                <div>
                                    <p className="text-sm font-medium">{item.title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                                </div>
                                <Switch defaultChecked={item.default} />
                            </div>
                        ))}
                    </div>
                </SettingsCard>
            </div>
        </div>
    )
}

// ═══════════ APPEARANCE TAB ═══════════
function AppearanceTab() {
    return (
        <div className="relative">
            <div className="absolute inset-0 z-10">
                <MaintenanceOverlay
                    title="Aparência em Manutenção"
                    description="Em breve você poderá personalizar cada detalhe visual do Orbital Hub, incluindo cores da marca e layouts exclusivos."
                />
            </div>
            <div className="opacity-20 pointer-events-none select-none filter blur-[2px] space-y-6">
                <SettingsCard title="Tema" description="Personalize a aparência do sistema.">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Dark Theme */}
                        <button
                            className="flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 border-primary bg-primary/5 transition-all hover:border-primary/60"
                        >
                            <div className="h-20 w-full rounded-lg border border-white/5 bg-[#0a0f1e] p-2 flex flex-col gap-1 overflow-hidden">
                                <div className="flex gap-1">
                                    <div className="w-3 h-full rounded-sm bg-white/10" />
                                    <div className="flex-1 flex flex-col gap-1">
                                        <div className="h-2 w-3/4 rounded bg-white/15" />
                                        <div className="h-1.5 w-1/2 rounded bg-white/8" />
                                        <div className="flex-1 rounded bg-white/5 mt-0.5" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Check className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Escuro</span>
                            </div>
                        </button>

                        {/* Light Theme */}
                        <button
                            className="flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 border-border transition-all hover:border-primary/40"
                        >
                            <div className="h-20 w-full rounded-lg border bg-white p-2 flex flex-col gap-1 overflow-hidden">
                                <div className="flex gap-1">
                                    <div className="w-3 h-full rounded-sm bg-gray-200" />
                                    <div className="flex-1 flex flex-col gap-1">
                                        <div className="h-2 w-3/4 rounded bg-gray-300" />
                                        <div className="h-1.5 w-1/2 rounded bg-gray-200" />
                                        <div className="flex-1 rounded bg-gray-100 mt-0.5" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium">Claro</span>
                            </div>
                        </button>

                        {/* System Theme */}
                        <button
                            className="flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 border-border transition-all hover:border-primary/40"
                        >
                            <div className="h-20 w-full rounded-lg border overflow-hidden flex">
                                <div className="w-1/2 bg-[#0a0f1e] p-1.5 flex flex-col gap-0.5">
                                    <div className="h-1.5 w-3/4 rounded bg-white/15" />
                                    <div className="h-1 w-1/2 rounded bg-white/8" />
                                    <div className="flex-1 rounded bg-white/5 mt-0.5" />
                                </div>
                                <div className="w-1/2 bg-white p-1.5 flex flex-col gap-0.5">
                                    <div className="h-1.5 w-3/4 rounded bg-gray-300" />
                                    <div className="h-1 w-1/2 rounded bg-gray-200" />
                                    <div className="flex-1 rounded bg-gray-100 mt-0.5" />
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium">Sistema</span>
                            </div>
                        </button>
                    </div>
                </SettingsCard>

                <SettingsCard title="Personalização" description="Ajuste detalhes visuais do sistema.">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-sm font-medium">Barra lateral compacta</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Mostrar apenas ícones na barra lateral.</p>
                            </div>
                            <Switch defaultChecked={true} />
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-sm font-medium">Animações</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Ativar animações e transições na interface.</p>
                            </div>
                            <Switch defaultChecked={true} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Idioma</Label>
                            <Select defaultValue="pt-BR">
                                <SelectTrigger className="rounded-xl w-56">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pt-BR">🇧🇷 Português (Brasil)</SelectItem>
                                    <SelectItem value="en">🇺🇸 English</SelectItem>
                                    <SelectItem value="es">🇪🇸 Español</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Fuso Horário</Label>
                            <Select defaultValue="America/Sao_Paulo">
                                <SelectTrigger className="rounded-xl w-56">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                                    <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                                    <SelectItem value="America/Belem">Belém (GMT-3)</SelectItem>
                                    <SelectItem value="America/Fortaleza">Fortaleza (GMT-3)</SelectItem>
                                    <SelectItem value="America/Cuiaba">Cuiabá (GMT-4)</SelectItem>
                                    <SelectItem value="America/Rio_Branco">Rio Branco (GMT-5)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </SettingsCard>
            </div>
        </div>
    )
}

// ═══════════ SECURITY TAB ═══════════
function SecurityTab() {
    return (
        <div className="relative">
            <div className="absolute inset-0 z-10">
                <MaintenanceOverlay
                    title="Segurança em Manutenção"
                    description="Estamos implementando novos protocolos de criptografia e auditoria para garantir que sua conta Orbital Hub seja inviolável."
                />
            </div>
            <div className="opacity-20 pointer-events-none select-none filter blur-[2px] space-y-6">
                <SettingsCard title="Autenticação em Dois Fatores (2FA)" description="Adicione uma camada extra de segurança à sua conta.">
                    <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/10">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                            <Smartphone className="h-6 w-6 text-amber-500" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium">2FA Desativado</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Proteja sua conta com autenticação por aplicativo (Google Authenticator, Authy).</p>
                        </div>
                        <Button variant="outline" className="rounded-xl gap-1.5">
                            <Shield className="h-4 w-4" />
                            Ativar 2FA
                        </Button>
                    </div>
                </SettingsCard>

                <SettingsCard title="Sessões Ativas" description="Gerencie os dispositivos conectados à sua conta.">
                    <div className="space-y-3">
                        {[
                            { device: "Chrome em macOS", location: "São Paulo, BR", time: "Agora mesmo", current: true, icon: MonitorSmartphone },
                        ].map((session, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-muted/10">
                                <div className={cn(
                                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                                    session.current ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                                )}>
                                    <session.icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium">{session.device}</p>
                                        {session.current && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">Sessão atual</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                        <MapPin className="h-3 w-3" /> {session.location} · <Clock className="h-3 w-3" /> {session.time}
                                    </p>
                                </div>
                                {!session.current && (
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl gap-1">
                                        <LogOut className="h-4 w-4" />
                                        Encerrar
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" className="mt-4 rounded-xl gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10">
                        <LogOut className="h-4 w-4" />
                        Encerrar Todas as Outras Sessões
                    </Button>
                </SettingsCard>

                {/* Danger zone */}
                <SettingsCard title="Zona de Perigo" description="Ações irreversíveis na sua conta." className="border-destructive/30">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                        <div>
                            <p className="text-sm font-medium text-destructive">Excluir Conta</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Remove permanentemente sua conta e todos os dados associados.</p>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-1.5">
                                    <Trash2 className="h-4 w-4" />
                                    Excluir Conta
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-2xl">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-destructive">
                                        <AlertTriangle className="h-5 w-5" />
                                        Confirmar Exclusão
                                    </DialogTitle>
                                    <DialogDescription>
                                        Esta ação é permanente e não pode ser desfeita. Todos os seus dados, vendas, clientes e configurações serão apagados.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-2 py-4">
                                    <Label className="text-sm">Digite &quot;EXCLUIR&quot; para confirmar:</Label>
                                    <Input placeholder="EXCLUIR" className="rounded-xl" />
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" className="rounded-xl">Cancelar</Button>
                                    <Button variant="destructive" className="rounded-xl" disabled>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Excluir Permanentemente
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </SettingsCard>
            </div>
        </div>
    )
}

// ShoppingBag moved to main import block

// ═══════════ MAIN SETTINGS CONTENT ═══════════
export function SettingsContent() {
    const [activeTab, setActiveTab] = useState("profile")

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                    <Settings className="h-6 w-6 text-primary" />
                </div>
                <div className="flex flex-col gap-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
                    <p className="text-sm text-muted-foreground">
                        Gerencie as configurações da sua conta, empresa e sistema.
                    </p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Navigation */}
                <nav className="lg:w-[240px] shrink-0">
                    <div className="flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 lg:border lg:rounded-2xl lg:p-2 lg:bg-card/50">
                        {settingsTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                                    activeTab === tab.id
                                        ? "bg-primary/10 text-primary shadow-sm shadow-primary/5"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <tab.icon className="h-4 w-4 shrink-0" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {activeTab === "profile" && <ProfileTab />}
                    {activeTab === "company" && <CompanyTab />}
                    {activeTab === "billing" && <BillingTab />}
                    {activeTab === "team" && <TeamTab />}
                    {activeTab === "fiscal" && <FiscalTab />}
                    {activeTab === "notifications" && <NotificationsTab />}
                    {activeTab === "appearance" && <AppearanceTab />}
                    {activeTab === "security" && <SecurityTab />}
                </div>
            </div>
        </div>
    )
}
