import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    providers: [],
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const userRole = (auth?.user as any)?.role

            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')
            const isOnOraculo = nextUrl.pathname.startsWith('/oraculo')
            const isAuthRoute = nextUrl.pathname === '/login' || nextUrl.pathname === '/register'

            if (isOnOraculo) {
                if (isLoggedIn && userRole === 'ORACULO') return true
                return Response.redirect(new URL('/dashboard', nextUrl))
            }

            if (isOnDashboard) {
                if (isLoggedIn) {
                    if (userRole === 'ORACULO') {
                        return Response.redirect(new URL('/oraculo', nextUrl))
                    }
                    return true
                }
                return false // Redirect to login page
            }

            if (isAuthRoute) {
                if (isLoggedIn) {
                    if (userRole === 'ORACULO') return Response.redirect(new URL('/oraculo', nextUrl))
                    return Response.redirect(new URL('/dashboard', nextUrl))
                }
                return true
            }

            return true
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id
                token.role = (user as any).role
                token.parentAdminId = (user as any).parentAdminId
                token.phone = (user as any).phone
                token.position = (user as any).position
            }
            // Handle manual session update
            if (trigger === "update" && session) {
                token.name = session.user.name
                token.phone = session.user.phone
                token.position = session.user.position
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
                (session.user as any).parentAdminId = token.parentAdminId;
                (session.user as any).phone = token.phone;
                (session.user as any).position = token.position;
            }
            return session
        }
    },
} satisfies NextAuthConfig
