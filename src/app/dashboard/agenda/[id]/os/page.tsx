import { getAgendaEvent } from "@/app/actions/agenda"
import { getCompany } from "@/app/actions/company"
import { format } from "date-fns"
import { Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PrintButton } from "@/components/ui/print-button"

export default async function OrdemDeServicoPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const event = await getAgendaEvent(resolvedParams.id)

    if (!event) {
        notFound()
    }

    const { data: company } = await getCompany()

    return (
        <div className="min-h-screen bg-white">
            {/* Action Bar (Hidden in Print) */}
            <div className="print:hidden bg-gray-100 p-4 flex justify-between items-center border-b">
                <Button variant="outline" asChild>
                    <Link href="/dashboard/agenda">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para Agenda
                    </Link>
                </Button>
                <h1 className="text-xl font-bold">Visualização de Documento</h1>
                <PrintButton />
            </div>

            {/* Printable Document Area */}
            <div className="max-w-4xl mx-auto p-12 text-black font-sans bg-white print:p-0">

                {/* Cabeçalho da Empresa */}
                <div className="border-b-2 border-gray-800 pb-6 mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-extrabold uppercase tracking-widest text-gray-900">{event.type ? `Ficha de ${event.type}` : "Ficha de Atendimento"}</h1>
                        <p className="text-lg text-gray-600 font-semibold mt-1">Ref: {event.id.substring(0, 8).toUpperCase()}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        <div className="text-xl font-bold text-gray-900 uppercase">{company?.tradingName || company?.name || "Sua Empresa"}</div>
                        <div className="text-sm text-gray-600 mt-1">
                            {company?.document && <span>CNPJ/CPF: {company.document}<br /></span>}
                            {company?.address && <span>{company.address}{company.number ? `, ${company.number}` : ""}</span>}
                            {company?.city && <span> - {company.city}/{company.state}</span>}
                        </div>
                        <div className="text-sm text-gray-600">
                            {company?.phone && <span>Fone: {company.phone}</span>}
                            {company?.email && <span> | E-mail: {company.email}</span>}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-10">
                    {/* Dados do Cliente */}
                    <div>
                        <h3 className="text-sm uppercase font-bold text-gray-400 tracking-widest border-b border-gray-200 pb-2 mb-3">Dados do Cliente</h3>
                        <div className="space-y-1 text-base text-gray-900">
                            <p><span className="font-bold">Nome:</span> {event.customerName || event.customer?.name || "Não Informado"}</p>
                            <p><span className="font-bold">Telefone:</span> {event.customer?.phone || "Não Informado"}</p>
                            <p><span className="font-bold">E-mail:</span> {event.customer?.email || "Não Informado"}</p>
                            {event.isLocal && event.location && (
                                <p className="mt-3"><span className="font-bold">Endereço de Atendimento:</span><br />
                                    {event.location.split(" | ").map((ln, idx) => <span key={idx} className="block">{ln}</span>)}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Dados do Agendamento */}
                    <div>
                        <h3 className="text-sm uppercase font-bold text-gray-400 tracking-widest border-b border-gray-200 pb-2 mb-3">Dados do Agendamento</h3>
                        <div className="space-y-2 text-base text-gray-900 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <p><span className="font-bold">Serviço/Título:</span> {event.title}</p>
                            <p><span className="font-bold">Tipo:</span> {event.type}</p>
                            <p><span className="font-bold">Data:</span> {format(new Date(event.startDate), "dd/MM/yyyy")}</p>
                            <p><span className="font-bold">Início:</span> {format(new Date(event.startDate), "HH:mm")} <span className="font-bold ml-4">Fim Estimado:</span> {format(new Date(event.endDate), "HH:mm")}</p>
                            <p className="mt-2 text-sm font-semibold text-blue-800">
                                {event.isLocal ? "📌 ATENDIMENTO EXTERNO (No Local do Cliente)" : "🏠 ATENDIMENTO INTERNO (Na Empresa)"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Resumo (Produtos, Serviços, Orçamento) */}
                <div className="mb-12">
                    <h3 className="text-sm uppercase font-bold text-gray-400 tracking-widest border-b border-gray-200 pb-2 mb-4">Resumo do Agendamento</h3>

                    {event.service && (
                        <div className="mb-4">
                            <p className="font-bold text-gray-900">Serviço Agendado:</p>
                            <p className="text-gray-700 bg-gray-50 p-3 rounded">{event.service.name}</p>
                        </div>
                    )}

                    {event.product && (
                        <div className="mb-4">
                            <p className="font-bold text-gray-900">Produto Relacionado:</p>
                            <p className="text-gray-700 bg-gray-50 p-3 rounded">{event.product.name}</p>
                        </div>
                    )}

                    {event.quote && (
                        <div className="mt-6">
                            <h4 className="font-bold text-gray-900 mb-2">Detalhes do Orçamento Incluído (Ref. #{String(event.quote.number).padStart(4, "0")})</h4>
                            <table className="w-full text-sm text-left text-gray-600 border border-gray-200">
                                <thead className="bg-gray-100 text-gray-900 uppercase">
                                    <tr>
                                        <th className="px-4 py-3 border-b">Descrição</th>
                                        <th className="px-4 py-3 border-b text-center">Qtd</th>
                                        <th className="px-4 py-3 border-b text-right">Preço Un.</th>
                                        <th className="px-4 py-3 border-b text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(event.quote as any).items?.map((item: any) => (
                                        <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                {item.description}
                                                {(item.product || item.service) && (
                                                    <span className="block text-xs text-gray-400">
                                                        {item.product?.name || item.service?.name}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right">
                                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(item.unitPrice))}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">
                                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(item.totalPrice))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="flex justify-end mt-4">
                                <div className="w-64 space-y-2">
                                    {Number(event.quote.discount) > 0 && (
                                        <div className="flex justify-between text-gray-600 border-b border-gray-100 pb-2">
                                            <span>Desconto:</span>
                                            <span>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(event.quote.discount))}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold text-lg text-gray-900 pt-1">
                                        <span>Total Orçado:</span>
                                        <span>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(event.quote.totalAmount))}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Detalhes de Pagamento e Observações do Orçamento */}
                            <div className="mt-8 flex flex-col gap-6">
                                {(event.quote.paymentMethod || event.quote.paymentType || event.quote.installments) && (
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <h4 className="font-semibold text-gray-900 mb-2">Condições de Pagamento</h4>
                                        <div className="text-sm text-gray-700">
                                            <span className="font-medium mr-2">{event.quote.paymentMethod || "Não especificado"}:</span>
                                            {event.quote.paymentType === "INSTALLMENT" && event.quote.installments
                                                ? `${event.quote.installments}x de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(event.quote.totalAmount) / event.quote.installments)}`
                                                : "À vista"
                                            }
                                        </div>
                                    </div>
                                )}

                                {event.quote.notes && (
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <h4 className="font-semibold text-gray-900 mb-2">Observações do Orçamento</h4>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.quote.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!event.service && !event.product && !event.quote && (
                        <p className="text-gray-500 italic">Este agendamento não possui serviços, produtos ou orçamentos atrelados para detalhar no resumo.</p>
                    )}
                </div>

                {/* Assinaturas */}
                <div className="pt-24 mt-10 grid grid-cols-2 gap-20">
                    <div className="text-center">
                        <div className="border-t-2 border-gray-800 w-full mb-3 mx-auto"></div>
                        <p className="text-sm text-gray-800 font-bold uppercase">Assinatura do Prestador</p>
                        <p className="text-xs text-gray-500 mt-1">Empresa: {company?.tradingName || company?.name}</p>
                    </div>
                    <div className="text-center">
                        <div className="border-t-2 border-gray-800 w-full mb-3 mx-auto"></div>
                        <p className="text-sm text-gray-800 font-bold uppercase">Assinatura do Cliente</p>
                        <p className="text-xs text-gray-500 mt-1">({event.customerName || event.customer?.name || "Preenchimento Manual"})</p>
                    </div>
                </div>

                {/* Rodapé Opcional */}
                <div className="text-center mt-12 pt-4 text-xs text-gray-400 border-t border-gray-100">
                    Documento auxiliar de registro. Ref: {event.id.substring(0, 8).toUpperCase()} gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
                </div>

            </div>
        </div>
    )
}
