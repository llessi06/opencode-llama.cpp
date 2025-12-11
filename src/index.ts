import type { Plugin } from "@opencode-ai/plugin"

const DEFAULT_LM_STUDIO_URL = "http://127.0.0.1:1234"
const LM_STUDIO_MODELS_ENDPOINT = "/v1/models"

interface LMStudioModel {
  id: string
  object: string
  created: number
  owned_by: string
}

interface LMStudioModelsResponse {
  object: string
  data: LMStudioModel[]
}

// Simple logging utility for standalone plugin
const log = {
  info: (message: string, data?: Record<string, any>) => {
    if (typeof console !== "undefined" && console.log) {
      console.log(`[opencode-lmstudio] ${message}`, data || "")
    }
  },
  warn: (message: string, data?: Record<string, any>) => {
    if (typeof console !== "undefined" && console.warn) {
      console.warn(`[opencode-lmstudio] ${message}`, data || "")
    }
  },
}

/**
 * LM Studio Plugin
 * 
 * Enhances LM Studio support with:
 * - Auto-detection of running LM Studio instance
 * - Dynamic model discovery from LM Studio API
 * - Health check monitoring
 * - Better integration with LM Studio's model management
 */
export const LMStudioPlugin: Plugin = async ({ $, directory }) => {
  log.info("LM Studio plugin initialized")

  // Check if LM Studio is running and discover models
  async function discoverLMStudioModels(baseURL: string = DEFAULT_LM_STUDIO_URL): Promise<LMStudioModel[]> {
    try {
      const url = `${baseURL}${LM_STUDIO_MODELS_ENDPOINT}`
      log.info("Discovering LM Studio models", { url })
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(2000), // 2 second timeout
      })

      if (!response.ok) {
        log.warn("LM Studio models endpoint not available", { status: response.status })
        return []
      }

      const data = (await response.json()) as LMStudioModelsResponse
      log.info("Discovered LM Studio models", { count: data.data?.length ?? 0 })
      return data.data ?? []
    } catch (error) {
      log.warn("Failed to discover LM Studio models", { 
        error: error instanceof Error ? error.message : String(error) 
      })
      return []
    }
  }

  // Check if LM Studio is accessible
  async function checkLMStudioHealth(baseURL: string = DEFAULT_LM_STUDIO_URL): Promise<boolean> {
    try {
      const url = `${baseURL}${LM_STUDIO_MODELS_ENDPOINT}`
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  // Auto-detect LM Studio if not configured
  async function autoDetectLMStudio(): Promise<string | null> {
    const commonPorts = [1234, 8080, 11434]
    for (const port of commonPorts) {
      const baseURL = `http://127.0.0.1:${port}`
      const isHealthy = await checkLMStudioHealth(baseURL)
      if (isHealthy) {
        log.info("Auto-detected LM Studio", { baseURL })
        return baseURL
      }
    }
    return null
  }

  // Enhance config with discovered models
  async function enhanceConfig(config: any) {
    let lmstudioProvider = config.provider?.lmstudio
    let baseURL: string

    // If lmstudio provider exists, use its baseURL
    if (lmstudioProvider) {
      baseURL = lmstudioProvider.options?.baseURL || DEFAULT_LM_STUDIO_URL
      // Remove /v1 suffix if present for health check
      if (baseURL.includes("/v1")) {
        baseURL = baseURL.replace(/\/v1\/?$/, "")
      }
    } else {
      // Try to auto-detect LM Studio
      const detectedURL = await autoDetectLMStudio()
      if (!detectedURL) {
        return // No LM Studio found
      }
      
      // Auto-create lmstudio provider if detected
      baseURL = detectedURL
      if (!config.provider) {
        config.provider = {}
      }
      config.provider.lmstudio = {
        npm: "@ai-sdk/openai-compatible",
        name: "LM Studio (local)",
        options: {
          baseURL: `${baseURL}/v1`,
        },
        models: {},
      }
      lmstudioProvider = config.provider.lmstudio
      log.info("Auto-configured LM Studio provider", { baseURL: `${baseURL}/v1` })
    }

    // Normalize baseURL (remove /v1 if present, we'll add it back)
    // Handle both http://127.0.0.1:1234/v1 and http://127.0.0.1:1234 formats
    let normalizedBaseURL = baseURL
    if (normalizedBaseURL.includes("/v1")) {
      normalizedBaseURL = normalizedBaseURL.replace(/\/v1\/?$/, "")
    }

    // Check health first
    const isHealthy = await checkLMStudioHealth(normalizedBaseURL)
    if (!isHealthy) {
      log.warn("LM Studio appears to be offline", { baseURL: normalizedBaseURL })
      return
    }

    // Try to discover models from LM Studio API
    const models = await discoverLMStudioModels(normalizedBaseURL)
    
    if (models.length > 0) {
      // Merge discovered models with configured models
      const existingModels = lmstudioProvider.models || {}
      const discoveredModels: Record<string, any> = {}

      for (const model of models) {
        // Use model ID as key, or create a sanitized version
        const modelKey = model.id.replace(/[^a-zA-Z0-9_-]/g, "_")
        
        // Only add if not already configured
        if (!existingModels[modelKey] && !existingModels[model.id]) {
          discoveredModels[modelKey] = {
            id: model.id,
            name: model.id,
          }
        }
      }

      // Merge discovered models into config
      if (Object.keys(discoveredModels).length > 0) {
        config.provider.lmstudio.models = {
          ...existingModels,
          ...discoveredModels,
        }
        log.info("Added discovered LM Studio models to config", { 
          count: Object.keys(discoveredModels).length 
        })
      }
    }
  }

  return {
    config: async (config) => {
      await enhanceConfig(config)
    },
    
    event: async ({ event }) => {
      // Monitor for session events to provide LM Studio status
      if (event.type === "session.created" || event.type === "session.updated") {
        // Could add health check monitoring here in the future
      }
    },
  }
}

