import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { DeleteUserButton } from "./delete-user-button"

export default async function AdminUsersPage() {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" }
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/oraculo" className="p-2 border rounded-md hover:bg-muted">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Usuários Cadastrados</h1>
                    <p className="text-muted-foreground mt-2">Gerencie as contas criadas no sistema.</p>
                </div>
            </div>

            <div className="border rounded-xl bg-card shadow overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Data de Criação</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant={(user as any).role === "ORACULO" ? "default" : "secondary"}>
                                        {(user as any).role}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DeleteUserButton
                                        userId={user.id}
                                        userName={user.name || ""}
                                        userEmail={user.email || ""}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
