// Constantes de métodos de pagamento e labels (compartilhadas entre server e client)

export const METODOS_PAGAMENTO = [
    "DEBITO",
    "CREDITO_1X",
    "CREDITO_2X",
    "CREDITO_3X",
    "CREDITO_4X",
    "CREDITO_5X",
    "CREDITO_6X",
    "CREDITO_7X",
    "CREDITO_8X",
    "CREDITO_9X",
    "CREDITO_10X",
    "CREDITO_11X",
    "CREDITO_12X",
    "VOUCHER",
    "PIX",
] as const

export type MetodoPagamento = (typeof METODOS_PAGAMENTO)[number]

export const METODO_LABELS: Record<string, string> = {
    DEBITO: "Débito",
    CREDITO_1X: "Crédito 1x",
    CREDITO_2X: "Crédito 2x",
    CREDITO_3X: "Crédito 3x",
    CREDITO_4X: "Crédito 4x",
    CREDITO_5X: "Crédito 5x",
    CREDITO_6X: "Crédito 6x",
    CREDITO_7X: "Crédito 7x",
    CREDITO_8X: "Crédito 8x",
    CREDITO_9X: "Crédito 9x",
    CREDITO_10X: "Crédito 10x",
    CREDITO_11X: "Crédito 11x",
    CREDITO_12X: "Crédito 12x",
    VOUCHER: "Voucher",
    PIX: "PIX",
}

// Taxas padrão sugeridas (o lojista pode alterar)
export const TAXAS_PADRAO: Record<string, number> = {
    DEBITO: 0.0199,
    CREDITO_1X: 0.0349,
    CREDITO_2X: 0.0449,
    CREDITO_3X: 0.0499,
    CREDITO_4X: 0.0549,
    CREDITO_5X: 0.0599,
    CREDITO_6X: 0.0649,
    CREDITO_7X: 0.0699,
    CREDITO_8X: 0.0749,
    CREDITO_9X: 0.0799,
    CREDITO_10X: 0.0849,
    CREDITO_11X: 0.0899,
    CREDITO_12X: 0.0949,
    VOUCHER: 0.0349,
    PIX: 0.0099,
}
