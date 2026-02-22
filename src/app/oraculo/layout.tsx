import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { auth } from "@/auth"

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
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
                <main className="flex-1 overflow-auto p-6 lg:p-10">
                    <div className="mx-auto max-w-6xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
