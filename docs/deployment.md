# GitHub Pages Deployment

This document explains how the GitHub Actions workflow deploys the game to GitHub Pages.

## Overview

The game is automatically deployed to GitHub Pages whenever changes are pushed to the `main` branch. The deployment process builds the game using Vite and publishes the static files to GitHub Pages.

## Workflow Configuration

The deployment is handled by the GitHub Actions workflow located at `.github/workflows/deploy.yml`.

### Trigger Events

The workflow is triggered:
- **Automatically** on every push to the `main` branch
- **Manually** via the "Actions" tab using the workflow_dispatch event

### Workflow Steps

#### Build Job
1. **Checkout**: Checks out the repository code
2. **Setup Node**: Installs Node.js 20 with npm caching
3. **Install dependencies**: Runs `npm ci` to install all dependencies
4. **Build**: Runs `npm run build` to compile TypeScript and build the production bundle
5. **Setup Pages**: Configures GitHub Pages settings
6. **Upload artifact**: Uploads the `dist` folder as a deployment artifact

#### Deploy Job
1. **Deploy to GitHub Pages**: Deploys the artifact to GitHub Pages
2. The deployment URL is available as an output

## Configuration Files

### vite.config.ts

The Vite configuration includes the base path setting required for GitHub Pages:

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/Depths-of-the-Fractured-Mind/',
})
```

This ensures all asset paths are correctly prefixed with the repository name.

## Repository Settings

To enable GitHub Pages deployment, the following settings must be configured in the repository:

1. Go to **Settings** → **Pages**
2. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
3. Under **Environments**:
   - A `github-pages` environment should be created automatically
   - This environment will show deployment history and status

## Accessing the Deployed Game

Once deployed, the game will be available at:
```
https://polsala.github.io/Depths-of-the-Fractured-Mind/
```

## Permissions

The workflow requires the following permissions (configured in the workflow file):
- `contents: read` - To read the repository code
- `pages: write` - To deploy to GitHub Pages
- `id-token: write` - For secure deployment authentication

## Deployment Status

You can check the deployment status:
1. Go to the **Actions** tab in the repository
2. Look for the latest "Deploy to GitHub Pages" workflow run
3. Each deployment shows:
   - Build logs
   - Deployment logs
   - The deployed URL

## Troubleshooting

### Build Failures

If the build fails:
1. Check the workflow logs in the Actions tab
2. Verify all dependencies are listed in `package.json`
3. Test the build locally with `npm run build`

### Deployment Failures

If deployment fails:
1. Verify GitHub Pages is enabled in repository settings
2. Check that the workflow has the required permissions
3. Ensure the `dist` folder is being generated correctly

### Assets Not Loading

If assets don't load on the deployed site:
1. Verify the `base` configuration in `vite.config.ts` matches the repository name
2. Check the browser console for 404 errors
3. Ensure all asset paths are relative or use the correct base path

## Manual Deployment

To manually trigger a deployment:
1. Go to the **Actions** tab
2. Select "Deploy to GitHub Pages" workflow
3. Click "Run workflow"
4. Select the `main` branch
5. Click "Run workflow"

## Local Testing

To test the production build locally before deploying:

```bash
# Build the project
npm run build

# Preview the production build
npm run preview
```

The preview server will start at `http://localhost:4173` (or another available port).

## Maintenance

### Updating Node.js Version

To update the Node.js version used in deployments:
1. Edit `.github/workflows/deploy.yml`
2. Update the `node-version` field in the "Setup Node" step
3. Test locally with the new Node.js version before committing

### Updating Workflow Actions

The workflow uses GitHub Actions that may receive updates:
- `actions/checkout@v4`
- `actions/setup-node@v4`
- `actions/configure-pages@v5`
- `actions/upload-pages-artifact@v3`
- `actions/deploy-pages@v4`

Check for newer versions periodically and update as needed.

## Security

The deployment workflow:
- Uses `npm ci` instead of `npm install` for reproducible builds
- Runs in an isolated environment
- Uses GitHub's secure token authentication
- Does not expose any secrets or credentials

## Future Enhancements

Potential improvements to the deployment workflow:
- Add deployment notifications (e.g., Slack, Discord)
- Include automated testing before deployment
- Add staging environment deployments for pull requests
- Implement cache optimization for faster builds
- Add deployment rollback capabilities
