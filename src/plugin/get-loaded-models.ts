import {ModelStatusCache} from '../cache/model-status-cache'
import {fetchLlamaCppModelsDirect} from '../utils/llama-cpp-api'

const modelStatusCache = new ModelStatusCache()

export function getLoadedModels(baseURL: string = "http://127.0.0.1:1234"): Promise<string[]> {
    return modelStatusCache.getModels(baseURL, async () => {
        return await fetchLlamaCppModelsDirect(baseURL)
    })
}

