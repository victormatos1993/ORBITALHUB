import {
    LayoutDashboard,
    Wallet,
    ShoppingBag,
    UsersRound,
    Package,
    Wrench,
    Settings,
    FileText,
    Orbit,
    Plug,
    Calendar,
    BellRing,
    Truck,
    LucideIcon
} from "lucide-react"

export interface NavItem {
    name: string
    href: string
}

export interface NavRoute {
    label: string
    icon: LucideIcon
    href: string
    roles?: string[]
    items?: NavItem[]
}

export const navigationRoutes: NavRoute[] = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/dashboard",
        roles: ["ADMINISTRADOR", "GERENTE", "VENDEDOR", "FINANCEIRO", "VISUALIZADOR"],
    },
    {
        label: "Oráculo",
        icon: Orbit,
        href: "/oraculo",
        roles: ["ORACULO"],
    },
    {
        label: "Agenda",
        icon: Calendar,
        href: "/dashboard/agenda",
        roles: ["ADMINISTRADOR", "GERENTE", "VENDEDOR", "VISUALIZADOR"],
    },
    {
        label: "Notificações",
        icon: BellRing,
        href: "/dashboard/notificacoes",
        roles: ["ADMINISTRADOR", "GERENTE", "VENDEDOR", "FINANCEIRO", "VISUALIZADOR"],
    },
    {
        label: "Financeiro",
        icon: Wallet,
        href: "/dashboard/financeiro",
        roles: ["ADMINISTRADOR", "GERENTE", "FINANCEIRO", "VISUALIZADOR"],
        items: [
            { name: "Resumo", href: "/dashboard/financeiro" },
            { name: "Contas a Pagar", href: "/dashboard/financeiro/contas-pagar" },
            { name: "Contas a Receber", href: "/dashboard/financeiro/contas-receber" },
            { name: "Receitas", href: "/dashboard/financeiro/receitas" },
            { name: "Despesas Pagas", href: "/dashboard/financeiro/despesas" },
            { name: "Contas e Cartões", href: "/dashboard/financeiro/contas" },
            { name: "Maquininhas", href: "/dashboard/financeiro/maquininhas" },
            { name: "Plano de Contas", href: "/dashboard/financeiro/categorias" },
        ],
    },
    {
        label: "Vendas",
        icon: ShoppingBag,
        href: "/dashboard/vendas/pdv",
        roles: ["ADMINISTRADOR", "GERENTE", "VENDEDOR", "VISUALIZADOR"],
        items: [
            { name: "PDV", href: "/dashboard/vendas/pdv" },
            { name: "Histórico", href: "/dashboard/vendas" },
        ],
    },
    {
        label: "CRM",
        icon: UsersRound,
        href: "/dashboard/cadastros/clientes",
        roles: ["ADMINISTRADOR", "GERENTE", "VENDEDOR", "FINANCEIRO", "VISUALIZADOR"],
    },
    {
        label: "Estoque",
        icon: Package,
        href: "/dashboard/cadastros/produtos",
        roles: ["ADMINISTRADOR", "GERENTE", "VENDEDOR", "VISUALIZADOR"],
        items: [
            { name: "Produtos", href: "/dashboard/cadastros/produtos" },
            { name: "Fornecedores", href: "/dashboard/cadastros/fornecedores" },
            { name: "Entrada de Mercadorias", href: "/dashboard/estoque/entrada" },
        ],
    },
    {
        label: "Logística",
        icon: Truck,
        href: "/dashboard/logistica",
        roles: ["ADMINISTRADOR", "GERENTE", "VENDEDOR", "VISUALIZADOR"],
        items: [
            { name: "Dashboard", href: "/dashboard/logistica" },
            { name: "Pedidos", href: "/dashboard/logistica/pedidos" },
            { name: "Envios", href: "/dashboard/logistica/envios" },
        ],
    },
    {
        label: "Serviços",
        icon: Wrench,
        href: "/dashboard/servicos",
        roles: ["ADMINISTRADOR", "GERENTE", "VENDEDOR", "VISUALIZADOR"],
        items: [
            { name: "Catálogo", href: "/dashboard/servicos" },
            { name: "Orçamentos", href: "/dashboard/servicos/orcamentos" },
        ],
    },
    {
        label: "Relatórios",
        icon: FileText,
        href: "/dashboard/relatorios",
        roles: ["ADMINISTRADOR", "GERENTE", "FINANCEIRO", "VISUALIZADOR"],
    },
    {
        label: "Configurações",
        icon: Settings,
        href: "/dashboard/settings",
        roles: ["ADMINISTRADOR"],
    },
    {
        label: "Conexões",
        icon: Plug,
        href: "/dashboard/conexoes",
        roles: ["ADMINISTRADOR"],
    },
]
