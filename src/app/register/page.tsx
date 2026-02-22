"use client"

import { useActionState } from "react"
import { register } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Loader2 } from "lucide-react"

export default function RegisterPage() {
    const [errorMessage, formAction, isPending] = useActionState(
        register,
        undefined
    )

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-2xl border shadow-xl">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
                        <span className="text-primary-foreground font-bold text-2xl">O</span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Criar Conta</h2>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Comece a usar o Orbital Hub agora mesmo
                    </p>
                </div>

                <form action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome completo</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="João da Silva"
                            required
                            className="h-11"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="seu@email.com"
                            required
                            className="h-11"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="Minimo de 6 caracteres"
                            required
                            minLength={6}
                            className="h-11"
                        />
                    </div>

                    {errorMessage && (
                        <div className="text-sm font-medium text-destructive text-center bg-destructive/10 py-2 rounded-lg mt-4">
                            {errorMessage}
                        </div>
                    )}

                    <Button type="submit" className="w-full h-11 text-base font-semibold mt-4" disabled={isPending}>
                        {isPending ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            "Criar Conta"
                        )}
                    </Button>

                    <p className="mt-8 text-center text-sm text-muted-foreground">
                        Já possui uma conta?{" "}
                        <Link
                            href="/login"
                            className="font-medium text-primary hover:underline"
                        >
                            Fazer login
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    )
}
