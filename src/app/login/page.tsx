"use client"

import { useActionState } from "react"
import { authenticate } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
    const [errorMessage, formAction, isPending] = useActionState(
        authenticate,
        undefined
    )

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-2xl border shadow-xl">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
                        <span className="text-primary-foreground font-bold text-2xl">O</span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Bem-vindo de volta</h2>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Entre na sua conta para acessar o Orbital Hub
                    </p>
                </div>

                <form action={formAction} className="space-y-6">
                    <div className="space-y-4">
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
                                required
                                className="h-11"
                            />
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="text-sm font-medium text-destructive text-center bg-destructive/10 py-2 rounded-lg">
                            {errorMessage}
                        </div>
                    )}

                    <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isPending}>
                        {isPending ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            "Entrar"
                        )}
                    </Button>

                    <p className="mt-8 text-center text-sm text-muted-foreground">
                        Ainda não tem uma conta?{" "}
                        <Link
                            href="/register"
                            className="font-medium text-primary hover:underline"
                        >
                            Criar conta grátis
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    )
}
