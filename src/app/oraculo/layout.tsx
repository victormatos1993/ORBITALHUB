import { Shield } from "lucide-react"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen w-full bg-background flex-col">
            {/* Simple top nav for admin */}
            <header className="flex h-16 items-center border-b bg-card px-6 gap-2">
                <Shield className="w-6 h-6 text-primary" />
                <span className="font-bold text-lg tracking-tight">ORBITAL ORÁCULO</span>
            </header>

            <main className="flex-1 overflow-auto p-6 lg:p-10">
                <div className="mx-auto max-w-6xl">
                    {children}
                </div>
            </main>
        </div>
    )
}
