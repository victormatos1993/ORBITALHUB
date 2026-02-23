import { notFound } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeft, MapPin, Calendar, DollarSign, ShoppingBag, Eye, Pencil, FileText, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCustomerDetails, getCustomers } from "@/app/actions/customer"
import { getCompany } from "@/app/actions/company"
import { getProducts } from "@/app/actions/product"
import { getServices } from "@/app/actions/service"
import { getQuotes } from "@/app/actions/quote"
import Link from "next/link"
import { CustomerSalesHistory } from "@/components/customers/customer-sales-history"
import { CustomerQuotesList } from "@/components/customers/customer-quotes-list"
import { CustomerEventsList } from "@/components/customers/customer-events-list"

export default async function CustomerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const [customer, companyResponse, productsRes, services, quotes, customersRes] = await Promise.all([
        getCustomerDetails(id),
        getCompany(),
        getProducts(),
        getServices(),
        getQuotes(),
        getCustomers({ pageSize: 100 })
    ])

    const company = companyResponse && 'data' in companyResponse ? companyResponse.data : null
    const products = productsRes.products || []
    const customers = customersRes.customers || []

    if (!customer) {
        return notFound()
    }

    // Ensure all optional fields have safe defaults for rendering if needed, 
    // although we handle nulls in the JSX.
    // The previous type errors were due to mismatched types from generation, 
    // but explicitly accessing properties that exist on the Prisma model is safe now.

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                    <Button variant="outline" size="sm" className="h-8 px-2 shrink-0" asChild>
                        <Link href="/dashboard/cadastros/clientes">
                            <ArrowLeft className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Voltar</span>
                        </Link>
                    </Button>
                    <h2 className="text-lg sm:text-2xl font-bold tracking-tight truncate">{customer.name}</h2>
                </div>
                <Button size="sm" className="shrink-0" asChild>
                    <Link href={`/dashboard/cadastros/clientes/${id}/editar`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span className="hidden xs:inline">Editar Cliente</span>
                        <span className="xs:hidden">Editar</span>
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <Card className="flex-1 border-emerald-500/20 bg-emerald-500/5 shadow-none min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                        <CardTitle className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Faturamento</CardTitle>
                        <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                        <div>
                            <div className="text-xl font-bold text-emerald-700">
                                {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                }).format(customer.stats.totalSpent)}
                            </div>
                            <p className="text-[9px] text-emerald-600/70 font-medium uppercase tracking-tight">Total Gasto</p>
                        </div>
                        <div className="pt-2 border-t border-emerald-500/10">
                            <div className="text-lg font-bold text-indigo-700">
                                {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                }).format(customer.stats.scheduledRevenue)}
                            </div>
                            <p className="text-[9px] text-indigo-600/70 font-medium uppercase tracking-tight flex items-center gap-1">
                                <CalendarDays className="h-2.5 w-2.5" />
                                Previsto (Agenda)
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex-1 shadow-none min-w-0 bg-muted/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                        <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Atividade</CardTitle>
                        <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                        <div>
                            <div className="text-xl font-bold">{customer.stats.totalPurchases}</div>
                            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight">Vendas no PDV</p>
                        </div>
                        <div className="pt-2 border-t border-muted/20">
                            <div className="text-lg font-bold">
                                {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                }).format(customer.stats.averageTicket)}
                            </div>
                            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight">Ticket Médio</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex-1 shadow-none min-w-0 md:col-span-1 sm:col-span-2 md:h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                        <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Recência</CardTitle>
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 h-full flex flex-col justify-center pb-6">
                        <div className="text-xl font-bold">
                            {customer.stats.lastPurchase
                                ? format(customer.stats.lastPurchase, "dd/MM/yyyy")
                                : "-"}
                        </div>
                        <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight">Última Compra</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Dados do Cliente</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-center space-x-2">
                                {customer.email ? (
                                    <a
                                        href={`mailto:${customer.email}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Enviar E-mail"
                                        className="opacity-70 hover:opacity-100 transition-opacity shrink-0"
                                    >
                                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" style={{ color: "hsl(var(--primary))" }}>
                                            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
                                        </svg>
                                    </a>
                                ) : (
                                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground shrink-0" fill="currentColor">
                                        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
                                    </svg>
                                )}
                                <span className="text-sm">{customer.email || "Não informado"}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                {customer.phone ? (
                                    <a
                                        href={`https://wa.me/55${customer.phone.replace(/\D/g, "")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Conversar no WhatsApp"
                                        className="opacity-70 hover:opacity-100 transition-opacity shrink-0"
                                    >
                                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#25D366">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                    </a>
                                ) : (
                                    <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-30 shrink-0" fill="#25D366">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                )}
                                <span className="text-sm">{customer.phone || "Não informado"}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-semibold text-muted-foreground w-4 flex justify-center">ID</span>
                                <span className="text-sm">{customer.document || "CPF/CNPJ não informado"}</span>
                            </div>
                            <div className="flex items-start space-x-2 border-t pt-4 mt-2">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                                <div className="text-sm space-y-1">
                                    <p className="font-medium">Endereço de Cobrança</p>
                                    <p>
                                        {customer.address || "Rua não informada"}
                                        {customer.number ? `, ${customer.number}` : ", S/N"}
                                    </p>
                                    {customer.complement && (
                                        <p className="text-muted-foreground">Compl: {customer.complement}</p>
                                    )}
                                    <p>
                                        {customer.neighborhood || "Bairro não informado"}
                                        {customer.zipCode ? ` - CEP: ${customer.zipCode}` : ""}
                                    </p>
                                    <p className="text-muted-foreground">
                                        {customer.city || "Cidade"} - {customer.state || "UF"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-5">
                    <CardHeader>
                        <CardTitle>Histórico de Vendas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CustomerSalesHistory
                            data={customer.sales.map((sale) => ({
                                ...sale,
                                date: sale.date.toISOString(),
                                totalAmount: Number(sale.totalAmount),
                                items: sale.items.map((item: any) => ({
                                    ...item,
                                    unitPrice: Number(item.unitPrice),
                                    product: item.product || { name: 'Item s/ produto' }
                                }))
                            }))}
                        />
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-4">
                <CustomerQuotesList
                    quotes={customer.quotes}
                    company={company}
                    customerName={customer.name}
                    customerEmail={customer.email}
                    customerPhone={customer.phone}
                />

                <CustomerEventsList
                    events={customer.events}
                    customerDetails={{
                        name: customer.name,
                        email: customer.email,
                        phone: customer.phone
                    }}
                    products={products}
                    services={services}
                    quotes={quotes}
                    customers={customers}
                />
            </div>

        </div>
    )
}
