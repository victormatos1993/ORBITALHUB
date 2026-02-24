"use client"

import React, { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, MapPin, Users, Check, ChevronsUpDown, Package, FileText, Wrench, Plus, CirclePlus, Link as LinkIcon, UserPlus, Clock, Trash2, Repeat } from "lucide-react"
import { QuickCustomerDialog } from "@/components/customers/quick-customer-dialog"
import { createCustomer } from "@/app/actions/customer"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

interface EventModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialStart?: Date
    initialEnd?: Date
    initialCustomerName?: string
    initialCustomerEmail?: string
    initialCustomerPhone?: string
    initialTitle?: string
    initialType?: string
    initialLocation?: string
    initialIsLocal?: boolean
    initialProductId?: string
    initialServiceId?: string
    initialQuoteId?: string
    initialCustomerId?: string
    products?: any[]
    services?: any[]
    quotes?: any[]
    customers?: any[]
    eventTypes?: string[]
    onSave?: (event: any) => void
    onDelete?: () => void
    // Status duplo (Opção D)
    paymentStatus?: string | null
    attendanceStatus?: string | null
    onAttendanceChange?: (status: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW") => void
}

// Mocks removidos para garantir sistema limpo
const TIPOS_DE_EVENTO_MOCK: string[] = []
const CLIENTES_MOCK: string[] = []
const PRODUTOS_MOCK: string[] = []
const SERVICOS_MOCK: string[] = []
const ORCAMENTOS_MOCK: string[] = []

export function EventModal({
    open,
    onOpenChange,
    initialStart,
    initialEnd,
    initialCustomerName,
    initialCustomerEmail,
    initialCustomerPhone,
    initialTitle,
    initialType,
    initialLocation,
    initialIsLocal,
    initialProductId,
    initialServiceId,
    initialQuoteId,
    initialCustomerId,
    products = [],
    services = [],
    quotes = [],
    customers = [],
    eventTypes = [],
    onSave,
    onDelete,
    paymentStatus,
    attendanceStatus,
    onAttendanceChange,
}: EventModalProps) {
    // ─── Helper: parseia a string de localização "Logradouro: X | Número: Y | ..." ───
    const parseLocation = (loc?: string | null) => {
        const r = { logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", cep: "", referencia: "" }
        if (!loc) return r
        if (loc.includes(" | ")) {
            loc.split(" | ").forEach((seg: string) => {
                const [key, ...rest] = seg.split(":")
                if (rest.length > 0) {
                    const val = rest.join(":").trim()
                    if (key.trim() === "Logradouro") r.logradouro = val
                    if (key.trim() === "Número") r.numero = val
                    if (key.trim() === "Complemento") r.complemento = val
                    if (key.trim() === "Bairro") r.bairro = val
                    if (key.trim() === "Cidade") r.cidade = val
                    if (key.trim() === "UF") r.uf = val
                    if (key.trim() === "CEP") r.cep = val
                    if (key.trim() === "Ref") r.referencia = val
                } else {
                    r.logradouro = loc
                }
            })
        } else {
            r.logradouro = loc
        }
        return r
    }

    // ─── Estados iniciados diretamente pelos props ────────────────────────────
    // O componente pai usa key={eventId} para forçar remount ao trocar evento.
    const loc = parseLocation(initialLocation)

    const [titulo, setTitulo] = useState(initialTitle || "")
    const [tipoEvento, setTipoEvento] = useState(initialType || "")
    const [tiposCustomizados, setTiposCustomizados] = useState<string[]>([])
    const [tipoSearch, setTipoSearch] = useState("")
    const [clienteId, setClienteId] = useState(initialCustomerId || "")

    // Datas — separadas em data, hora, minuto
    const initStart = initialStart || new Date()
    const initEnd = initialEnd || new Date(Date.now() + 3600000)
    const [startDateObj, setStartDateObj] = useState<Date>(initStart)
    const [startHour, setStartHour] = useState(String(initStart.getHours()).padStart(2, "0"))
    const [startMin, setStartMin] = useState(String(Math.floor(initStart.getMinutes() / 5) * 5).padStart(2, "0"))
    const [endDateObj, setEndDateObj] = useState<Date>(initEnd)
    const [endHour, setEndHour] = useState(String(initEnd.getHours()).padStart(2, "0"))
    const [endMin, setEndMin] = useState(String(Math.floor(initEnd.getMinutes() / 5) * 5).padStart(2, "0"))
    const [calendarOpenInicio, setCalendarOpenInicio] = useState(false)
    const [calendarOpenFim, setCalendarOpenFim] = useState(false)

    // Local
    const [isLocal, setIsLocal] = useState(initialIsLocal ?? !!initialLocation)
    const [endereco, setEndereco] = useState(initialLocation || "")
    const [cep, setCep] = useState(loc.cep)
    const [logradouro, setLogradouro] = useState(loc.logradouro)
    const [numero, setNumero] = useState(loc.numero)
    const [complemento, setComplemento] = useState(loc.complemento)
    const [bairro, setBairro] = useState(loc.bairro)
    const [cidade, setCidade] = useState(loc.cidade)
    const [uf, setUf] = useState(loc.uf)
    const [referencia, setReferencia] = useState(loc.referencia)

    // Cliente
    const [clienteOpen, setClienteOpen] = useState(false)
    const [clienteSelecionado, setClienteSelecionado] = useState(initialCustomerName || "")
    const [clienteEmail, setClienteEmail] = useState(initialCustomerEmail || "")
    const [clienteTelefone, setClienteTelefone] = useState(initialCustomerPhone || "")
    const [clienteSearch, setClienteSearch] = useState("")
    const [quickCustomerOpen, setQuickCustomerOpen] = useState(false)

    // Associações
    const [enableProduct, setEnableProduct] = useState(!!initialProductId)
    const [enableService, setEnableService] = useState(!!initialServiceId)
    const [enableQuote, setEnableQuote] = useState(!!initialQuoteId)
    const [productId, setProductId] = useState(initialProductId || "")
    const [serviceId, setServiceId] = useState(initialServiceId || "")
    const [quoteOpen, setQuoteOpen] = useState(false)
    const [quoteId, setQuoteId] = useState(initialQuoteId || "")

    // Recorrência (apenas para novo evento)
    const isEditing = !!initialTitle
    const [enableRecurrence, setEnableRecurrence] = useState(false)
    const [recurrenceRule, setRecurrenceRule] = useState("WEEKLY")
    const [recurrenceCount, setRecurrenceCount] = useState(4)

    useEffect(() => {
        setTiposCustomizados(Array.from(new Set([...TIPOS_DE_EVENTO_MOCK, ...eventTypes])))
    }, [eventTypes])

    // ── Helpers para montar Date a partir dos states separados ──
    const buildDate = (dateObj: Date, hour: string, min: string): Date => {
        const d = new Date(dateObj)
        d.setHours(parseInt(hour), parseInt(min), 0, 0)
        return d
    }

    const getStartDate = () => buildDate(startDateObj, startHour, startMin)
    const getEndDate = () => buildDate(endDateObj, endHour, endMin)

    // Quando o início muda, atualiza o fim mantendo a duração
    const syncEndFromStart = (newStart: Date) => {
        const oldStart = getStartDate()
        const oldEnd = getEndDate()
        let diff = oldEnd.getTime() - oldStart.getTime()
        if (diff < 0) diff = 3600000
        const newEnd = new Date(newStart.getTime() + diff)
        setEndDateObj(newEnd)
        setEndHour(String(newEnd.getHours()).padStart(2, "0"))
        setEndMin(String(Math.floor(newEnd.getMinutes() / 5) * 5).padStart(2, "0"))
    }

    const handleStartDateSelect = (date: Date | undefined) => {
        if (!date) return
        setStartDateObj(date)
        setCalendarOpenInicio(false)
        const newStart = buildDate(date, startHour, startMin)
        syncEndFromStart(newStart)
    }

    const handleStartHourChange = (h: string) => {
        setStartHour(h)
        const newStart = buildDate(startDateObj, h, startMin)
        syncEndFromStart(newStart)
    }

    const handleStartMinChange = (m: string) => {
        setStartMin(m)
        const newStart = buildDate(startDateObj, startHour, m)
        syncEndFromStart(newStart)
    }

    const setDuration = (minutes: number) => {
        const start = getStartDate()
        const endD = new Date(start.getTime() + minutes * 60000)
        setEndDateObj(endD)
        setEndHour(String(endD.getHours()).padStart(2, "0"))
        setEndMin(String(Math.floor(endD.getMinutes() / 5) * 5).padStart(2, "0"))
    }

    const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
    const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"))

    const buscarCEP = async (cepBusca: string) => {
        const cepLimpo = cepBusca.replace(/\D/g, "")
        if (cepLimpo.length !== 8) return
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
            const data = await res.json()
            if (!data.erro) {
                setLogradouro(data.logradouro || "")
                setBairro(data.bairro || "")
                setCidade(data.localidade || "")
                setUf(data.uf || "")
                setTimeout(() => document.getElementById("endereco-numero")?.focus(), 100)
            }
        } catch (error) {
            console.error("Erro ao buscar CEP", error)
        }
    }

    const usarEnderecoCliente = () => {
        const clienteBase = customers?.find(c => c.id === clienteId)
        if (clienteBase) {
            setCep(clienteBase.zipCode || "")
            setLogradouro(clienteBase.address || "")
            setNumero(clienteBase.number || "")
            setComplemento(clienteBase.complement || "")
            setBairro(clienteBase.neighborhood || "")
            setCidade(clienteBase.city || "")
            setUf(clienteBase.state || "")
            toast.success("Endereço do cliente preenchido!")
        } else {
            toast.error("Selecione um cliente e certifique-se que ele tem endereço cadastrado.")
        }
    }

    const handleSave = () => {
        const startDate = getStartDate()
        const endDate = getEndDate()

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            toast.error("Datas inválidas")
            return
        }

        const locationStr = isLocal ? [
            logradouro ? `Logradouro: ${logradouro}` : "",
            numero ? `Número: ${numero}` : "",
            complemento ? `Complemento: ${complemento}` : "",
            bairro ? `Bairro: ${bairro}` : "",
            cidade ? `Cidade: ${cidade}` : "",
            uf ? `UF: ${uf}` : "",
            cep ? `CEP: ${cep}` : "",
            referencia ? `Ref: ${referencia}` : ""
        ].filter(Boolean).join(" | ") : null

        if (onSave) {
            onSave({
                title: titulo || tipoEvento || "Novo Evento",
                start: startDate,
                end: endDate,
                tipo: tipoEvento,
                cliente: clienteSelecionado,
                clienteEmail: clienteEmail,
                clienteTelefone: clienteTelefone,
                isLocal: isLocal,
                local: isLocal ? (locationStr || endereco) : null,
                productId: enableProduct ? productId : null,
                serviceId: enableService ? serviceId : null,
                quoteId: enableQuote ? quoteId : null,
                customerId: clienteId,
                recurrenceRule: !isEditing && enableRecurrence ? recurrenceRule : null,
                recurrenceCount: !isEditing && enableRecurrence ? recurrenceCount : null,
            })
        }
        onOpenChange(false)
        resetForm()
    }

    const resetForm = () => {
        setTitulo("")
        setTipoEvento("")
        const now = new Date()
        const later = new Date(Date.now() + 3600000)
        setStartDateObj(now)
        setStartHour(String(now.getHours()).padStart(2, "0"))
        setStartMin(String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, "0"))
        setEndDateObj(later)
        setEndHour(String(later.getHours()).padStart(2, "0"))
        setEndMin(String(Math.floor(later.getMinutes() / 5) * 5).padStart(2, "0"))
        setIsLocal(false)
        setEndereco("")
        setCep("")
        setLogradouro("")
        setNumero("")
        setComplemento("")
        setBairro("")
        setCidade("")
        setUf("")
        setReferencia("")
        setClienteSelecionado("")
        setClienteEmail("")
        setClienteTelefone("")
        setClienteId("")

        setEnableProduct(false)
        setEnableService(false)
        setEnableQuote(false)
        setQuoteId("")
        setClienteSearch("")
        setQuickCustomerOpen(false)
        setEnableRecurrence(false)
        setRecurrenceRule("WEEKLY")
        setRecurrenceCount(4)
    }

    const handleQuickCustomerSuccess = (customer: { id: string; name: string; email?: string | null; phone?: string | null }) => {
        setClienteSelecionado(customer.name)
        setClienteEmail(customer.email || "")
        setClienteTelefone(customer.phone || "")
        setClienteId(customer.id)
        setClienteOpen(false)
        setQuickCustomerOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) resetForm();
            onOpenChange(val);
        }}>
            <DialogContent className="sm:max-w-[700px] overflow-hidden p-0 rounded-2xl flex flex-col max-h-[90vh]">
                <div className="bg-gradient-to-r from-primary/10 via-background to-background px-6 py-4 border-b border-border/50 shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-primary" />
                            Novo Agendamento
                        </DialogTitle>
                        <DialogDescription>
                            Crie um novo evento, reunião ou serviço na agenda.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* ── Painel de Status Duplo (exibido apenas em eventos existentes) ── */}
                {(paymentStatus || attendanceStatus) && (
                    <div className="px-4 py-2 bg-muted/30 border-b border-border/40 flex flex-wrap items-center gap-2 shrink-0">
                        {/* Badge financeiro */}
                        {paymentStatus && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-medium">Pagamento:</span>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentStatus === "PAID" ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30" :
                                    paymentStatus === "PENDING" ? "bg-amber-500/15 text-amber-600 border border-amber-500/30" :
                                        paymentStatus === "CANCELLED" ? "bg-red-500/15 text-red-600 border border-red-500/30" :
                                            "bg-muted text-muted-foreground border border-border"
                                    }`}>
                                    {paymentStatus === "PAID" && "💰 Pago"}
                                    {paymentStatus === "PENDING" && "⏳ Pendente"}
                                    {paymentStatus === "PARTIAL" && "🔸 Parcial"}
                                    {paymentStatus === "CANCELLED" && "✗ Cancelado"}
                                </span>
                            </div>
                        )}

                        {/* Badge de atendimento */}
                        {attendanceStatus && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-medium">Atendimento:</span>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${attendanceStatus === "COMPLETED" ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30" :
                                    attendanceStatus === "CONFIRMED" ? "bg-blue-500/15 text-blue-600 border border-blue-500/30" :
                                        attendanceStatus === "SCHEDULED" ? "bg-primary/10 text-primary border border-primary/30" :
                                            attendanceStatus === "CANCELLED" ? "bg-red-500/15 text-red-600 border border-red-500/30" :
                                                attendanceStatus === "NO_SHOW" ? "bg-orange-500/15 text-orange-600 border border-orange-500/30" :
                                                    "bg-muted text-muted-foreground border border-border"
                                    }`}>
                                    {attendanceStatus === "SCHEDULED" && "📅 Agendado"}
                                    {attendanceStatus === "CONFIRMED" && "✓ Confirmado"}
                                    {attendanceStatus === "COMPLETED" && "✅ Concluído"}
                                    {attendanceStatus === "CANCELLED" && "✗ Cancelado"}
                                    {attendanceStatus === "NO_SHOW" && "⚠ Não Realizado"}
                                </span>
                            </div>
                        )}

                        {/* Ações rápidas de atendimento */}
                        {onAttendanceChange && (
                            <div className="ml-auto flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">Atualizar:</span>
                                {attendanceStatus !== "CONFIRMED" && attendanceStatus !== "COMPLETED" && (
                                    <button onClick={() => onAttendanceChange("CONFIRMED")}
                                        className="rounded-lg border border-blue-400/40 bg-blue-500/10 px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-500/20 transition-colors">
                                        Confirmado
                                    </button>
                                )}
                                {attendanceStatus !== "COMPLETED" && (
                                    <button onClick={() => onAttendanceChange("COMPLETED")}
                                        className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-500/20 transition-colors">
                                        Concluído
                                    </button>
                                )}
                                {attendanceStatus !== "NO_SHOW" && attendanceStatus !== "COMPLETED" && (
                                    <button onClick={() => onAttendanceChange("NO_SHOW")}
                                        className="rounded-lg border border-orange-400/40 bg-orange-500/10 px-2 py-1 text-[11px] font-semibold text-orange-600 hover:bg-orange-500/20 transition-colors">
                                        Não Realizado
                                    </button>
                                )}
                                {attendanceStatus !== "CANCELLED" && (
                                    <button onClick={() => onAttendanceChange("CANCELLED")}
                                        className="rounded-lg border border-red-400/40 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-500/20 transition-colors">
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex-1 min-h-0 overflow-y-auto p-6">
                    <div className="grid gap-6">

                        {/* Linha 1: Título e Tipo */}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="titulo">Título Principal (Opcional)</Label>
                                <Input
                                    id="titulo"
                                    placeholder="Ex: Alinhamento de Projeto"
                                    value={titulo}
                                    onChange={(e) => setTitulo(e.target.value)}
                                    className="bg-muted/30"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className="w-full justify-between bg-muted/30 font-normal"
                                        >
                                            {tipoEvento ? tipoEvento : "Selecione ou crie um tipo..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                        <Command>
                                            <CommandInput
                                                placeholder="Buscar ou criar tipo..."
                                                value={tipoSearch}
                                                onValueChange={setTipoSearch}
                                            />
                                            <CommandList>
                                                <CommandEmpty className="p-2">
                                                    {tipoSearch.length > 0 && (
                                                        <Button
                                                            variant="ghost"
                                                            className="w-full justify-start text-sm"
                                                            onClick={() => {
                                                                const newType = tipoSearch.trim()
                                                                setTiposCustomizados(prev => [...prev, newType])
                                                                setTipoEvento(newType)
                                                                setTipoSearch("")
                                                            }}
                                                        >
                                                            <Plus className="mr-2 h-4 w-4" />
                                                            Criar "{tipoSearch}"
                                                        </Button>
                                                    )}
                                                    {tipoSearch.length === 0 && (
                                                        <div className="text-center text-sm text-muted-foreground p-2">
                                                            Nenhum tipo encontrado.
                                                        </div>
                                                    )}
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {tiposCustomizados.map((tipo) => (
                                                        <CommandItem
                                                            key={tipo}
                                                            value={tipo}
                                                            onSelect={() => {
                                                                setTipoEvento(tipo)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    tipoEvento === tipo ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {tipo}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Linha 2: Datas — [Data] [Hora] [Minutos] */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Início</Label>
                                <div className="flex gap-1.5">
                                    <Popover open={calendarOpenInicio} onOpenChange={setCalendarOpenInicio}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="flex-1 justify-start gap-2 bg-muted/30 font-normal text-sm h-10">
                                                <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                {format(startDateObj, "dd/MM/yyyy")}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                defaultMonth={startDateObj}
                                                selected={startDateObj}
                                                onSelect={handleStartDateSelect}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <Select value={startHour} onValueChange={handleStartHourChange}>
                                        <SelectTrigger className="w-[80px] bg-muted/30 font-mono text-sm h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {HOURS.map(h => <SelectItem key={h} value={h}>{h}h</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <span className="flex items-center text-muted-foreground font-bold">:</span>
                                    <Select value={startMin} onValueChange={handleStartMinChange}>
                                        <SelectTrigger className="w-[80px] bg-muted/30 font-mono text-sm h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {MINUTES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Término</Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                                <Clock className="h-3.5 w-3.5" /> Duração
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            {[
                                                { label: "15 minutos", min: 15 },
                                                { label: "30 minutos", min: 30 },
                                                { label: "45 minutos", min: 45 },
                                                { label: "1 hora", min: 60 },
                                                { label: "1.5 horas", min: 90 },
                                                { label: "2 horas", min: 120 },
                                                { label: "4 horas", min: 240 },
                                                { label: "Dia Todo (8h)", min: 480 },
                                            ].map(opt => (
                                                <DropdownMenuItem key={opt.min} onClick={() => setDuration(opt.min)}>
                                                    {opt.label}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="flex gap-1.5">
                                    <Popover open={calendarOpenFim} onOpenChange={setCalendarOpenFim}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="flex-1 justify-start gap-2 bg-muted/30 font-normal text-sm h-10">
                                                <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                {format(endDateObj, "dd/MM/yyyy")}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                defaultMonth={endDateObj}
                                                selected={endDateObj}
                                                onSelect={(d) => { if (d) { setEndDateObj(d); setCalendarOpenFim(false) } }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <Select value={endHour} onValueChange={setEndHour}>
                                        <SelectTrigger className="w-[80px] bg-muted/30 font-mono text-sm h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {HOURS.map(h => <SelectItem key={h} value={h}>{h}h</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <span className="flex items-center text-muted-foreground font-bold">:</span>
                                    <Select value={endMin} onValueChange={setEndMin}>
                                        <SelectTrigger className="w-[80px] bg-muted/30 font-mono text-sm h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {MINUTES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Seção: Cliente / Contato */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2 font-semibold">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    Cliente / Contato Relacionado
                                </Label>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-primary"
                                    onClick={() => setQuickCustomerOpen(true)}
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Novo Cliente
                                </Button>
                            </div>
                            <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={clienteOpen}
                                        className="w-full justify-between bg-muted/30 h-11"
                                    >
                                        {clienteSelecionado
                                            ? clienteSelecionado
                                            : "Selecione o cliente envolvido (opcional)..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                    <Command>
                                        <CommandInput
                                            placeholder="Buscar cliente..."
                                            value={clienteSearch}
                                            onValueChange={setClienteSearch}
                                        />
                                        <CommandList>
                                            <CommandEmpty className="p-0">
                                                {clienteSearch.length > 0 && (
                                                    <div className="p-2 border-t border-border">
                                                        <Button
                                                            variant="ghost"
                                                            className="w-full justify-start text-primary font-medium h-9"
                                                            onClick={() => setQuickCustomerOpen(true)}
                                                        >
                                                            <UserPlus className="h-4 w-4 mr-2" />
                                                            Criar "{clienteSearch}" como novo cliente
                                                        </Button>
                                                    </div>
                                                )}
                                                {clienteSearch.length === 0 && (
                                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                                        Nenhum cliente selecionado.
                                                    </div>
                                                )}
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {customers.map((c) => (
                                                    <CommandItem
                                                        key={c.id}
                                                        value={c.name}
                                                        onSelect={(currentValue) => {
                                                            setClienteSelecionado(currentValue === clienteSelecionado ? "" : currentValue)
                                                            setClienteEmail(c.email || "")
                                                            setClienteTelefone(c.phone || "")
                                                            setClienteId(c.id)
                                                            setClienteOpen(false)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                clienteSelecionado === c.name ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span>{c.name}</span>
                                                            {c.phone && <span className="text-[10px] text-muted-foreground">{c.phone}</span>}
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>

                            {/* Campos Adicionais de Contato (opcionais p/ novo cliente) */}
                            {clienteSelecionado && (
                                <div className="grid grid-cols-2 gap-4 mt-3 animate-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">E-mail (Opcional)</Label>
                                        <Input
                                            placeholder="email@exemplo.com"
                                            type="email"
                                            value={clienteEmail}
                                            onChange={e => setClienteEmail(e.target.value)}
                                            className="h-9 bg-background focus:bg-background"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">WhatsApp / Telefone (Opcional)</Label>
                                        <Input
                                            placeholder="(11) 99999-9999"
                                            value={clienteTelefone}
                                            onChange={e => setClienteTelefone(e.target.value)}
                                            className="h-9 bg-background focus:bg-background"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Seção: Local / Serviço Externo */}
                        <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-4 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/40"></div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <Label htmlFor="local-switch" className="text-base font-semibold cursor-pointer">Serviço Externo</Label>
                                </div>
                                <Switch
                                    id="local-switch"
                                    checked={isLocal}
                                    onCheckedChange={setIsLocal}
                                />
                            </div>

                            {isLocal && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                                    {clienteId && (
                                        <div className="flex justify-end pt-2">
                                            <Button variant="outline" size="sm" onClick={usarEnderecoCliente} type="button" className="text-xs h-8">
                                                <MapPin className="h-3 w-3 mr-1.5" />
                                                Puxar endereço do cliente selecionado
                                            </Button>
                                        </div>
                                    )}

                                    {/* Linha 1: CEP e Logradouro */}
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex flex-col justify-end space-y-2 sm:w-1/3">
                                            <Label>CEP</Label>
                                            <Input
                                                placeholder="00000-000"
                                                value={cep}
                                                maxLength={9}
                                                onChange={(e) => {
                                                    let val = e.target.value.replace(/\D/g, "")
                                                    if (val.length > 5) {
                                                        val = val.replace(/^(\d{5})(\d)/, "$1-$2")
                                                    }
                                                    setCep(val)
                                                    if (val.replace(/\D/g, "").length === 8) {
                                                        buscarCEP(val)
                                                    }
                                                }}
                                                className="bg-background"
                                            />
                                        </div>
                                        <div className="flex flex-col justify-end space-y-2 sm:w-2/3">
                                            <Label>Logradouro</Label>
                                            <Input
                                                placeholder="Av. Exemplo"
                                                value={logradouro}
                                                onChange={(e) => setLogradouro(e.target.value)}
                                                className="bg-background"
                                            />
                                        </div>
                                    </div>

                                    {/* Linha 2: Número, Complemento e Bairro */}
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex flex-col justify-end space-y-2 sm:w-1/4">
                                            <Label>Número</Label>
                                            <Input
                                                id="endereco-numero"
                                                placeholder="123"
                                                value={numero}
                                                onChange={(e) => setNumero(e.target.value)}
                                                className="bg-background"
                                            />
                                        </div>
                                        <div className="flex flex-col justify-end space-y-2 sm:w-1/4">
                                            <Label>Complemento</Label>
                                            <Input
                                                placeholder="Apto 45"
                                                value={complemento}
                                                onChange={(e) => setComplemento(e.target.value)}
                                                className="bg-background"
                                            />
                                        </div>
                                        <div className="flex flex-col justify-end space-y-2 sm:w-2/4">
                                            <Label>Bairro</Label>
                                            <Input
                                                placeholder="Centro"
                                                value={bairro}
                                                onChange={(e) => setBairro(e.target.value)}
                                                className="bg-background"
                                            />
                                        </div>
                                    </div>

                                    {/* Linha 3: Cidade e UF */}
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex flex-col justify-end space-y-2 sm:w-3/4">
                                            <Label>Cidade</Label>
                                            <Input
                                                placeholder="São Paulo"
                                                value={cidade}
                                                onChange={(e) => setCidade(e.target.value)}
                                                className="bg-background"
                                            />
                                        </div>
                                        <div className="flex flex-col justify-end space-y-2 sm:w-1/4">
                                            <Label>UF</Label>
                                            <Input
                                                placeholder="SP"
                                                maxLength={2}
                                                value={uf}
                                                onChange={(e) => setUf(e.target.value.toUpperCase())}
                                                className="bg-background"
                                            />
                                        </div>
                                    </div>

                                    {/* Linha 4: Referência */}
                                    <div className="flex flex-col justify-end space-y-2 w-full">
                                        <Label>Ponto de Referência <span className="text-muted-foreground font-normal">(Opcional)</span></Label>
                                        <Input
                                            placeholder="Próximo ao supermercado X"
                                            value={referencia}
                                            onChange={(e) => setReferencia(e.target.value)}
                                            className="bg-background"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Seção: Associação Produto/Serviço/Orçamento */}
                        <div className="rounded-xl border border-border/50 bg-muted/5 space-y-4 p-4">
                            <Label className="font-semibold block mb-2 text-muted-foreground flex items-center gap-2">
                                <LinkIcon className="h-4 w-4" />
                                Vincular a...
                            </Label>

                            <div className="flex flex-wrap gap-2">
                                <Badge
                                    variant={enableProduct ? "default" : "outline"}
                                    className="cursor-pointer py-1.5 px-3 gap-1.5"
                                    onClick={() => setEnableProduct(!enableProduct)}
                                >
                                    <Package className="h-3.5 w-3.5" /> Produto
                                </Badge>
                                <Badge
                                    variant={enableService ? "default" : "outline"}
                                    className="cursor-pointer py-1.5 px-3 gap-1.5"
                                    onClick={() => setEnableService(!enableService)}
                                >
                                    <Wrench className="h-3.5 w-3.5" /> Serviço
                                </Badge>
                                <Badge
                                    variant={enableQuote ? "default" : "outline"}
                                    className="cursor-pointer py-1.5 px-3 gap-1.5"
                                    onClick={() => setEnableQuote(!enableQuote)}
                                >
                                    <FileText className="h-3.5 w-3.5" /> Orçamento
                                </Badge>
                            </div>

                            <div className="space-y-4 pt-2">
                                {enableProduct && (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                        <Label className="mb-2 block text-sm">Selecione o Produto</Label>
                                        <Select value={productId} onValueChange={setProductId}>
                                            <SelectTrigger className="bg-background h-11">
                                                <SelectValue placeholder="Buscar produto..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products.length === 0 ? (
                                                    <SelectItem value="none" disabled>Nenhum produto cadastrado</SelectItem>
                                                ) : (
                                                    products.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {enableService && (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                        <Label className="mb-2 block text-sm">Selecione o Serviço</Label>
                                        <Select value={serviceId} onValueChange={setServiceId}>
                                            <SelectTrigger className="bg-background h-11">
                                                <SelectValue placeholder="Buscar serviço..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {services.length === 0 ? (
                                                    <SelectItem value="none" disabled>Nenhum serviço cadastrado</SelectItem>
                                                ) : (
                                                    services.map(s => (
                                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {enableQuote && (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <Label className="text-sm">Vincular a um Orçamento Existente:</Label>
                                        </div>
                                        <Popover open={quoteOpen} onOpenChange={setQuoteOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={quoteOpen}
                                                    className="w-full justify-between bg-background h-11 font-normal"
                                                >
                                                    {quoteId
                                                        ? (() => {
                                                            const selected = quotes.find(q => q.id === quoteId)
                                                            return selected
                                                                ? `#${String(selected.number).padStart(4, "0")} - ${selected.clientName}`
                                                                : "Orçamento selecionado..."
                                                        })()
                                                        : "Buscar orçamento (Nome ou Número)..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Digite número ou cliente..." />
                                                    <CommandEmpty>Nenhum orçamento encontrado.</CommandEmpty>
                                                    <CommandList>
                                                        <CommandGroup>
                                                            {quotes.map((q) => {
                                                                const label = `#${String(q.number).padStart(4, "0")} - ${q.clientName}`
                                                                return (
                                                                    <CommandItem
                                                                        key={q.id}
                                                                        value={label} // Command is matched against this value
                                                                        onSelect={() => {
                                                                            setQuoteId(q.id === quoteId ? "" : q.id)
                                                                            setQuoteOpen(false)
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                quoteId === q.id ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {label}
                                                                    </CommandItem>
                                                                )
                                                            })}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Recorrência (apenas para novos eventos) ── */}
                        {!isEditing && (
                            <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-4 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/40"></div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Repeat className="h-4 w-4 text-muted-foreground" />
                                        <Label htmlFor="recurrence-switch" className="text-base font-semibold cursor-pointer">Repetir este evento</Label>
                                    </div>
                                    <Switch
                                        id="recurrence-switch"
                                        checked={enableRecurrence}
                                        onCheckedChange={setEnableRecurrence}
                                    />
                                </div>

                                {enableRecurrence && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm">Frequência</Label>
                                            <Select value={recurrenceRule} onValueChange={setRecurrenceRule}>
                                                <SelectTrigger className="bg-background h-10">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="WEEKLY">Semanal</SelectItem>
                                                    <SelectItem value="BIWEEKLY">Quinzenal</SelectItem>
                                                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm">Por quantas vezes?</Label>
                                            <Input
                                                type="number"
                                                min={2}
                                                max={52}
                                                value={recurrenceCount}
                                                onChange={e => setRecurrenceCount(Math.max(2, Math.min(52, parseInt(e.target.value) || 2)))}
                                                className="bg-background h-10 font-mono"
                                            />
                                        </div>
                                        <p className="col-span-2 text-xs text-muted-foreground">
                                            Serão criados <strong>{recurrenceCount}</strong> eventos (
                                            {recurrenceRule === "WEEKLY" ? `toda semana por ${recurrenceCount} semanas` :
                                                recurrenceRule === "BIWEEKLY" ? `a cada 15 dias por ${recurrenceCount} ocorrências` :
                                                    `todo mês por ${recurrenceCount} meses`}
                                            ), cada um com sua própria transação financeira.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>

                <QuickCustomerDialog
                    open={quickCustomerOpen}
                    onOpenChange={setQuickCustomerOpen}
                    onSuccess={handleQuickCustomerSuccess}
                    initialName={clienteSearch}
                />

                <DialogFooter className="p-4 border-t border-border/50 bg-muted/10 flex justify-between items-center sm:justify-between w-full shrink-0">
                    <div className="flex-1">
                        {onDelete && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir este agendamento?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta ação não pode ser desfeita. Isso removerá o agendamento da sua agenda permanentemente.
                                            Se houver uma transação pendente atrelada auto-gerada, ela também será removida.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={onDelete}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            Excluir
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button className="gradient-primary shadow-md shadow-primary/20" onClick={handleSave}>
                            Confirmar Agendamento
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}
