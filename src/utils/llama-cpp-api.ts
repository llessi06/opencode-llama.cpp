import type {LlamaCppModel, LlamaCppModelsResponse} from '../types'

const DEFAULT_LLAMA_CPP_URL = "http://127.0.0.1:1234"
const LLAMA_CPP_MODELS_ENDPOINT = "/v1/models"

// Normalize base URL to ensure consistent format
export function normalizeBaseURL(baseURL: string = DEFAULT_LLAMA_CPP_URL): string {
    // Remove trailing slash
    let normalized = baseURL.replace(/\/+$/, '')

    // Remove /v1 suffix if present
    if (normalized.endsWith('/v1')) {
        normalized = normalized.slice(0, -3)
    }

    return normalized
}

// Build full API URL with endpoint
export function buildAPIURL(baseURL: string, endpoint: string = LLAMA_CPP_MODELS_ENDPOINT): string {
    const normalized = normalizeBaseURL(baseURL)
    return `${normalized}${endpoint}`
}

// Check if llama.cpp is accessible
export async function checkLlamaCppHealth(baseURL: string = DEFAULT_LLAMA_CPP_URL): Promise<boolean> {
    try {
        const url = buildAPIURL(baseURL)
        const response = await fetch(url, {
            method: "GET",
            signal: AbortSignal.timeout(3000),
        })
        return response.ok
    } catch {
        return false
    }
}

// Discover models from llama.cpp API
export async function discoverLlamaCppModels(baseURL: string = DEFAULT_LLAMA_CPP_URL): Promise<LlamaCppModel[]> {
    try {
        const url = buildAPIURL(baseURL)
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(3000),
        })

        if (!response.ok) {
            return []
        }

        const data = (await response.json()) as LlamaCppModelsResponse
        return data.data ?? []
    } catch (error) {
        throw new Error(`Failed to discover models: ${error instanceof Error ? error.message : String(error)}`)
    }
}

// Get currently loaded/active models from llama.cpp (bypass cache)
export async function fetchLlamaCppModelsDirect(baseURL: string = DEFAULT_LLAMA_CPP_URL): Promise<string[]> {
    try {
        const url = buildAPIURL(baseURL)
        const response = await fetch(url, {
            method: "GET",
            signal: AbortSignal.timeout(3000),
        })
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = (await response.json()) as LlamaCppModelsResponse
        return data.data?.map((model: LlamaCppModel) => model.id) || []
    } catch {
        return []
    }
}

// Auto-detect llama.cpp if not configured
export async function autoDetectLlamaCpp(): Promise<string | null> {
    const commonPorts = [1234, 8080, 11434]
    for (const port of commonPorts) {
        const baseURL = `http://127.0.0.1:${port}`
        const isHealthy = await checkLlamaCppHealth(baseURL)
        if (isHealthy) {
            return baseURL
        }
    }
    return null
}