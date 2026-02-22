"use server"

import { signIn } from "@/auth"
import { AuthError } from "next-auth"
import { prisma } from "@/lib/prisma"
import bcryptjs from "bcryptjs"
import { z } from "zod"

const LoginSchema = z.object({
    email: z.string().email({ message: "E-mail inválido" }),
    password: z.string().min(1, { message: "A senha é obrigatória" }),
})

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        const data = Object.fromEntries(formData.entries())
        const parsed = LoginSchema.safeParse(data)

        if (!parsed.success) {
            return "Credenciais inválidas"
        }

        await signIn("credentials", {
            ...parsed.data,
            redirectTo: "/dashboard", // Middleware will kick ADMINS to /admin automatically.
        })
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return "Credenciais inválidas."
                default:
                    return "Ocorreu um erro ao fazer login."
            }
        }
        throw error // Important: Next.js redirects throw an error to halt execution, so we must re-throw it.
    }
}

const RegisterSchema = z.object({
    name: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
    email: z.string().email({ message: "E-mail inválido" }),
    password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
})

export async function register(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        const data = Object.fromEntries(formData.entries())
        const parsed = RegisterSchema.safeParse(data)

        if (!parsed.success) {
            return parsed.error.issues[0].message
        }

        const { name, email, password } = parsed.data

        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            return "Já existe um usuário com este e-mail."
        }

        const hashedPassword = await bcryptjs.hash(password, 10)

        try {
            await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: "ADMINISTRADOR"
                }
            })
        } catch (e) {
            console.log(e)
            return "Ocorreu um erro ao registrar no banco."
        }

        // Try to login directly after successful registration
        await signIn("credentials", {
            email,
            password,
            redirectTo: "/dashboard",
        })

    } catch (error) {
        if (error instanceof AuthError) {
            return "Erro ao tentar realizar autologin"
        }
        throw error
    }
}
