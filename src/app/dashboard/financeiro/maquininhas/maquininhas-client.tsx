"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createMaquinaCartao, updateMaquinaCartao, deleteMaquinaCartao } from "@/app/actions/maquina-cartao"
import { METODO_LABELS } from "@/lib/payment-constants"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, CreditCard, ChevronDown, ChevronUp, Settings } from "lucide-react"

interface TaxaMaquina {
    id: string
    metodoPagamento: string
    taxa: number | string
}

interface MaquinaCartao {
    id: string
    name: string
    active: boolean
    diasRecebimento: number
    modoRecebimento: string
    taxas: TaxaMaquina[]
}

const METODOS_PADRAO = [
    "DEBITO", "CREDITO_1X", "CREDITO_2X", "CREDITO_3X", "CREDITO_4X",
    "CREDITO_5X", "CREDITO_6X", "CREDITO_7X", "CREDITO_8X", "CREDITO_9X",
    "CREDITO_10X", "CREDITO_11X", "CREDITO_12X", "VOUCHER", "PIX",
]

export function MaquininhasClient({ maquinas }: { maquinas: MaquinaCartao[] }) {
    const router = useRouter()
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [formName, setFormName] = useState("")
    const [formDias, setFormDias] = useState(30)
    const [formModo, setFormModo] = useState("PARCELADO")
    const [formTaxas, setFormTaxas] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(false)

    const initTaxas = (existingTaxas?: TaxaMaquina[]) => {
        const map: Record<string, number> = {}
        METODOS_PADRAO.forEach(m => {
            const found = existingTaxas?.find(t => t.metodoPagamento === m)
            map[m] = found ? Number(found.taxa) * 100 : 0 // Exibir em percentual
        })
        return map
    }

    const handleCreate = () => {
        setShowForm(true)
        setEditId(null)
        setFormName("")
        setFormDias(30)
        setFormModo("PARCELADO")
        setFormTaxas(initTaxas())
    }

    const handleEdit = (maquina: MaquinaCartao) => {
        setShowForm(true)
        setEditId(maquina.id)
        setFormName(maquina.name)
        setFormDias(maquina.diasRecebimento)
        setFormModo(maquina.modoRecebimento || "PARCELADO")
        setFormTaxas(initTaxas(maquina.taxas))
    }

    const handleSubmit = async () => {
        if (!formName.trim()) { toast.error("Nome é obrigatório"); return }
        setLoading(true)
        try {
            const taxasData = Object.entries(formTaxas).map(([m, v]) => ({
                metodoPagamento: m,
                taxa: v / 100, // Converter de percentual para decimal
            }))

            if (editId) {
                const result = await updateMaquinaCartao(editId, {
                    name: formName,
                    diasRecebimento: formDias,
                    modoRecebimento: formModo,
                    taxas: taxasData,
                })
                if (result.error) { toast.error(result.error) } else { toast.success("Maquininha atualizada!") }
            } else {
                const result = await createMaquinaCartao({
                    name: formName,
                    diasRecebimento: formDias,
                    modoRecebimento: formModo,
                    taxas: taxasData,
                })
                if (result.error) { toast.error(result.error) } else { toast.success("Maquininha criada!") }
            }
            setShowForm(false)
            setEditId(null)
            router.refresh()
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir esta maquininha?")) return
        const result = await deleteMaquinaCartao(id)
        if (result.error) { toast.error(result.error) } else { toast.success("Maquininha excluída!"); router.refresh() }
    }

    return (
        <div className="space-y-4">
            {/* Botão Nova */}
            <div className="flex justify-end">
                <Button onClick={handleCreate} className="gap-2">
                    <Plus className="h-4 w-4" /> Nova Maquininha
                </Button>
            </div>

            {/* Formulário */}
            {showForm && (
                <div className="rounded-xl border bg-card p-4 space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        {editId ? "Editar Maquininha" : "Nova Maquininha"}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium">Nome</label>
                            <input
                                placeholder="Ex: Cielo, Stone, PagSeguro"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 text-sm bg-background mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Prazo de Recebimento</label>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm">D+</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={formDias}
                                    onChange={(e) => setFormDias(parseInt(e.target.value) || 0)}
                                    className="w-20 rounded-lg border px-3 py-2 text-sm bg-background"
                                />
                                <span className="text-xs text-muted-foreground">dias</span>
                            </div>
                        </div>
                    </div>

                    {/* Modo de Recebimento */}
                    <div>
                        <label className="text-sm font-medium">Modo de Recebimento (vendas parceladas)</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setFormModo("PARCELADO")}
                                className={`rounded-lg border p-3 text-left transition-colors ${formModo === "PARCELADO"
                                        ? "border-violet-500 bg-violet-500/10 ring-1 ring-violet-500"
                                        : "hover:bg-muted/50"
                                    }`}
                            >
                                <div className="font-medium text-sm">Parcelado</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Recebe cada parcela separadamente no prazo D+{formDias}
                                </p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormModo("ANTECIPADO")}
                                className={`rounded-lg border p-3 text-left transition-colors ${formModo === "ANTECIPADO"
                                        ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                                        : "hover:bg-muted/50"
                                    }`}
                            >
                                <div className="font-medium text-sm">Antecipado</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Recebe o valor total antecipado no prazo D+{formDias}
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Tabela de Taxas */}
                    <div>
                        <label className="text-sm font-medium">Taxas por Método de Pagamento</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mt-2">
                            {METODOS_PADRAO.map((metodo) => (
                                <div key={metodo} className="rounded-lg border p-2">
                                    <label className="text-xs text-muted-foreground">{METODO_LABELS[metodo]}</label>
                                    <div className="flex items-center gap-1 mt-1">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min={0}
                                            max={100}
                                            value={formTaxas[metodo] || 0}
                                            onChange={(e) => setFormTaxas({ ...formTaxas, [metodo]: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded border px-2 py-1 text-sm bg-background"
                                        />
                                        <span className="text-xs">%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handleSubmit} disabled={loading} size="sm">
                            {loading ? "Salvando..." : editId ? "Salvar" : "Criar Maquininha"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}

            {/* Lista de Maquininhas */}
            <div className="space-y-3">
                {maquinas.map((maquina) => (
                    <div key={maquina.id} className="rounded-xl border bg-card overflow-hidden">
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                                    <CreditCard className="h-5 w-5 text-violet-500" />
                                </div>
                                <div>
                                    <div className="font-medium flex items-center gap-2">
                                        {maquina.name}
                                        {!maquina.active && <Badge variant="secondary">Inativa</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        D+{maquina.diasRecebimento} • {maquina.modoRecebimento === "ANTECIPADO" ? "Antecipado" : "Parcelado"} • {maquina.taxas.length} taxas
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost" size="icon" className="h-8 w-8"
                                    onClick={() => setExpandedId(expandedId === maquina.id ? null : maquina.id)}
                                >
                                    {expandedId === maquina.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(maquina)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(maquina.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>

                        {/* Taxas Expandido */}
                        {expandedId === maquina.id && (
                            <div className="border-t px-4 py-3 bg-muted/30">
                                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                    {maquina.taxas.map((taxa) => (
                                        <div key={taxa.id} className="text-center">
                                            <p className="text-xs text-muted-foreground">{METODO_LABELS[taxa.metodoPagamento] || taxa.metodoPagamento}</p>
                                            <p className="font-medium text-sm">{(Number(taxa.taxa) * 100).toFixed(2)}%</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {maquinas.length === 0 && !showForm && (
                <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Nenhuma maquininha cadastrada</p>
                    <p className="text-sm">Adicione suas maquininhas para configurar as taxas por método de pagamento.</p>
                </div>
            )}
        </div>
    )
}
