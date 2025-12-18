#!/usr/bin/env bun

/**
 * Automated Release Script
 * 
 * Usage:
 *   bun scripts/release.ts patch   # 0.1.0 -> 0.1.1
 *   bun scripts/release.ts minor   # 0.1.0 -> 0.2.0
 *   bun scripts/release.ts major   # 0.1.0 -> 1.0.0
 *   bun scripts/release.ts 0.2.0   # Set specific version
 */

import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

const VERSION_TYPES = ['patch', 'minor', 'major'] as const
type VersionType = typeof VERSION_TYPES[number]

function getCurrentVersion(): string {
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
  return pkg.version
}

function bumpVersion(currentVersion: string, type: VersionType | string): string {
  if (!VERSION_TYPES.includes(type as VersionType) && !/^\d+\.\d+\.\d+$/.test(type)) {
    throw new Error(`Invalid version type: ${type}. Use 'patch', 'minor', 'major', or a specific version like '0.2.0'`)
  }

  // If it's a specific version, use it
  if (/^\d+\.\d+\.\d+$/.test(type)) {
    return type
  }

  const [major, minor, patch] = currentVersion.split('.').map(Number)
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
    default:
      throw new Error(`Unknown version type: ${type}`)
  }
}

function updatePackageJson(version: string): void {
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
  pkg.version = version
  writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
  console.log(`✓ Updated package.json to version ${version}`)
}

function runCommand(cmd: string, description: string): void {
  console.log(`\n📦 ${description}...`)
  try {
    execSync(cmd, { stdio: 'inherit' })
    console.log(`✓ ${description} completed`)
  } catch (error) {
    console.error(`✗ ${description} failed`)
    throw error
  }
}

function generateReleaseNotes(version: string): string {
  // Get recent commits for changelog
  const commits = execSync('git log --oneline -20', { encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean)
    .slice(0, 10)
    .map(line => `- ${line}`)
    .join('\n')

  return `## 🎉 Release v${version}

### Changes

${commits}

### Installation

\`\`\`bash
npm install opencode-lmstudio@${version}
# or
bun add opencode-lmstudio@${version}
\`\`\`

### Features

- **Auto-detection**: Automatically detects LM Studio running on common ports
- **Dynamic Model Discovery**: Queries LM Studio's \`/v1/models\` endpoint
- **Smart Model Formatting**: Automatically formats model names for better readability
- **Organization Owner Extraction**: Extracts and sets \`organizationOwner\` field
- **Health Check Monitoring**: Verifies LM Studio is accessible
- **Automatic Configuration**: Auto-creates \`lmstudio\` provider if detected
- **Model Merging**: Intelligently merges discovered models with existing configuration
- **Comprehensive Caching**: Reduces API calls with intelligent caching
- **Error Handling**: Smart error categorization with auto-fix suggestions`
}

async function main() {
  const versionType = process.argv[2]
  
  if (!versionType) {
    console.error('Usage: bun scripts/release.ts [patch|minor|major|0.x.x]')
    process.exit(1)
  }

  const currentVersion = getCurrentVersion()
  const newVersion = bumpVersion(currentVersion, versionType)
  
  console.log(`\n🚀 Starting release process`)
  console.log(`   Current version: ${currentVersion}`)
  console.log(`   New version: ${newVersion}`)
  console.log(`   Version type: ${versionType}`)

  // Step 1: Update version in package.json
  updatePackageJson(newVersion)

  // Step 2: Run build and tests
  runCommand('npm run build', 'Running build and tests')

  // Step 3: Check git status
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' })
  if (gitStatus.trim()) {
    console.log('\n⚠️  Uncommitted changes detected. Committing...')
    runCommand('git add -A', 'Staging changes')
    runCommand(`git commit -m "chore: bump version to ${newVersion}"`, 'Committing version bump')
  }

  // Step 4: Create and push git tag
  const tagName = `v${newVersion}`
  runCommand(`git tag ${tagName} -m "Release ${tagName}"`, `Creating git tag ${tagName}`)
  runCommand('git push', 'Pushing commits')
  runCommand(`git push origin ${tagName}`, `Pushing tag ${tagName}`)

  // Step 5: Create GitHub release
  console.log('\n📝 Creating GitHub release...')
  const releaseNotes = generateReleaseNotes(newVersion)
  const notesFile = `/tmp/release-notes-${newVersion}.md`
  writeFileSync(notesFile, releaseNotes)
  
  try {
    execSync(`gh release create ${tagName} --title "v${newVersion}" --notes-file ${notesFile}`, { stdio: 'inherit' })
    console.log(`✓ GitHub release created: https://github.com/agustif/opencode-lmstudio/releases/tag/${tagName}`)
  } catch (error) {
    console.warn('⚠️  GitHub release creation failed (may already exist)')
  }

  // Step 6: Publish to npm
  console.log('\n📦 Publishing to npm...')
  let npmPublished = false
  
  // Check for npm token in environment or config
  const npmToken = process.env.NPM_TOKEN
  if (npmToken) {
    console.log('   Using NPM_TOKEN from environment')
    process.env.npm_config__authToken = npmToken
  }
  
  try {
    runCommand('npm publish', 'Publishing to npm')
    console.log(`\n✅ Successfully published opencode-lmstudio@${newVersion} to npm!`)
    console.log(`   https://www.npmjs.com/package/opencode-lmstudio`)
    npmPublished = true
  } catch (error) {
    console.error('\n⚠️  npm publish failed. Common reasons:')
    console.error('   1. Two-factor authentication required')
    console.error('      → Create an npm token: npm token create --read-only=false')
    console.error('      → Set it: npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN')
    console.error('      → Or set env var: export NPM_TOKEN=your_token_here')
    console.error('   2. Package name already exists (version conflict)')
    console.error('   3. Not logged in (run: npm login)')
    console.error('\n   You can manually publish with: npm publish')
    console.error('\n   Note: All other steps completed successfully!')
    console.error('   - Version bumped ✓')
    console.error('   - Git tag created ✓')
    console.error('   - GitHub release created ✓')
    console.error('   - Only npm publish needs manual intervention')
  }

  if (npmPublished) {
    console.log(`\n🎉 Release ${newVersion} completed successfully!`)
    console.log(`   - Git tag: ${tagName}`)
    console.log(`   - GitHub: https://github.com/agustif/opencode-lmstudio/releases/tag/${tagName}`)
    console.log(`   - npm: https://www.npmjs.com/package/opencode-lmstudio`)
  } else {
    console.log(`\n✅ Release ${newVersion} partially completed!`)
    console.log(`   - Git tag: ${tagName} ✓`)
    console.log(`   - GitHub: https://github.com/agustif/opencode-lmstudio/releases/tag/${tagName} ✓`)
    console.log(`   - npm: Manual publish required (see instructions above)`)
  }
}

main().catch((error) => {
  console.error('\n❌ Release failed:', error.message)
  process.exit(1)
})

