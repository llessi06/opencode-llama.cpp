# Release Process

This project uses an automated GitHub Actions workflow that handles versioning, testing, git tagging, GitHub releases, and npm publishing.

## Quick Start

Use the GitHub Actions workflow to create releases:

1. Go to: **Actions → Release → Run workflow**
2. Enter version to release (e.g., `patch`, `minor`, `major`, or specific like `0.4.0`)
3. Click "Run workflow"

The workflow will automatically:
- Run tests and build
- Bump version in package.json
- Create git tag
- Push to GitHub
- Create GitHub release with notes
- Publish to npm registry

## What the Release Script Does

1. **Bumps version** in `package.json`
2. **Runs build and tests** to ensure everything works
3. **Creates git tag** (e.g., `v0.1.1`)
4. **Pushes to GitHub** (commits and tags)
5. **Creates GitHub release** with auto-generated release notes
6. **Publishes to npm** (if authentication is configured)

## Prerequisites

### Local Releases

1. **npm authentication** (one of these):
   - Create npm token: `npm token create`
   - Set `NPM_TOKEN` environment variable

2. **GitHub CLI** (`gh`) authenticated:
   - `gh auth login`

### CI/CD Releases (GitHub Actions)

1. Add `NPM_TOKEN` secret to your GitHub repository:
   - Go to: Settings → Secrets and variables → Actions
   - Add secret: `NPM_TOKEN` = (your npm token)

2. Run the workflow:
   - Go to: Actions → Release → Run workflow
   - Select version type (patch/minor/major)
   - Click "Run workflow"

## Version Types

- **patch**: Bug fixes, small improvements (0.1.0 → 0.1.1)
- **minor**: New features, backwards compatible (0.1.0 → 0.2.0)
- **major**: Breaking changes (0.1.0 → 1.0.0)

## Manual Steps (if needed)

If the automated GitHub Actions workflow fails, you can complete it manually:

```bash
# 1. Bump version
pnpm version patch  # or minor, major

# 2. Run tests
pnpm run build

# 3. Create and push tag
git tag v0.1.1
git push origin main
git push origin v0.1.1

# 4. Create GitHub release
gh release create v0.1.1 --title "v0.1.1" --generate-notes

# 5. Publish to pnpm
pnpm publish --access public
```

## Troubleshooting

### Publish fails with authentication error

**Solution**: Create an npm token and use environment variable:
```bash
npm token create
export NPM_TOKEN=your_token_here
```

Then trigger the GitHub Actions workflow to release.

### GitHub release creation fails

**Solution**: Ensure GitHub CLI is authenticated:
```bash
gh auth login
```

### Version already exists

**Solution**: Just bump to the next version in the GitHub Actions workflow input.

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/release.yml`) allows you to create releases from the GitHub UI:

1. Go to Actions tab
2. Select "Release" workflow
3. Click "Run workflow"
4. Choose version type
5. Click "Run workflow" button

The workflow will:
- Run all tests
- Create git tag
- Create GitHub release
- Publish to npm

All automatically! 🚀

