import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { auth } from "@/auth"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await auth()
    const userRole = (session?.user as any)?.role
    const userName = session?.user?.name
    const userEmail = session?.user?.email

    return (
        <div className="flex min-h-screen w-full bg-background">
            <Sidebar userRole={userRole} />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header
                    userRole={userRole}
                    userName={userName || undefined}
                    userEmail={userEmail || undefined}
                />
                <main className="flex flex-1 flex-col gap-6 p-5 lg:p-8 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
