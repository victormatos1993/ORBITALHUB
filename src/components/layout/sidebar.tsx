"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
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
    Calendar,
} from "lucide-react"

import { navigationRoutes as routes } from "@/config/navigation"

import { cn } from "@/lib/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card"
import { ModeToggle } from "@/components/mode-toggle"



export function Sidebar({ userRole: serverRole }: { userRole?: string }) {
    const pathname = usePathname()
    const { data: session } = useSession()
    const clientRole = (session?.user as any)?.role

    // Prioritize server-provided role for immediate render
    const userRole = serverRole || clientRole

    const filteredRoutes = routes.filter(route => {
        if (userRole === "ORACULO") return true
        if (!route.roles) return true
        return route.roles.includes(userRole!)
    })

    return (
        <aside className="hidden md:flex flex-col h-screen sticky top-0 z-30 w-[72px] bg-sidebar border-r border-sidebar-border">
            {/* Logo */}
            <div className="flex h-[72px] items-center justify-center shrink-0 border-b border-sidebar-border">
                <Link href="/dashboard" className="group relative flex items-center justify-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary shadow-lg shadow-primary/25 transition-all duration-300 group-hover:shadow-primary/40 group-hover:scale-105">
                        <Orbit className="h-6 w-6 text-white" strokeWidth={2.5} />
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
                <nav className="flex flex-col gap-1.5 items-center px-2">
                    {filteredRoutes.map((route) => {
                        if (route.items) {
                            const isActive = route.items.some(item => pathname === item.href) || pathname === route.href

                            return (
                                <HoverCard key={route.label} openDelay={0} closeDelay={150}>
                                    <HoverCardTrigger asChild>
                                        <div
                                            className={cn(
                                                "relative flex h-11 w-11 items-center justify-center rounded-xl cursor-pointer transition-all duration-200",
                                                isActive
                                                    ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                                                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                                            )}
                                        >
                                            {isActive && (
                                                <span className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary transition-all duration-300" />
                                            )}
                                            <route.icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.2 : 1.8} />
                                            <span className="sr-only">{route.label}</span>
                                        </div>
                                    </HoverCardTrigger>
                                    <HoverCardContent side="right" align="start" className="min-w-[200px] p-1.5 ml-2 rounded-xl shadow-xl border-border/50">
                                        <div className="flex flex-col">
                                            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                                                {route.label}
                                            </div>
                                            {route.items.map((item) => (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={cn(
                                                        "flex items-center rounded-lg px-3 py-2 text-sm transition-all duration-150",
                                                        pathname === item.href
                                                            ? "bg-primary/10 text-primary font-medium"
                                                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                                    )}
                                                >
                                                    {item.name}
                                                </Link>
                                            ))}
                                        </div>
                                    </HoverCardContent>
                                </HoverCard>
                            )
                        }

                        // Single items (Tooltip)
                        const isActive = pathname === route.href
                        return (
                            <Tooltip key={route.label}>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={route.href!}
                                        className={cn(
                                            "relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200",
                                            isActive
                                                ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                                                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                                        )}
                                    >
                                        {isActive && (
                                            <span className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary transition-all duration-300" />
                                        )}
                                        <route.icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.2 : 1.8} />
                                        <span className="sr-only">{route.label}</span>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="ml-2 rounded-lg font-medium">{route.label}</TooltipContent>
                            </Tooltip>
                        )
                    })}
                </nav>
            </div>

            {/* Footer */}
            <div className="py-4 border-t border-sidebar-border flex flex-col items-center gap-2">
                <ModeToggle />
            </div>
        </aside>
    )
}
