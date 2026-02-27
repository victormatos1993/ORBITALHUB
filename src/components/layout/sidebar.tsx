"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { useState, useRef, useCallback } from "react"
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
import { ModeToggle } from "@/components/mode-toggle"


export function Sidebar({ userRole: serverRole }: { userRole?: string }) {
    const pathname = usePathname()
    const { data: session } = useSession()
    const clientRole = (session?.user as any)?.role
    const userRole = serverRole || clientRole

    const [hoveredRoute, setHoveredRoute] = useState<string | null>(null)
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const handleMouseEnter = useCallback((label: string, el?: HTMLElement) => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current)
            closeTimeoutRef.current = null
        }
        if (el) {
            const rect = el.getBoundingClientRect()
            setMenuPosition({ top: rect.top, left: rect.right + 8 })
        }
        setHoveredRoute(label)
    }, [])

    const handleMouseLeave = useCallback(() => {
        closeTimeoutRef.current = setTimeout(() => {
            setHoveredRoute(null)
        }, 150)
    }, [])

    const filteredRoutes = routes.filter(route => {
        if (userRole === "ORACULO") return true
        if (!route.roles) return true
        return route.roles.includes(userRole!)
    })

    // Find the currently hovered route for the floating submenu
    const activeHoverRoute = hoveredRoute
        ? filteredRoutes.find(r => r.label === hoveredRoute && r.items)
        : null

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
                                <div
                                    key={route.label}
                                    className="relative"
                                    onMouseEnter={(e) => handleMouseEnter(route.label, e.currentTarget as HTMLElement)}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <Link
                                        href={route.href}
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
                                </div>
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

            {/* Floating submenu — rendered outside the scrollable container */}
            {activeHoverRoute && activeHoverRoute.items && (
                <div
                    className="fixed z-[9999]"
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                    onMouseEnter={() => handleMouseEnter(activeHoverRoute.label)}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="min-w-[200px] p-1.5 rounded-xl shadow-xl border border-border/50 bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 slide-in-from-left-2 duration-150">
                        <div className="flex flex-col">
                            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                                {activeHoverRoute.label}
                            </div>
                            {activeHoverRoute.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setHoveredRoute(null)}
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
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="py-4 border-t border-sidebar-border flex flex-col items-center gap-2">
                <ModeToggle />
            </div>
        </aside>
    )
}

