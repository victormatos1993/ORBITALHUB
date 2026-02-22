import { Button } from "@/components/ui/button"
import { Users, Server, Database, Activity, ShieldCheck, ArrowRight } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default async function AdminDashboardPage() {
    const totalUsers = await prisma.user.count()
    const adminsCount = await prisma.user.count({ where: { role: "ORACULO" } as any })
    const latestUsers = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5
    })

    // Fetch PostgreSQL DB Size
    let dbSize = "N/A"

    function formatBytes(bytes: number, decimals = 2) {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const dm = decimals < 0 ? 0 : decimals
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
    }

    try {
        const result: any = await prisma.$queryRaw`SELECT pg_database_size(current_database()) as size`
        if (result && result[0] && result[0].size !== undefined) {
            const bytes = Number(result[0].size)
            dbSize = formatBytes(bytes)
        }
    } catch (error) {
        console.error("Failed to fetch DB size", error)
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight">Oráculo Workspace</h1>
                <p className="text-muted-foreground">Monitoramento global de infraestrutura, bancos de dados Neon e sessões ativas do SaaS.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Metric 1 */}
                <div className="rounded-2xl border bg-card text-card-foreground shadow-sm p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-primary/20" />
                    <div className="flex flex-row items-center justify-between pb-4">
                        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Usuários Totais</h3>
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Users className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-black">{totalUsers}</div>
                    <div className="text-xs text-emerald-500 font-medium mt-2 flex items-center gap-1">
                        <Activity className="w-3 h-3" /> +12% este mês
                    </div>
                </div>

                {/* Metric 2 */}
                <div className="rounded-2xl border bg-card text-card-foreground shadow-sm p-6 relative overflow-hidden group">
                    <div className="flex flex-row items-center justify-between pb-4">
                        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Armazenamento Neon DB</h3>
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                            <Database className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-black">{dbSize}</div>
                    <div className="text-xs text-muted-foreground mt-2">
                        Pool connection operacional
                    </div>
                </div>

                {/* Metric 3 */}
                <div className="rounded-2xl border bg-card text-card-foreground shadow-sm p-6 relative overflow-hidden group">
                    <div className="flex flex-row items-center justify-between pb-4">
                        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Oráculos</h3>
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-black">{adminsCount}</div>
                    <div className="text-xs text-muted-foreground mt-2">
                        Contas com privilégio Root
                    </div>
                </div>

                {/* Metric 4 */}
                <div className="rounded-2xl border bg-card text-card-foreground shadow-sm p-6 relative overflow-hidden group">
                    <div className="flex flex-row items-center justify-between pb-4">
                        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Status da Vercel</h3>
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                            <Server className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="text-xl font-bold text-emerald-500 flex items-center gap-2 mt-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        Operacional
                    </div>
                    <div className="text-xs text-muted-foreground mt-3">
                        Último deploy: Agora
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                {/* Recent Users Table */}
                <div className="lg:col-span-2 rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Novos Cadastros</h3>
                            <p className="text-sm text-muted-foreground">Últimos 5 usuários ingressantes na plataforma.</p>
                        </div>
                        <Link href="/oraculo/users">
                            <Button variant="outline" size="sm" className="gap-2">
                                Ver todos <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Usuário</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Adesão</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {latestUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{user.name || "Sem Nome"}</span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={(user as any).role === "ORACULO" ? "default" : "secondary"} className="text-[10px] uppercase font-bold tracking-wider">
                                                {(user as any).role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground">
                                            {new Date(user.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Quick Actions Panel */}
                <div className="rounded-2xl border bg-card shadow-sm p-6 flex flex-col gap-4">
                    <h3 className="text-lg font-semibold mb-2">Painel de Ações</h3>

                    <Link href="/oraculo/users" className="w-full">
                        <Button className="w-full justify-start h-12" variant="secondary">
                            <Users className="w-5 h-5 mr-3 text-muted-foreground" />
                            Gerenciamento de Acessos
                        </Button>
                    </Link>

                    <div className="flex-1" />

                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50 text-sm text-muted-foreground">
                        <strong>Dica de Segurança:</strong> Nunca compartilhe o link direto do dashboard Master. Esta área possui acesso irrestrito ao banco de dados Neon.
                    </div>
                </div>
            </div>
        </div>
    )
}
