"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Wrench, CheckCircle2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createService, updateService } from "@/app/actions/service"

export const SERVICE_CATEGORIES = [
    "Manutenção",
    "Instalação",
    "Consultoria",
    "Reparo",
    "Limpeza",
    "Configuração",
    "Treinamento",
    "Vistoria",
    "Beleza",
    "Estética",
    "Outro",
]

export interface ServiceModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Se fornecido, o modal estará em modo edição */
    editingService?: {
        id: string
        name: string
        description: string | null
        price: number
        duration: number | null
        category: string | null
    } | null
    /** Chamado após salvar com sucesso */
    onSaved?: () => void
}

const emptyForm = { name: "", description: "", price: "", duration: "", category: "" }

export function ServiceModal({ open, onOpenChange, editingService, onSaved }: ServiceModalProps) {
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)

    // Preenche o formulário ao abrir em modo edição
    useEffect(() => {
        if (open) {
            if (editingService) {
                setForm({
                    name: editingService.name,
                    description: editingService.description || "",
                    price: String(editingService.price),
                    duration: editingService.duration ? String(editingService.duration) : "",
                    category: editingService.category || "",
                })
            } else {
                setForm(emptyForm)
            }
        }
    }, [open, editingService])

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error("Nome do serviço é obrigatório")
            return
        }

        const price = parseFloat(form.price.replace(",", ".")) || 0
        setSaving(true)

        try {
            if (editingService) {
                const res = await updateService(editingService.id, {
                    name: form.name.trim(),
                    description: form.description.trim() || null,
                    price,
                    duration: form.duration ? parseInt(form.duration) : null,
                    category: form.category || null,
                })
                if (res.error) {
                    toast.error(res.error)
                } else {
                    toast.success("Serviço atualizado!")
                    onOpenChange(false)
                    onSaved?.()
                }
            } else {
                const res = await createService({
                    name: form.name.trim(),
                    description: form.description.trim() || null,
                    price,
                    duration: form.duration ? parseInt(form.duration) : null,
                    category: form.category || null,
                })
                if (res.error) {
                    toast.error(res.error)
                } else {
                    toast.success(`Serviço "${res.service?.name}" criado!`)
                    onOpenChange(false)
                    onSaved?.()
                }
            }
        } catch {
            toast.error("Erro ao salvar serviço")
        } finally {
            setSaving(false)
        }
    }

    const isEditing = !!editingService

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                            <Wrench className="h-5 w-5 text-primary" />
                        </div>
                        {isEditing ? "Editar Serviço" : "Novo Serviço"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Altere os dados do serviço."
                            : "Cadastre um novo serviço tabelado com preço fixo."
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="service-modal-name" className="text-sm font-medium">
                            Nome <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="service-modal-name"
                            placeholder="Ex: Troca de óleo, Instalação de ar-condicionado..."
                            value={form.name}
                            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                            className="rounded-xl"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="service-modal-description" className="text-sm font-medium">
                            Descrição
                        </Label>
                        <Textarea
                            id="service-modal-description"
                            placeholder="Descreva o serviço brevemente..."
                            value={form.description}
                            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                            className="rounded-xl resize-none"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="service-modal-price" className="text-sm font-medium">
                                Preço (R$) <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="service-modal-price"
                                placeholder="0,00"
                                value={form.price}
                                onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="service-modal-duration" className="text-sm font-medium">
                                Duração (minutos)
                            </Label>
                            <Input
                                id="service-modal-duration"
                                type="number"
                                placeholder="Ex: 60"
                                value={form.duration}
                                onChange={e => setForm(prev => ({ ...prev, duration: e.target.value }))}
                                className="rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Categoria</Label>
                        <Select
                            value={form.category}
                            onValueChange={val => setForm(prev => ({ ...prev, category: val }))}
                        >
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {SERVICE_CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !form.name.trim()}
                        className="rounded-xl gradient-primary text-white hover:opacity-90"
                    >
                        {saving ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                        ) : (
                            <><CheckCircle2 className="mr-2 h-4 w-4" />{isEditing ? "Salvar" : "Cadastrar"}</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
