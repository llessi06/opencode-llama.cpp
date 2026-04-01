# opencode-llama-cpp

OpenCode plugin for enhanced llama.cpp support with auto-detection and dynamic model discovery.

## Features

- **Auto-detection**: Automatically detects llama.cpp server running on common ports (1234, 8080, 11434)
- **Dynamic Model Discovery**: Queries llama.cpp's `/v1/models` endpoint to discover available models
- **Smart Model Formatting**: Automatically formats model names for better readability (e.g., "Qwen3 30B A3B" instead of "qwen/qwen3-30b-a3b")
- **Organization Owner Extraction**: Extracts and sets `organizationOwner` field from model IDs
- **Health Check Monitoring**: Verifies llama.cpp server is accessible before attempting operations
- **Automatic Configuration**: Auto-creates `llama.cpp` provider if detected but not configured
- **Model Merging**: Intelligently merges discovered models with existing configuration
- **Comprehensive Caching**: Reduces API calls with intelligent caching system
- **Error Handling**: Smart error categorization with auto-fix suggestions

## Installation

```bash
pnpm add opencode-llama.cpp@latest
```

## Usage

Add the plugin to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-plugin-llama.cpp@latest"
  ],
  "provider": {
    "llama.cpp": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "llama.cpp (local)",
      "options": {
        "baseURL": "http://127.0.0.1:1234/v1"
      }
    }
  }
}
```

### Auto-detection

If you don't configure the `llama.cpp` provider, the plugin will automatically detect llama.cpp server if it's running on one of the common ports and create the provider configuration for you.

### Manual Configuration

You can also manually configure the provider with specific models:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-plugin-llama.cpp@latest"
  ],
  "provider": {
    "llama.cpp": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "llama.cpp (local)",
      "options": {
        "baseURL": "http://127.0.0.1:1234/v1"
      },
      "models": {
        "google/gemma-3n-e4b": {
          "name": "Gemma 3n-e4b (local)"
        }
      }
    }
  }
}
```

The plugin will automatically discover and add any additional models available in llama.cpp that aren't already configured.

## How It Works

1. On OpenCode startup, the plugin's `config` hook is called
2. If a `llama.cpp` provider is found, it checks if llama.cpp server is accessible
3. If not configured, it attempts to auto-detect llama.cpp server on common ports
4. If accessible, it queries the `/v1/models` endpoint
5. Discovered models are merged into your configuration
6. The enhanced configuration is used for the current session

## Requirements

- OpenCode with plugin support
- llama.cpp server running locally (default port: 1234)
- llama.cpp server API accessible at `http://127.0.0.1:1234/v1`

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

