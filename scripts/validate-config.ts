#!/usr/bin/env node
/**
 * Validates OpenCode configuration file against JSON schema
 * Usage: node scripts/validate-config.ts [path-to-opencode.json]
 */

import {existsSync, readFileSync} from 'fs'
import {join} from 'path'

const SCHEMA_URL = 'https://opencode.ai/config.json'
const DEFAULT_CONFIG_PATH = join(process.env.HOME || '', '.config/opencode/opencode.json')

async function fetchSchema(): Promise<any> {
    try {
        const response = await fetch(SCHEMA_URL)
        if (!response.ok) {
            throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`)
        }
        return await response.json()
    } catch (error) {
        console.error(`Error fetching schema from ${SCHEMA_URL}:`, error)
        throw error
    }
}

function validateAgainstSchema(config: any, schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Basic structure validation
    if (!config || typeof config !== 'object') {
        errors.push('Config must be an object')
        return {valid: false, errors}
    }

    // Validate plugin array
    if (schema.properties?.plugin) {
        if (config.plugin !== undefined) {
            if (!Array.isArray(config.plugin)) {
                errors.push('plugin must be an array')
            } else {
                config.plugin.forEach((plugin: any, index: number) => {
                    if (typeof plugin !== 'string') {
                        errors.push(`plugin[${index}] must be a string`)
                    }
                })
            }
        }
    }

    // Validate provider structure
    if (schema.properties?.provider) {
        if (config.provider !== undefined) {
            if (typeof config.provider !== 'object' || Array.isArray(config.provider)) {
                errors.push('provider must be an object')
            } else {
                // Validate each provider
                for (const [providerId, providerConfig] of Object.entries(config.provider)) {
                    if (typeof providerId !== 'string') {
                        errors.push(`provider key "${providerId}" must be a string`)
                        continue
                    }

                    const provider = providerConfig as any
                    if (typeof provider !== 'object' || Array.isArray(provider)) {
                        errors.push(`provider.${providerId} must be an object`)
                        continue
                    }

                    // Validate required fields based on schema
                    const providerSchema = schema.properties.provider.additionalProperties
                    if (providerSchema) {
                        // Check npm field
                        if (provider.npm !== undefined && typeof provider.npm !== 'string') {
                            errors.push(`provider.${providerId}.npm must be a string`)
                        }

                        // Check name field
                        if (provider.name !== undefined && typeof provider.name !== 'string') {
                            errors.push(`provider.${providerId}.name must be a string`)
                        }

                        // Check models structure
                        if (provider.models !== undefined) {
                            if (typeof provider.models !== 'object' || Array.isArray(provider.models)) {
                                errors.push(`provider.${providerId}.models must be an object`)
                            } else {
                                // Validate each model
                                for (const [modelId, modelConfig] of Object.entries(provider.models)) {
                                    if (typeof modelId !== 'string') {
                                        errors.push(`provider.${providerId}.models key "${modelId}" must be a string`)
                                        continue
                                    }

                                    const model = modelConfig as any
                                    if (typeof model !== 'object' || Array.isArray(model)) {
                                        errors.push(`provider.${providerId}.models.${modelId} must be an object`)
                                        continue
                                    }

                                    // Validate model fields
                                    if (model.id !== undefined && typeof model.id !== 'string') {
                                        errors.push(`provider.${providerId}.models.${modelId}.id must be a string`)
                                    }
                                    if (model.name !== undefined && typeof model.name !== 'string') {
                                        errors.push(`provider.${providerId}.models.${modelId}.name must be a string`)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Validate $schema reference
    if (config.$schema && typeof config.$schema !== 'string') {
        errors.push('$schema must be a string')
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

async function main() {
    const configPath = process.argv[2] || DEFAULT_CONFIG_PATH

    console.log(`Validating OpenCode config: ${configPath}`)

    // Check if config file exists
    if (!existsSync(configPath)) {
        console.error(`Error: Config file not found at ${configPath}`)
        console.log(`\nUsage: bun scripts/validate-config.ts [path-to-opencode.json]`)
        console.log(`Default path: ${DEFAULT_CONFIG_PATH}`)
        process.exit(1)
    }

    // Read config file
    let config: any
    try {
        const configContent = readFileSync(configPath, 'utf-8')
        config = JSON.parse(configContent)
    } catch (error) {
        console.error(`Error reading config file:`, error)
        process.exit(1)
    }

    // Fetch schema
    console.log(`Fetching schema from ${SCHEMA_URL}...`)
    let schema: any
    try {
        schema = await fetchSchema()
    } catch (error) {
        console.error(`Error fetching schema:`, error)
        process.exit(1)
    }

    // Validate
    console.log('Validating configuration...')
    const result = validateAgainstSchema(config, schema)

    if (result.valid) {
        console.log('✅ Configuration is valid!')

        // Show summary
        if (config.plugin) {
            console.log(`\nPlugins: ${config.plugin.length}`)
            config.plugin.forEach((p: string) => console.log(`  - ${p}`))
        }

        if (config.provider) {
            const providerCount = Object.keys(config.provider).length
            console.log(`\nProviders: ${providerCount}`)
            for (const [id, provider] of Object.entries(config.provider)) {
                const p = provider as any
                const modelCount = p.models ? Object.keys(p.models).length : 0
                console.log(`  - ${id}: ${modelCount} models`)
            }
        }

        process.exit(0)
    } else {
        console.error('❌ Configuration validation failed:')
        result.errors.forEach((error) => {
            console.error(`  - ${error}`)
        })
        process.exit(1)
    }
}

main().catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
})

