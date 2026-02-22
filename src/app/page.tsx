import Link from "next/link";
import { ArrowRight, BarChart3, Users, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center selection:bg-primary/30">

      {/* Navigation Bar */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">O</span>
          </div>
          <span className="font-bold text-xl tracking-tight">ORBITAL HUB</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
            Login
          </Link>
          <Link href="/login">
            <Button size="sm" className="rounded-full shadow-lg shadow-primary/20">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 w-full flex flex-col items-center justify-center relative overflow-hidden px-6 pt-24 pb-32">
        {/* Abstract Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] opacity-50 -z-10" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] opacity-30 -z-10" />

        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Nova Versão 2.0 Disponível
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-balance leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-1000">
            A forma moderna de <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">
              gerir seu negócio
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
            Controle financeiro, gestão de clientes, orçamentos e vendas num ecossistema inteligente criado para impulsionar seus resultados.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
            <Link href="/login">
              <Button size="lg" className="rounded-full px-8 h-14 text-base font-semibold shadow-xl shadow-primary/25 hover:scale-105 transition-all">
                Começar agora gratuitamente
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="w-full max-w-7xl mx-auto px-6 py-24 z-10 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: <BarChart3 className="w-6 h-6 text-primary" />,
              title: "Painel Financeiro",
              description: "Acompanhe receitas, despesas e fluxo de caixa em tempo real."
            },
            {
              icon: <Users className="w-6 h-6 text-blue-500" />,
              title: "Gestão Avançada",
              description: "CRM completo para carteira de clientes, leads e fornecedores."
            },
            {
              icon: <Zap className="w-6 h-6 text-amber-500" />,
              title: "Orçamentos Ágeis",
              description: "Gere e aprove orçamentos em segundos com sua própria marca."
            },
            {
              icon: <Shield className="w-6 h-6 text-emerald-500" />,
              title: "Controle de Acessos",
              description: "Roles, permissões e total segurança para a sua equipe operar."
            }
          ].map((feature, i) => (
            <div key={i} className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all flex flex-col gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-background border flex items-center justify-center group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-lg">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-border/50 mt-auto bg-card/30 backdrop-blur-sm z-10 relative">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Orbital Hub. Todos os direitos reservados.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="#" className="hover:text-foreground transition-colors">Termos</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
