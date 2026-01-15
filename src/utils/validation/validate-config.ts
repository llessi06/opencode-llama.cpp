import type {ValidationResult} from './validation-result'

export function validateConfig(config: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!config || typeof config !== 'object') {
        errors.push('Config must be an object')
        return {isValid: false, errors, warnings}
    }

    // Validate provider configuration
    if (config.provider && typeof config.provider === 'object') {
        const llamaCpp = config.provider['llama.cpp']
        if (llamaCpp) {
            if (!llamaCpp.npm) {
                llamaCpp.npm = "@ai-sdk/openai-compatible"
                warnings.push('llama.cpp provider missing npm field, auto-set to @ai-sdk/openai-compatible')
            }
            if (!llamaCpp.name) {
                llamaCpp.name = "llama.cpp (local)"
                warnings.push('llama.cpp provider missing name field, auto-set to "llama.cpp (local)"')
            }
            if (!llamaCpp.options) {
                llamaCpp.options = {}
                warnings.push('llama.cpp provider missing options field, auto-created empty options')
                if (!llamaCpp.options.baseURL) {
                    warnings.push('llama.cpp provider missing baseURL, will use default')
                } else if (typeof llamaCpp.options.baseURL !== 'string') {
                    errors.push('llama.cpp provider baseURL must be a string')
                } else if (!isValidURL(llamaCpp.options.baseURL)) {
                    warnings.push('llama.cpp provider baseURL may be invalid')
                }
            }
            if (llamaCpp.models && typeof llamaCpp.models !== 'object') {
                errors.push('llama.cpp provider models must be an object')
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    }
}

function isValidURL(url: string): boolean {
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

