import {
    FileText,
    TrendingUp,
    Wallet,
    ShoppingBag,
    Package,
    UsersRound,
    Wrench,
    Download,
    LineChart,
    PieChart,
    BarChart3,
    Activity,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    CalendarDays,
    Star,
    Sparkles
} from "lucide-react"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MaintenanceOverlay } from "@/components/ui/maintenance-overlay"

const relatoriosData = {
    financeiro: [
        {
            id: "fin-fluxo",
            titulo: "Fluxo de Caixa",
            descricao: "Visão detalhada de entradas, saídas e previsões para o período.",
            icone: LineChart,
            tipo: "Gráfico e Tabela",
            destaque: true
        },
        {
            id: "fin-dre",
            titulo: "DRE (Demonstrativo do Resultado)",
            descricao: "Apuração de receitas, custos e despesas para visualização de lucro ou prejuízo do exercício.",
            icone: PieChart,
            tipo: "Tabela Contábil",
            destaque: true
        },
        {
            id: "fin-receber",
            titulo: "Contas a Receber & Inadimplência",
            descricao: "Relação de boletos, faturas e clientes com parcelas em atraso.",
            icone: ArrowUpRight,
            tipo: "Lista Gerencial"
        },
        {
            id: "fin-pagar",
            titulo: "Contas a Pagar",
            descricao: "Obrigações financeiras iminentes e atrasadas categorizadas por fornecedor.",
            icone: ArrowDownRight,
            tipo: "Lista Gerencial"
        },
        {
            id: "fin-centro-custos",
            titulo: "Despesas por Centro de Custo",
            descricao: "Distribuição das despesas financeiras entre os departamentos ou áreas de negócio.",
            icone: BarChart3,
            tipo: "Gráfico Analítico"
        },
    ],
    vendas: [
        {
            id: "ven-periodo",
            titulo: "Vendas por Período (Faturamento)",
            descricao: "Total vendido segmentado por dias, semanas ou meses, comparado com metas.",
            icone: TrendingUp,
            tipo: "Gráfico",
            destaque: true
        },
        {
            id: "ven-curva-abc",
            titulo: "Curva ABC de Produtos",
            descricao: "Classificação de itens de maior importância e faturamento em suas vendas.",
            icone: Activity,
            tipo: "Matriz Analítica",
            destaque: true
        },
        {
            id: "ven-vendedores",
            titulo: "Ranking e Comissões de Vendedores",
            descricao: "Desempenho da equipe comercial e cálculo de valores devidos por comissionamento.",
            icone: UsersRound,
            tipo: "Tabela e Gráficos"
        },
        {
            id: "ven-lucratividade",
            titulo: "Rentabilidade de Vendas",
            descricao: "Análise da margem de lucro real sobre as vendas finalizadas, descontando custos.",
            icone: Wallet,
            tipo: "Dashboard"
        }
    ],
    estoque: [
        {
            id: "est-posicao",
            titulo: "Posição de Estoque (Valuation)",
            descricao: "Quantidade e valorização financeira dos produtos armazenados em tempo real.",
            icone: Package,
            tipo: "Tabela",
            destaque: true
        },
        {
            id: "est-reposicao",
            titulo: "Sugestão de Compras (Estoque Mínimo)",
            descricao: "Lista automática de produtos cuja reposição é necessária baseada no estoque mínimo.",
            icone: AlertCircle,
            tipo: "Alerta e Relatório"
        },
        {
            id: "est-giro",
            titulo: "Giro de Estoque",
            descricao: "Velocidade com que o inventário está sendo vendido e substituído.",
            icone: CalendarDays,
            tipo: "KPIs"
        }
    ],
    clientes: [
        {
            id: "cli-inativos",
            titulo: "Clientes Inativos (Risco de Churn)",
            descricao: "Base de contatos que não realizam compras há um determinado período.",
            icone: UsersRound,
            tipo: "Lista Ativa"
        },
        {
            id: "cli-ticket",
            titulo: "Ticket Médio por Cliente",
            descricao: "Distribuição e identificação dos seus compradores de alto valor (VIPs).",
            icone: Star,
            tipo: "Gráfico",
            destaque: true
        }
    ],
    servicos: [
        {
            id: "srv-os",
            titulo: "Ordens de Serviço por Status",
            descricao: "Acompanhamento do gargalo operacional com OS abertas, em andamento e concluídas.",
            icone: Wrench,
            tipo: "Kanban/Lista"
        },
        {
            id: "srv-horas",
            titulo: "Apuração de Horas Técnicas",
            descricao: "Volume de tempo despendido pelos colaboradores por serviço e rentabilidade.",
            icone: CalendarDays,
            tipo: "Tabela"
        }
    ]
}

import { getReportsData } from "@/app/actions/reports"
import { formatCurrency } from "@/lib/utils"

export default async function RelatoriosPage() {
    // Fetch real data
    const reports = await getReportsData()
    const financeiroData = reports?.financeiro || { totalIncome: 0, totalExpense: 0, balance: 0 }
    const vendasData = reports?.vendas || { totalSales: 0, totalSalesAmount: 0 }
    const crmData = reports?.crm || { newCustomers: 0 }
    return (
        <div className="flex flex-col gap-8 w-full animate-in fade-in zoom-in-95 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Inteligência & Relatórios</h1>
                    </div>
                    <p className="text-muted-foreground max-w-2xl text-base">
                        Gere insights estratégicos com base em dados de toda a sua operação.
                        Aproveite as análises recomendadas pela inteligência de mercado do ERP.
                    </p>
                </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card shadow-sm border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-emerald-500" /> Receita Total
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(financeiroData.totalIncome)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-card shadow-sm border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-rose-500" /> Despesas Totais
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-500">{formatCurrency(financeiroData.totalExpense)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-card shadow-sm border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4 text-blue-500" /> Total em Vendas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(vendasData.totalSalesAmount)}</div>
                        <p className="text-xs text-muted-foreground mt-1">{vendasData.totalSales} pedido(s) concluído(s)</p>
                    </CardContent>
                </Card>
                <Card className="bg-card shadow-sm border-border/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <UsersRound className="h-4 w-4 text-purple-500" /> Clientes na Base
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{crmData.newCustomers}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Content Tabs */}
            <div className="relative">
                <div className="absolute inset-0 z-10">
                    <MaintenanceOverlay
                        title="Relatórios em Manutenção"
                        description="Estamos refinando nossos algoritmos de inteligência para fornecer insights ainda mais precisos. Esta funcionalidade retornará em breve."
                    />
                </div>
                <div className="opacity-20 pointer-events-none select-none filter blur-[2px]">
                    <Tabs defaultValue="todos" className="w-full">
                        <TabsList className="flex w-full md:w-auto h-auto md:inline-flex p-1 bg-muted/50 overflow-x-auto gap-2 flex-nowrap rounded-xl justify-start">
                            <TabsTrigger value="todos" className="rounded-lg px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary flex items-center gap-2">
                                <Star className="h-4 w-4" />
                                Mais Usados
                            </TabsTrigger>
                            <TabsTrigger value="financeiro" className="rounded-lg px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2">
                                <Wallet className="h-4 w-4" />
                                Financeiro
                            </TabsTrigger>
                            <TabsTrigger value="vendas" className="rounded-lg px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2">
                                <ShoppingBag className="h-4 w-4" />
                                Vendas
                            </TabsTrigger>
                            <TabsTrigger value="estoque" className="rounded-lg px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Estoque
                            </TabsTrigger>
                            <TabsTrigger value="clientes" className="rounded-lg px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2">
                                <UsersRound className="h-4 w-4" />
                                CRM
                            </TabsTrigger>
                            <TabsTrigger value="servicos" className="rounded-lg px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Serviços
                            </TabsTrigger>
                        </TabsList>

                        {/* Todos / Destaques */}
                        <TabsContent value="todos" className="mt-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {Object.values(relatoriosData).flat().filter((r: any) => r.destaque).map((relatorio) => (
                                    <ReportCard key={relatorio.id} {...relatorio} />
                                ))}
                            </div>
                        </TabsContent>

                        {/* Individual Categories */}
                        {Object.entries(relatoriosData).map(([key, relatorios]) => (
                            <TabsContent key={key} value={key} className="mt-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {relatorios.map((relatorio) => (
                                        <ReportCard key={relatorio.id} {...relatorio} />
                                    ))}
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>
            </div>
        </div>
    )
}

function ReportCard({ titulo, descricao, icone: Icon, tipo, destaque }: any) {
    return (
        <Card className="group relative overflow-hidden border border-border/50 bg-background/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col h-full">
            {destaque && (
                <div className="absolute top-0 right-0 p-4">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                </div>
            )}

            <CardHeader className="p-6 pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl leading-tight font-semibold">{titulo}</CardTitle>
                <div className="mt-2">
                    <Badge variant="secondary" className="bg-secondary/50 font-medium text-xs">
                        {tipo}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="p-6 pt-0 flex-1">
                <CardDescription className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {descricao}
                </CardDescription>
            </CardContent>

            <CardFooter className="p-6 pt-0 mt-auto border-t border-border/50 bg-muted/10">
                <Button className="w-full mt-4 gap-2 transition-all duration-300 group-hover:bg-primary" variant="outline">
                    <Download className="h-4 w-4" />
                    Gerar Relatório
                </Button>
            </CardFooter>
        </Card>
    )
}
