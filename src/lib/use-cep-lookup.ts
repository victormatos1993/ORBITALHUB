"use client"

import { useState, useCallback } from "react"

interface ViaCepResponse {
    cep: string
    logradouro: string
    complemento: string
    bairro: string
    localidade: string
    uf: string
    erro?: boolean
}

interface CepResult {
    address: string
    neighborhood: string
    city: string
    state: string
    complement: string
}

export function useCepLookup() {
    const [isSearching, setIsSearching] = useState(false)

    const fetchAddress = useCallback(async (cep: string): Promise<CepResult | null> => {
        // Remove non-digits
        const cleanCep = cep.replace(/\D/g, "")

        // Only search when we have exactly 8 digits
        if (cleanCep.length !== 8) return null

        setIsSearching(true)
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
            const data: ViaCepResponse = await response.json()

            if (data.erro) {
                return null
            }

            return {
                address: data.logradouro || "",
                neighborhood: data.bairro || "",
                city: data.localidade || "",
                state: data.uf || "",
                complement: data.complemento || "",
            }
        } catch {
            return null
        } finally {
            setIsSearching(false)
        }
    }, [])

    return { fetchAddress, isSearching }
}
