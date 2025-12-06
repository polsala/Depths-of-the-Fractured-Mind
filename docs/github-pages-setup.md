# GitHub Pages Setup Instructions

This file contains the one-time setup instructions required to enable GitHub Pages deployment for this repository.

## Prerequisites

You must have admin access to the repository.

## Setup Steps

### 1. Enable GitHub Pages

1. Go to the repository on GitHub: https://github.com/polsala/Depths-of-the-Fractured-Mind
2. Click on **Settings** (in the top navigation)
3. In the left sidebar, click **Pages** (under "Code and automation")
4. Under **Build and deployment**:
   - **Source**: Select **GitHub Actions** from the dropdown
   - This replaces the older "Deploy from a branch" method
5. Save the changes (if a save button appears)

### 2. Verify Workflow Permissions

The workflow needs specific permissions to deploy to GitHub Pages:

1. Go to **Settings** → **Actions** → **General**
2. Scroll down to **Workflow permissions**
3. Ensure one of the following is selected:
   - **Read and write permissions** (recommended), OR
   - **Read repository contents and packages permissions** with "Allow GitHub Actions to create and approve pull requests" enabled

### 3. Merge the Pull Request

Once this PR is merged to the `main` branch:
1. The workflow will automatically trigger
2. It will build the game
3. It will deploy to GitHub Pages

### 4. Monitor the First Deployment

1. Go to the **Actions** tab
2. Look for the "Deploy to GitHub Pages" workflow
3. Watch it complete (should take 1-2 minutes)
4. Once complete, the game will be available at: **https://polsala.github.io/Depths-of-the-Fractured-Mind/**

### 5. Check Deployment Environment (Optional)

1. Go to **Settings** → **Environments**
2. You should see a `github-pages` environment
3. Click on it to see:
   - Deployment history
   - Environment protection rules (if any)
   - Deployment branches configuration

## Troubleshooting

### If the workflow fails with permission errors:

1. Check that GitHub Pages source is set to "GitHub Actions"
2. Verify workflow permissions in Settings → Actions → General
3. Ensure the repository is public OR you have GitHub Pro/Team/Enterprise (private repos need paid plans for Pages)

### If assets don't load (404 errors):

1. Check browser console for error URLs
2. Verify the `base` path in `vite.config.ts` matches the repository name exactly
3. Rebuild and redeploy

### If the page shows 404:

1. Wait a few minutes after the first deployment (GitHub Pages can take time to propagate)
2. Check that the workflow completed successfully
3. Verify GitHub Pages is enabled in Settings → Pages
4. Try accessing the URL in an incognito/private browser window

## What Happens After Setup?

Once configured, the deployment is fully automated:

- **Every push to `main`** → Automatic deployment
- **Pull requests** → No deployment (only when merged to main)
- **Manual trigger** → You can manually run the workflow from the Actions tab

## Security Notes

- The workflow uses `GITHUB_TOKEN` which is automatically provided by GitHub Actions
- No additional secrets or tokens need to be configured
- The workflow has minimal permissions (read contents, write to Pages)
- All builds happen in isolated GitHub Actions runners

## Next Steps

After successful deployment:

1. Visit the live game at the GitHub Pages URL
2. Test the game functionality
3. Share the URL with players
4. Any future commits to `main` will automatically update the deployed version

## Need Help?

If you encounter issues:

1. Check the workflow logs in the Actions tab
2. Review the [deployment documentation](deployment.md)
3. Ensure all prerequisites are met
4. Check GitHub's [Pages documentation](https://docs.github.com/pages) for the latest setup instructions
