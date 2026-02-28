"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
    createContaFinanceira, updateContaFinanceira, deleteContaFinanceira,
    toggleContaFinanceira, getContaExtrato, getCreditCardInvoice,
} from "@/app/actions/conta-financeira"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import CurrencyInput from "react-currency-input-field"
import { toast } from "sonner"
import {
    Plus, Pencil, Trash2, Landmark, Wallet, Smartphone, Star,
    CreditCard, Power, PowerOff, Eye, ArrowLeft, ArrowDownLeft,
    ArrowUpRight, ChevronLeft, ChevronRight, Receipt,
} from "lucide-react"
import {
    startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    addMonths, subMonths, format, isToday,
} from "date-fns"
import { ptBR } from "date-fns/locale"

// ── Types ────────────────────────────────────────────────────────────

interface ContaFinanceira {
    id: string
    name: string
    type: string
    purpose: string
    subType: string | null
    balance: number
    active: boolean
    isDefault: boolean
    closingDay: number | null
    dueDay: number | null
    cardBrand: string | null
    creditLimit: number | null
}

type ViewMode = "day" | "week" | "month" | "3months" | "6months" | "all"

interface ExtractTx {
    id: string
    description: string
    amount: number
    type: string
    status: string
    date: string
    categoryName: string | null
    customerName: string | null
    supplierName: string | null
}

interface InvoiceData {
    month: number
    year: number
    periodStart: string
    periodEnd: string
    dueDate: string
    total: number
    itemCount: number
    status: string
    items: ExtractTx[]
}

// ── Helpers ──────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, any> = {
    CAIXA: Wallet,
    BANCO: Landmark,
    CARTEIRA_DIGITAL: Smartphone,
}

const TYPE_LABELS: Record<string, string> = {
    CAIXA: "Caixa",
    BANCO: "Banco",
    CARTEIRA_DIGITAL: "Carteira Digital",
}

function formatBRL(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
    { value: "day", label: "Hoje" },
    { value: "week", label: "Semana" },
    { value: "month", label: "Mês" },
    { value: "3months", label: "3 Meses" },
    { value: "6months", label: "6 Meses" },
    { value: "all", label: "Tudo" },
]

function getDateRange(mode: ViewMode, ref: Date): { start?: Date; end?: Date } {
    const now = ref
    switch (mode) {
        case "day":
            return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0), end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59) }
        case "week":
            return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) }
        case "month":
            return { start: startOfMonth(now), end: endOfMonth(now) }
        case "3months":
            return { start: addMonths(startOfMonth(now), -2), end: endOfMonth(now) }
        case "6months":
            return { start: addMonths(startOfMonth(now), -5), end: endOfMonth(now) }
        default:
            return {}
    }
}

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

// ── Component ────────────────────────────────────────────────────────

export function ContasBancariasClient({ contas }: { contas: ContaFinanceira[] }) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState("recebimento")

    // ── Form state ──
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [formPurpose, setFormPurpose] = useState<"RECEBIMENTO" | "PAGAMENTO">("RECEBIMENTO")
    const [formName, setFormName] = useState("")
    const [formType, setFormType] = useState("CAIXA")
    const [formSubType, setFormSubType] = useState<string>("CONTA_BANCARIA")
    const [formIsDefault, setFormIsDefault] = useState(false)
    const [formBalance, setFormBalance] = useState("")
    const [formClosingDay, setFormClosingDay] = useState("")
    const [formDueDay, setFormDueDay] = useState("")
    const [formCardBrand, setFormCardBrand] = useState("")
    const [formCreditLimit, setFormCreditLimit] = useState("")
    const [loading, setLoading] = useState(false)

    // ── Detail state ──
    const [detailConta, setDetailConta] = useState<ContaFinanceira | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)
    const [detailViewMode, setDetailViewMode] = useState<ViewMode>("month")
    const [detailTransactions, setDetailTransactions] = useState<ExtractTx[]>([])
    const [detailLoading, setDetailLoading] = useState(false)

    // ── Invoice state ──
    const [invoiceConta, setInvoiceConta] = useState<ContaFinanceira | null>(null)
    const [invoiceOpen, setInvoiceOpen] = useState(false)
    const [invoiceMonth, setInvoiceMonth] = useState(new Date().getMonth())
    const [invoiceYear, setInvoiceYear] = useState(new Date().getFullYear())
    const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
    const [invoiceLoading, setInvoiceLoading] = useState(false)

    // ── Filtered lists ──
    const contasRecebimento = useMemo(() => contas.filter(c => c.purpose === "RECEBIMENTO"), [contas])
    const contasPagBanco = useMemo(() => contas.filter(c => c.purpose === "PAGAMENTO" && c.subType !== "CARTAO_CREDITO"), [contas])
    const contasPagCartao = useMemo(() => contas.filter(c => c.purpose === "PAGAMENTO" && c.subType === "CARTAO_CREDITO"), [contas])

    // ── Form actions ──
    const resetForm = () => {
        setFormName(""); setFormType("CAIXA"); setFormSubType("CONTA_BANCARIA")
        setFormIsDefault(false); setFormBalance(""); setFormClosingDay("")
        setFormDueDay(""); setFormCardBrand(""); setFormCreditLimit("")
        setEditId(null); setShowForm(false)
    }

    const openNewForm = (purpose: "RECEBIMENTO" | "PAGAMENTO") => {
        resetForm()
        setFormPurpose(purpose)
        setShowForm(true)
    }

    const openEditForm = (conta: ContaFinanceira) => {
        setEditId(conta.id)
        setFormPurpose(conta.purpose as any)
        setFormName(conta.name)
        setFormType(conta.type)
        setFormSubType(conta.subType || "CONTA_BANCARIA")
        setFormIsDefault(conta.isDefault)
        setFormBalance(String(conta.balance || ""))
        setFormClosingDay(conta.closingDay ? String(conta.closingDay) : "")
        setFormDueDay(conta.dueDay ? String(conta.dueDay) : "")
        setFormCardBrand(conta.cardBrand || "")
        setFormCreditLimit(conta.creditLimit ? String(conta.creditLimit) : "")
        setShowForm(true)
    }

    const handleSubmit = async () => {
        if (!formName.trim()) { toast.error("Nome é obrigatório"); return }
        if (formPurpose === "PAGAMENTO" && formSubType === "CARTAO_CREDITO") {
            if (!formClosingDay || !formDueDay) {
                toast.error("Informe o dia de fechamento e vencimento da fatura")
                return
            }
        }

        setLoading(true)
        try {
            const data = {
                name: formName,
                type: formSubType === "CARTAO_CREDITO" ? "CARTAO_CREDITO" : formType,
                purpose: formPurpose,
                subType: formPurpose === "PAGAMENTO" ? formSubType : null,
                isDefault: formIsDefault,
                balance: parseFloat(formBalance.replace(/\./g, "").replace(",", ".") || "0") || 0,
                closingDay: formClosingDay ? parseInt(formClosingDay) : null,
                dueDay: formDueDay ? parseInt(formDueDay) : null,
                cardBrand: formCardBrand || null,
                creditLimit: formCreditLimit ? parseFloat(formCreditLimit.replace(/\./g, "").replace(",", ".") || "0") : null,
            }

            if (editId) {
                const result = await updateContaFinanceira(editId, data)
                if (result.error) toast.error(result.error)
                else toast.success("Conta atualizada!")
            } else {
                const result = await createContaFinanceira(data)
                if (result.error) toast.error(result.error)
                else toast.success("Conta criada!")
            }
            resetForm()
            router.refresh()
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir esta conta?")) return
        const result = await deleteContaFinanceira(id)
        if (result.error) toast.error(result.error)
        else { toast.success("Conta excluída!"); router.refresh() }
    }

    const handleToggle = async (id: string) => {
        const result = await toggleContaFinanceira(id)
        if (result.error) toast.error(result.error)
        else { toast.success(result.active ? "Conta habilitada!" : "Conta desabilitada!"); router.refresh() }
    }

    // ── Extrato ──
    const openExtrato = async (conta: ContaFinanceira) => {
        setDetailConta(conta)
        setDetailOpen(true)
        setDetailViewMode("month")
        await fetchExtrato(conta.id, "month")
    }

    const fetchExtrato = async (contaId: string, mode: ViewMode) => {
        setDetailLoading(true)
        try {
            const { start, end } = getDateRange(mode, new Date())
            const result = await getContaExtrato(contaId, start, end)
            setDetailTransactions(result.transactions || [])
        } finally {
            setDetailLoading(false)
        }
    }

    const handleDetailViewChange = async (mode: ViewMode) => {
        setDetailViewMode(mode)
        if (detailConta) await fetchExtrato(detailConta.id, mode)
    }

    // ── Fatura do Cartão ──
    const openInvoice = async (conta: ContaFinanceira) => {
        setInvoiceConta(conta)
        setInvoiceOpen(true)
        const now = new Date()
        setInvoiceMonth(now.getMonth())
        setInvoiceYear(now.getFullYear())
        await fetchInvoice(conta.id, now.getMonth(), now.getFullYear())
    }

    const fetchInvoice = async (contaId: string, month: number, year: number) => {
        setInvoiceLoading(true)
        try {
            const result = await getCreditCardInvoice(contaId, month, year)
            if (result.error) { toast.error(result.error); return }
            setInvoiceData((result as any).invoice || null)
        } finally {
            setInvoiceLoading(false)
        }
    }

    const navigateInvoice = async (dir: number) => {
        if (!invoiceConta) return
        let m = invoiceMonth + dir
        let y = invoiceYear
        if (m < 0) { m = 11; y-- }
        if (m > 11) { m = 0; y++ }
        setInvoiceMonth(m)
        setInvoiceYear(y)
        await fetchInvoice(invoiceConta.id, m, y)
    }

    // ── RENDER CARD ──
    const renderContaCard = (conta: ContaFinanceira) => {
        const isCartao = conta.subType === "CARTAO_CREDITO"
        const Icon = isCartao ? CreditCard : (TYPE_ICONS[conta.type] || Wallet)

        return (
            <div
                key={conta.id}
                className={`rounded-xl border bg-card p-4 hover:shadow-md transition-all ${!conta.active ? "opacity-50" : ""}`}
            >
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isCartao ? "bg-violet-500/10" : "bg-primary/10"}`}>
                            <Icon className={`h-5 w-5 ${isCartao ? "text-violet-500" : "text-primary"}`} />
                        </div>
                        <div>
                            <div className="font-medium flex items-center gap-2">
                                {conta.name}
                                {conta.isDefault && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />}
                                {!conta.active && <Badge variant="secondary" className="text-[10px]">Desabilitada</Badge>}
                            </div>
                            <div className="flex gap-1.5 mt-0.5">
                                {isCartao ? (
                                    <>
                                        {conta.cardBrand && <Badge variant="outline" className="text-[10px]">{conta.cardBrand}</Badge>}
                                        <Badge variant="secondary" className="text-[10px]">
                                            Fecha dia {conta.closingDay} · Vence dia {conta.dueDay}
                                        </Badge>
                                    </>
                                ) : (
                                    <Badge variant="secondary" className="text-[10px]">{TYPE_LABELS[conta.type] || conta.type}</Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Visualizar" onClick={() => isCartao ? openInvoice(conta) : openExtrato(conta)}>
                            <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title={conta.active ? "Desabilitar" : "Habilitar"} onClick={() => handleToggle(conta.id)}>
                            {conta.active ? <PowerOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Power className="h-3.5 w-3.5 text-emerald-500" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(conta)}>
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!conta.isDefault && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(conta.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </div>

                {isCartao ? (
                    <div className="mt-2 space-y-1">
                        {conta.creditLimit != null && (
                            <>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Limite</span>
                                    <span className="font-medium">{formatBRL(conta.creditLimit)}</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-violet-500 rounded-full transition-all"
                                        style={{ width: `${Math.min(100, conta.creditLimit > 0 ? (Math.abs(conta.balance) / conta.creditLimit) * 100 : 0)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                    <span>Usado: {formatBRL(Math.abs(conta.balance))}</span>
                                    <span>Disponível: {formatBRL(Math.max(0, conta.creditLimit - Math.abs(conta.balance)))}</span>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="mt-2">
                        <p className="text-xs text-muted-foreground">Saldo</p>
                        <p className={`text-xl font-bold ${conta.balance >= 0 ? "" : "text-destructive"}`}>
                            {formatBRL(conta.balance)}
                        </p>
                    </div>
                )}
            </div>
        )
    }

    // ── INLINE FORM (Dialog) ──
    const isCartaoForm = formPurpose === "PAGAMENTO" && formSubType === "CARTAO_CREDITO"

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="rounded-xl">
                    <TabsTrigger value="recebimento" className="rounded-lg gap-1.5">
                        <ArrowDownLeft className="h-4 w-4" /> Contas de Recebimento
                    </TabsTrigger>
                    <TabsTrigger value="pagamento" className="rounded-lg gap-1.5">
                        <ArrowUpRight className="h-4 w-4" /> Contas de Pagamento
                    </TabsTrigger>
                </TabsList>

                {/* ═══ RECEBIMENTO ═══ */}
                <TabsContent value="recebimento" className="space-y-4 mt-4">
                    <div className="flex justify-end">
                        <Button onClick={() => openNewForm("RECEBIMENTO")} className="gap-2 rounded-xl">
                            <Plus className="h-4 w-4" /> Nova Conta de Recebimento
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {contasRecebimento.map(renderContaCard)}
                    </div>

                    {contasRecebimento.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <Landmark className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">Nenhuma conta de recebimento</p>
                            <p className="text-sm">Cadastre contas onde sua empresa recebe pagamentos das vendas.</p>
                        </div>
                    )}
                </TabsContent>

                {/* ═══ PAGAMENTO ═══ */}
                <TabsContent value="pagamento" className="space-y-6 mt-4">
                    <div className="flex justify-end">
                        <Button onClick={() => openNewForm("PAGAMENTO")} className="gap-2 rounded-xl">
                            <Plus className="h-4 w-4" /> Nova Conta de Pagamento
                        </Button>
                    </div>

                    {/* Contas bancárias */}
                    {contasPagBanco.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Landmark className="h-4 w-4" /> Contas Bancárias
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {contasPagBanco.map(renderContaCard)}
                            </div>
                        </div>
                    )}

                    {/* Cartões de crédito */}
                    {contasPagCartao.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <CreditCard className="h-4 w-4" /> Cartões de Crédito
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {contasPagCartao.map(renderContaCard)}
                            </div>
                        </div>
                    )}

                    {contasPagBanco.length === 0 && contasPagCartao.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">Nenhuma conta de pagamento</p>
                            <p className="text-sm">Cadastre contas bancárias ou cartões de crédito para pagar suas despesas.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* ═══━━━ FORM DIALOG ━━━═══ */}
            <Dialog open={showForm} onOpenChange={(v) => { if (!v) resetForm() }}>
                <DialogContent className="sm:!max-w-lg rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editId ? "Editar Conta" : formPurpose === "RECEBIMENTO" ? "Nova Conta de Recebimento" : "Nova Conta de Pagamento"}
                        </DialogTitle>
                        <DialogDescription>
                            {formPurpose === "RECEBIMENTO"
                                ? "Conta onde sua empresa recebe pagamentos das vendas."
                                : "Conta para pagamento de despesas e contas a pagar."
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        {/* Tipo de pagamento (só para PAGAMENTO) */}
                        {formPurpose === "PAGAMENTO" && (
                            <div className="space-y-1.5">
                                <Label>Tipo</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormSubType("CONTA_BANCARIA")}
                                        className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${formSubType === "CONTA_BANCARIA"
                                            ? "border-primary bg-primary/5"
                                            : "border-muted hover:border-primary/30"}`}
                                    >
                                        <Landmark className="h-6 w-6 text-primary" />
                                        <span className="text-sm font-medium">Conta Bancária</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormSubType("CARTAO_CREDITO")}
                                        className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${formSubType === "CARTAO_CREDITO"
                                            ? "border-violet-500 bg-violet-500/5"
                                            : "border-muted hover:border-violet-500/30"}`}
                                    >
                                        <CreditCard className="h-6 w-6 text-violet-500" />
                                        <span className="text-sm font-medium">Cartão de Crédito</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Nome */}
                        <div className="space-y-1.5">
                            <Label>{isCartaoForm ? "Nome do Cartão" : "Nome da Conta"}</Label>
                            <Input
                                placeholder={isCartaoForm ? "Ex: Nubank, Itaú Platinum" : "Ex: Banco Itaú, Caixa Loja"}
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>

                        {/* Tipo de conta (só recebimento e conta bancária de pagamento) */}
                        {!isCartaoForm && (
                            <div className="space-y-1.5">
                                <Label>Tipo da Conta</Label>
                                <Select value={formType} onValueChange={setFormType}>
                                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CAIXA">Caixa</SelectItem>
                                        <SelectItem value="BANCO">Banco</SelectItem>
                                        <SelectItem value="CARTEIRA_DIGITAL">Carteira Digital</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Saldo (só contas bancárias) */}
                        {!isCartaoForm && (
                            <div className="space-y-1.5">
                                <Label>Saldo Atual</Label>
                                <CurrencyInput
                                    placeholder="R$ 0,00"
                                    decimalsLimit={2}
                                    prefix="R$ "
                                    value={formBalance}
                                    onValueChange={v => setFormBalance(v || "")}
                                    className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                        )}

                        {/* Campos de cartão de crédito */}
                        {isCartaoForm && (
                            <>
                                <div className="space-y-1.5">
                                    <Label>Bandeira</Label>
                                    <Select value={formCardBrand} onValueChange={setFormCardBrand}>
                                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Visa">Visa</SelectItem>
                                            <SelectItem value="Mastercard">Mastercard</SelectItem>
                                            <SelectItem value="Elo">Elo</SelectItem>
                                            <SelectItem value="American Express">American Express</SelectItem>
                                            <SelectItem value="Hipercard">Hipercard</SelectItem>
                                            <SelectItem value="Outra">Outra</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label>Dia de Fechamento</Label>
                                        <Input
                                            type="number"
                                            min={1} max={31}
                                            placeholder="25"
                                            value={formClosingDay}
                                            onChange={e => setFormClosingDay(e.target.value)}
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Dia de Vencimento</Label>
                                        <Input
                                            type="number"
                                            min={1} max={31}
                                            placeholder="10"
                                            value={formDueDay}
                                            onChange={e => setFormDueDay(e.target.value)}
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label>Limite de Crédito</Label>
                                    <CurrencyInput
                                        placeholder="R$ 0,00"
                                        decimalsLimit={2}
                                        prefix="R$ "
                                        value={formCreditLimit}
                                        onValueChange={v => setFormCreditLimit(v || "")}
                                        className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>
                            </>
                        )}

                        {/* Conta padrão */}
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={formIsDefault}
                                onChange={e => setFormIsDefault(e.target.checked)}
                                className="rounded"
                            />
                            Conta padrão {formPurpose === "RECEBIMENTO" ? "de recebimento" : "de pagamento"}
                        </label>

                        {/* Ações */}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" className="rounded-xl" onClick={resetForm}>Cancelar</Button>
                            <Button className="rounded-xl" onClick={handleSubmit} disabled={loading}>
                                {loading ? "Salvando..." : editId ? "Salvar" : "Criar"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══━━━ EXTRATO DIALOG ━━━═══ */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="sm:!max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-primary" />
                            Extrato — {detailConta?.name}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Filtro de período */}
                    <div className="flex flex-wrap gap-1.5">
                        {VIEW_OPTIONS.map(opt => (
                            <Button
                                key={opt.value}
                                size="sm"
                                variant={detailViewMode === opt.value ? "default" : "outline"}
                                className="rounded-lg text-xs h-7"
                                onClick={() => handleDetailViewChange(opt.value)}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>

                    {/* Transações */}
                    {detailLoading ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
                    ) : detailTransactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Nenhuma transação neste período</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="text-left p-2 font-medium">Data</th>
                                        <th className="text-left p-2 font-medium">Descrição</th>
                                        <th className="text-left p-2 font-medium">Categoria</th>
                                        <th className="text-right p-2 font-medium">Valor</th>
                                        <th className="text-center p-2 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailTransactions.map(tx => (
                                        <tr key={tx.id} className="border-t">
                                            <td className="p-2 text-xs whitespace-nowrap">
                                                {new Date(tx.date).toLocaleDateString("pt-BR")}
                                            </td>
                                            <td className="p-2">
                                                <div className="font-medium">{tx.description}</div>
                                                {(tx.customerName || tx.supplierName) && (
                                                    <div className="text-xs text-muted-foreground">{tx.customerName || tx.supplierName}</div>
                                                )}
                                            </td>
                                            <td className="p-2 text-xs text-muted-foreground">{tx.categoryName || "—"}</td>
                                            <td className={`p-2 text-right font-medium ${tx.type === "income" ? "text-emerald-600" : "text-destructive"}`}>
                                                {tx.type === "income" ? "+" : "-"}{formatBRL(tx.amount)}
                                            </td>
                                            <td className="p-2 text-center">
                                                <Badge variant={tx.status === "paid" ? "default" : "secondary"} className="text-[10px]">
                                                    {tx.status === "paid" ? "Pago" : "Pendente"}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ═══━━━ FATURA DO CARTÃO ━━━═══ */}
            <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
                <DialogContent className="sm:!max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-violet-500" />
                            Fatura — {invoiceConta?.name}
                            {invoiceConta?.cardBrand && (
                                <Badge variant="outline" className="text-xs">{invoiceConta.cardBrand}</Badge>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Navegação de mês */}
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => navigateInvoice(-1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-semibold">
                            {MONTH_NAMES[invoiceMonth]} {invoiceYear}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => navigateInvoice(1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {invoiceLoading ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">Carregando fatura...</div>
                    ) : !invoiceData ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Nenhum dado disponível</p>
                        </div>
                    ) : (
                        <>
                            {/* Resumo da fatura */}
                            <div className="rounded-xl border p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Vencimento</span>
                                    <span className="font-medium text-sm">
                                        {new Date(invoiceData.dueDate).toLocaleDateString("pt-BR")}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Lançamentos</span>
                                    <span className="font-medium text-sm">{invoiceData.itemCount}</span>
                                </div>
                                <div className="flex items-center justify-between border-t pt-3">
                                    <span className="text-base font-semibold">Total da Fatura</span>
                                    <span className="text-xl font-bold text-violet-600">{formatBRL(invoiceData.total)}</span>
                                </div>
                                <div className="flex justify-end">
                                    <Badge
                                        className={`text-xs ${invoiceData.status === "paid"
                                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                            : invoiceData.status === "empty"
                                                ? "bg-muted text-muted-foreground"
                                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                            }`}
                                        variant="outline"
                                    >
                                        {invoiceData.status === "paid" ? "✓ Paga" : invoiceData.status === "empty" ? "Sem lançamentos" : "Em aberto"}
                                    </Badge>
                                </div>
                            </div>

                            {/* Lançamentos */}
                            {invoiceData.items.length > 0 && (
                                <div className="rounded-xl border overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="text-left p-2 font-medium">Data</th>
                                                <th className="text-left p-2 font-medium">Descrição</th>
                                                <th className="text-right p-2 font-medium">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoiceData.items.map(item => (
                                                <tr key={item.id} className="border-t">
                                                    <td className="p-2 text-xs whitespace-nowrap">
                                                        {new Date(item.date).toLocaleDateString("pt-BR")}
                                                    </td>
                                                    <td className="p-2">
                                                        <div className="font-medium">{item.description}</div>
                                                        {item.supplierName && (
                                                            <div className="text-xs text-muted-foreground">{item.supplierName}</div>
                                                        )}
                                                    </td>
                                                    <td className="p-2 text-right font-medium">
                                                        {formatBRL(item.amount)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
