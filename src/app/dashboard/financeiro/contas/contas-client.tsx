"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
    createContaFinanceira, updateContaFinanceira, deleteContaFinanceira,
    toggleContaFinanceira,
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
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
    Plus, Pencil, Trash2, Landmark, Wallet, Smartphone, Star,
    CreditCard, ArrowDownLeft,
    ArrowUpRight, Receipt,
} from "lucide-react"


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
                toast.error("Informe a melhor data de compra e o dia de vencimento da fatura")
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

    // ── Extrato / Fatura (navega para página inteira) ──
    const openExtrato = (conta: ContaFinanceira) => {
        router.push(`/dashboard/financeiro/contas/${conta.id}/extrato`)
    }

    const openInvoice = (conta: ContaFinanceira) => {
        router.push(`/dashboard/financeiro/contas/${conta.id}/fatura`)
    }

    // ── RENDER CARD ──
    const renderContaCard = (conta: ContaFinanceira) => {
        const isCartao = conta.subType === "CARTAO_CREDITO"
        const Icon = isCartao ? CreditCard : (TYPE_ICONS[conta.type] || Wallet)

        return (
            <div
                key={conta.id}
                className={`rounded-xl border bg-card p-4 hover:shadow-md transition-all cursor-pointer ${!conta.active ? "opacity-50" : ""}`}
                onClick={() => isCartao ? openInvoice(conta) : openExtrato(conta)}
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
                                            Compra até dia {conta.closingDay} · Vence dia {conta.dueDay}
                                        </Badge>
                                    </>
                                ) : (
                                    <Badge variant="secondary" className="text-[10px]">{TYPE_LABELS[conta.type] || conta.type}</Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Switch checked={conta.active} onCheckedChange={() => handleToggle(conta.id)} className="scale-75" />
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

                    {/* ── Caixa Geral — Saldo Total ── */}
                    {(() => {
                        const caixaGeral = contasRecebimento.find(c => c.isDefault && c.type === "CAIXA")
                        return (
                            <div
                                className="rounded-xl border bg-card p-5 cursor-pointer hover:shadow-md transition-all"
                                onClick={() => {
                                    if (caixaGeral) openExtrato(caixaGeral)
                                }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                        <Wallet className="h-6 w-6 text-emerald-500" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">Caixa Geral — Saldo Total de Recebimento</p>
                                        <p className="text-2xl font-bold text-emerald-600">
                                            {formatBRL(contasRecebimento.reduce((sum, c) => sum + c.balance, 0))}
                                        </p>
                                    </div>
                                    {caixaGeral && (
                                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                            <Switch checked={caixaGeral.active} onCheckedChange={() => handleToggle(caixaGeral.id)} className="scale-75" />
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(caixaGeral)}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                    <span className="text-sm text-muted-foreground">{contasRecebimento.length} conta{contasRecebimento.length !== 1 ? "s" : ""}</span>
                                </div>
                            </div>
                        )
                    })()}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {contasRecebimento.filter(c => !(c.isDefault && c.type === "CAIXA")).map(renderContaCard)}
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
                                        <Label>Melhor Data de Compra</Label>
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


        </div>
    )
}
