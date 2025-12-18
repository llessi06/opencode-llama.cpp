# Debugging LM Studio Plugin in OpenCode TUI

## How to Debug

When you run OpenCode in TUI mode, check the console output for these log messages:

### Expected Log Sequence

1. `[opencode-lmstudio] LM Studio plugin initialized` - Plugin loaded
2. `[opencode-lmstudio:DEBUG] Config hook called` - Config hook invoked
3. `[opencode-lmstudio:DEBUG] Created provider (quick check)` - Provider created
4. `[opencode-lmstudio:DEBUG] enhanceConfig called` - Model discovery started
5. `[opencode-lmstudio] Discovered LM Studio models` - Models found
6. `[opencode-lmstudio] Added discovered LM Studio models to config` - Models added
7. `[opencode-lmstudio:DEBUG] Config hook returning` - Hook completed

### What to Check

1. **Is the plugin loaded?**
   - Look for: `[opencode-lmstudio] LM Studio plugin initialized`
   - If missing: Plugin not installed or not in config

2. **Is the config hook being called?**
   - Look for: `[opencode-lmstudio:DEBUG] Config hook called`
   - If missing: OpenCode might not be calling the hook

3. **Are models being discovered?**
   - Look for: `[opencode-lmstudio] Discovered LM Studio models { count: X }`
   - If count is 0: LM Studio might not be running or no models available

4. **Are models being added to config?**
   - Look for: `[opencode-lmstudio] Added discovered LM Studio models to config`
   - Check: `modelCount` in the final log message

5. **Is the config frozen?**
   - Look for: `configFrozen: true` in the debug log
   - If true: OpenCode might be passing a frozen config object

### Common Issues

#### Issue: Models not showing in OpenCode

**Possible causes:**
1. Config hook not being awaited by OpenCode
2. Config object is frozen/read-only
3. OpenCode reads config before hook completes
4. Config object is cloned before hook runs

**Debug steps:**
1. Check console logs for the sequence above
2. Look for warnings about frozen config
3. Check if `modelCount` is 0 in final log
4. Verify LM Studio is running: `curl http://127.0.0.1:1234/v1/models`

#### Issue: Plugin not loading

**Check:**
1. Plugin is in `opencode.json`: `"plugin": ["opencode-lmstudio"]`
2. Plugin is installed: `npm list opencode-lmstudio`
3. No errors in OpenCode startup logs

#### Issue: LM Studio not detected

**Check:**
1. LM Studio is running
2. Server is active (green indicator in LM Studio)
3. Port is correct (default: 1234)
4. Try: `curl http://127.0.0.1:1234/v1/models`

### Manual Test

Run this to test the plugin directly:

```bash
bun debug-opencode-simulation.ts
```

This simulates how OpenCode calls the plugin and shows if models are loaded correctly.

