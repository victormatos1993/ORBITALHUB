import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { NextAuthProvider } from "@/components/providers/session-provider";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ORBITAL HUB - Gestão Empresarial",
  description: "Sistema completo de gestão empresarial. Controle financeiro, vendas, estoque e cadastros em um só lugar.",
  keywords: ["gestão", "ERP", "financeiro", "vendas", "estoque", "orbital hub"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <NextAuthProvider>
            <TooltipProvider delayDuration={200}>
              {children}
              <Toaster
                position="bottom-right"
                toastOptions={{
                  className: "rounded-xl",
                }}
              />
            </TooltipProvider>
          </NextAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
