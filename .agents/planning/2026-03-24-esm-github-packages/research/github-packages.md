# GitHub Packages Publishing

## Key Findings

### Workflow Trigger
```yaml
on:
  release:
    types: [published]
```
- `published` is preferred over `created` — covers both releases and pre-releases

### Authentication
- Use built-in `GITHUB_TOKEN` (no extra secrets needed)
- Required permissions:
  ```yaml
  permissions:
    contents: read
    packages: write
  ```
- Pass as: `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`

### Package Configuration
- **Scoped name required:** `@oscarhermoso/magic-card-parser`
- **publishConfig in package.json:**
  ```json
  {
    "publishConfig": {
      "registry": "https://npm.pkg.github.com/"
    }
  }
  ```
- Or use `.npmrc`: `@oscarhermoso:registry=https://npm.pkg.github.com/`

### Consumer Installation
Consumers need a `.npmrc` with:
```
@oscarhermoso:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=THEIR_GITHUB_TOKEN
```
Then: `npm install @oscarhermoso/magic-card-parser`

**Note:** Even public GitHub Packages require authentication to install.

### Workflow Steps
1. Checkout code
2. Setup Node.js with `registry-url: https://npm.pkg.github.com`
3. `npm ci`
4. Build
5. `npm publish`
