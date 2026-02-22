"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface OverviewChartProps extends React.HTMLAttributes<HTMLDivElement> {
    data: { name: string; income: number; expense: number }[]
}

export function OverviewChart({ className, data }: OverviewChartProps) {
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>Fluxo de Caixa (Últimos 6 meses)</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data}>
                        <XAxis
                            dataKey="name"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `R$${value}`}
                        />
                        <Tooltip
                            formatter={(value: number | undefined) => {
                                if (value === undefined) return 'R$ 0,00'
                                return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
                            }}
                            labelStyle={{ color: 'black' }}
                        />
                        <Bar
                            dataKey="income"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                            name="Receitas"
                        />
                        <Bar
                            dataKey="expense"
                            fill="#ef4444"
                            radius={[4, 4, 0, 0]}
                            name="Despesas"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
