"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
    CircleUser,
    Menu,
    LayoutDashboard,
    Wallet,
    ShoppingBag,
    Users,
    Settings,
    FileText,
    ChevronDown,
    Orbit,
    Bell,
    LogOut,
    User,
    HelpCircle,
} from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/mode-toggle"

const routes = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/dashboard",
        roles: ["ADMINISTRADOR", "GERENTE", "VENDEDOR", "FINANCEIRO", "VISUALIZADOR"],
    },
    {
        label: "Financeiro",
        icon: Wallet,
        href: "/dashboard/financeiro",
        roles: ["ADMINISTRADOR", "GERENTE", "FINANCEIRO", "VISUALIZADOR"],
        items: [
            { name: "Resumo", href: "/dashboard/financeiro" },
            { name: "Transações", href: "/dashboard/financeiro/transacoes" },
            { name: "Categorias", href: "/dashboard/financeiro/categorias" },
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
        label: "Relatórios",
        icon: FileText,
        href: "/dashboard/relatorios",
        roles: ["ADMINISTRADOR", "GERENTE", "FINANCEIRO", "VISUALIZADOR"],
    },
    {
        label: "Cadastros",
        icon: Users,
        href: "/dashboard/cadastros",
        roles: ["ADMINISTRADOR", "GERENTE", "VENDEDOR", "FINANCEIRO", "VISUALIZADOR"],
        items: [
            { name: "Clientes", href: "/dashboard/cadastros/clientes" },
            { name: "Fornecedores", href: "/dashboard/cadastros/fornecedores" },
            { name: "Produtos/Serviços", href: "/dashboard/cadastros/produtos" },
        ],
    },
    {
        label: "Configurações",
        icon: Settings,
        href: "/dashboard/settings",
        roles: ["ADMINISTRADOR"],
    },
]

function MobileNav({ onClose, filteredRoutes }: { onClose: () => void, filteredRoutes: any[] }) {
    const pathname = usePathname()
    const [openSections, setOpenSections] = useState<string[]>(() =>
        filteredRoutes
            .filter(
                (r) =>
                    r.items &&
                    (r.items.some((i: any) => pathname === i.href) || pathname === r.href)
            )
            .map((r) => r.label)
    )

    const toggleSection = (label: string) => {
        setOpenSections((prev) =>
            prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
        )
    }

    return (
        <div className="flex flex-col h-full bg-sidebar">
            {/* Logo */}
            <div className="flex h-16 items-center border-b border-sidebar-border px-5 shrink-0">
                <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-md">
                        <Orbit className="h-5 w-5 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex items-baseline gap-0">
                        <span className="text-[15px] font-extrabold tracking-tight text-sidebar-foreground">ORBITAL</span>
                        <span className="text-[15px] font-extrabold tracking-tight text-[oklch(0.65_0.17_165)]">HUB</span>
                    </div>
                </Link>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto py-3 px-3">
                {filteredRoutes.map((route) => {
                    const Icon = route.icon

                    if (route.items) {
                        const isActive =
                            route.items.some((i: any) => pathname === i.href) ||
                            pathname === route.href
                        const isOpen = openSections.includes(route.label)

                        return (
                            <div key={route.label} className="mb-0.5">
                                <button
                                    onClick={() => toggleSection(route.label)}
                                    className={cn(
                                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                        isActive
                                            ? "bg-sidebar-accent text-sidebar-primary"
                                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                                    )}
                                >
                                    <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                                    <span className="flex-1 text-left">{route.label}</span>
                                    <ChevronDown
                                        className={cn(
                                            "h-4 w-4 transition-transform duration-200",
                                            isOpen && "rotate-180"
                                        )}
                                    />
                                </button>
                                <div className={cn(
                                    "overflow-hidden transition-all duration-200",
                                    isOpen ? "max-h-40 opacity-100 mt-0.5" : "max-h-0 opacity-0"
                                )}>
                                    <div className="ml-8 flex flex-col gap-0.5 pb-1">
                                        {route.items.map((item: any) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={onClose}
                                                className={cn(
                                                    "rounded-lg px-3 py-2 text-sm transition-all duration-150",
                                                    pathname === item.href
                                                        ? "bg-sidebar-primary/15 text-sidebar-primary font-medium"
                                                        : "text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                                                )}
                                            >
                                                {item.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    const isActive = pathname === route.href
                    return (
                        <Link
                            key={route.label}
                            href={route.href!}
                            onClick={onClose}
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 mb-0.5",
                                isActive
                                    ? "bg-sidebar-accent text-sidebar-primary"
                                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                            )}
                        >
                            <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                            {route.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-sidebar-border p-4 flex items-center justify-between shrink-0">
                <span className="text-xs text-sidebar-foreground/40 font-medium">Tema</span>
                <ModeToggle />
            </div>
        </div>
    )
}

export function Header() {
    const [open, setOpen] = useState(false)
    const { data: session } = useSession()
    const userRole = (session?.user as any)?.role

    const filteredRoutes = routes.filter(route => {
        if (userRole === "ORACULO") return true
        if (!route.roles) return true
        return route.roles.includes(userRole)
    })

    return (
        <header className="flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 lg:px-6 sticky top-0 z-20">
            {/* Mobile menu */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 md:hidden rounded-xl hover:bg-accent"
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Abrir menu de navegação</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[280px] border-r-0">
                    <MobileNav filteredRoutes={filteredRoutes} onClose={() => setOpen(false)} />
                </SheetContent>
            </Sheet>

            {/* Brand Logo */}
            <div className="flex items-center gap-3">
                {/* Show orbital icon only on mobile (sidebar hidden) */}
                <div className="flex md:hidden h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-md">
                    <Orbit className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
                </div>
                <Link href="/dashboard" className="flex items-baseline gap-0 select-none">
                    <span className="text-xl font-extrabold tracking-tight text-foreground">ORBITAL</span>
                    <span className="text-xl font-extrabold tracking-tight text-[oklch(0.65_0.17_165)]">HUB</span>
                </Link>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right side actions */}
            <div className="flex items-center gap-2">
                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-accent">
                    <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse-soft" />
                    <span className="sr-only">Notificações</span>
                </Button>

                {/* User menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-accent">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <User className="h-4 w-4" strokeWidth={2} />
                            </div>
                            <span className="sr-only">Abrir menu do usuário</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
                        <DropdownMenuLabel className="px-3 py-2">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-semibold">{session?.user?.name || "Minha Conta"}</span>
                                <span className="text-xs text-muted-foreground font-normal">{session?.user?.email || "Carregando..."}</span>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(session?.user as any)?.role === "ORACULO" && (
                            <Link href="/oraculo">
                                <DropdownMenuItem className="rounded-lg px-3 py-2 cursor-pointer text-primary bg-primary/5 focus:bg-primary/10">
                                    <Orbit className="mr-2 h-4 w-4" />
                                    Oráculo
                                </DropdownMenuItem>
                            </Link>
                        )}
                        <Link href="/dashboard/settings">
                            <DropdownMenuItem className="rounded-lg px-3 py-2 cursor-pointer">
                                <User className="mr-2 h-4 w-4" />
                                Perfil
                            </DropdownMenuItem>
                        </Link>
                        <Link href="/dashboard/settings">
                            <DropdownMenuItem className="rounded-lg px-3 py-2 cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" />
                                Configurações
                            </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem className="rounded-lg px-3 py-2 cursor-pointer">
                            <HelpCircle className="mr-2 h-4 w-4" />
                            Suporte
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={async () => {
                                await signOut({ callbackUrl: '/' })
                            }}
                            className="rounded-lg px-3 py-2 cursor-pointer text-destructive focus:text-destructive"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sair
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
