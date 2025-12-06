# CI/CD Workflows

This project uses GitHub Actions for automated testing, building, and deployment.

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Pull requests to `main` branch
- Pushes to feature branches (not `main`)
- Manual workflow dispatch

**Jobs:**

#### Lint & Type Check
- Runs TypeScript compilation check (`tsc --noEmit`)
- Ensures code has no type errors
- Fast feedback on type safety

#### Build
- Builds the project with production settings
- Uploads build artifacts for verification
- Ensures the project can be successfully built

#### Validate Events
- Runs event JSON validation (`npm run validate:events`)
- Checks event data structure and integrity
- Ensures all events have valid schema

#### Security Check
- Runs `npm audit` to check for vulnerabilities
- Warns about potential security issues
- Does not fail the build (continues on error)

#### CI Success
- Final check that all jobs passed
- Required status check for PR merging
- Fails if any critical check fails

**Features:**
- ✅ Automatic cancellation of outdated runs
- ✅ Parallel job execution for faster feedback
- ✅ Build artifact upload for debugging
- ✅ Clear success/failure indication

### 2. Deploy Workflow (`.github/workflows/deploy.yml`)

**Triggers:**
- Pushes to `main` branch
- Manual workflow dispatch

**Jobs:**
- Builds the project
- Deploys to GitHub Pages

## Using the CI System

### For Developers

#### Run checks locally before pushing:

```bash
# Run all CI checks
npm run ci

# Or run individual checks
npm run lint          # TypeScript type check
npm run build         # Build the project
npm run validate:events  # Validate event data
npm test              # Run typecheck + event validation
```

#### Before creating a PR:

1. Run `npm run ci` to ensure all checks pass
2. Fix any errors or warnings
3. Push your changes
4. CI will run automatically on the PR

#### While developing:

1. Use `npm run typecheck` for quick type checking
2. Use `npm run validate:events` after modifying events
3. Use `npm run build` to test production build

### For PR Reviewers

- CI status is shown on each PR
- All checks must pass before merging
- Click "Details" on failed checks to see error logs
- Review build artifacts if needed

### For Feature Implementations

The CI system is designed to be easy to extend:

#### Adding New Validation Steps

1. Add a new script to `package.json`:
   ```json
   "scripts": {
     "validate:maps": "node utils/validate-maps.cjs"
   }
   ```

2. Add a new job to `.github/workflows/ci.yml`:
   ```yaml
   validate-maps:
     name: Validate Maps
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4
       - uses: actions/setup-node@v4
         with:
           node-version: 20
           cache: 'npm'
       - run: npm ci
       - run: npm run validate:maps
   ```

3. Update the `ci-success` job to require the new check:
   ```yaml
   needs: [lint, build, validate-events, validate-maps, security]
   ```

#### Adding Test Framework

When adding tests (e.g., Jest, Vitest):

1. Install test dependencies:
   ```bash
   npm install -D vitest
   ```

2. Add test script to `package.json`:
   ```json
   "scripts": {
     "test:unit": "vitest run"
   }
   ```

3. Add test job to CI workflow:
   ```yaml
   test:
     name: Unit Tests
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4
       - uses: actions/setup-node@v4
         with:
           node-version: 20
           cache: 'npm'
       - run: npm ci
       - run: npm run test:unit
   ```

#### Adding Linters

To add ESLint or other linters:

1. Install linter:
   ```bash
   npm install -D eslint
   ```

2. Add lint script:
   ```json
   "scripts": {
     "lint:eslint": "eslint src/"
   }
   ```

3. Update the lint job in CI or add a separate job

## Branch Protection Rules

Recommended branch protection for `main`:

1. Go to Repository Settings → Branches
2. Add rule for `main` branch:
   - ✅ Require status checks to pass before merging
   - Select: `CI Success`
   - ✅ Require branches to be up to date before merging
   - ✅ Require pull request reviews before merging (optional)

This ensures:
- No direct pushes to `main`
- All PRs must pass CI checks
- Code review process is enforced

## Troubleshooting

### CI Fails on TypeScript Check

```bash
# Run locally to see errors
npm run typecheck

# Common fixes:
# - Add missing type annotations
# - Fix type errors shown in output
# - Ensure all imports are correct
```

### CI Fails on Build

```bash
# Run locally
npm run build

# Common fixes:
# - Check for syntax errors
# - Ensure all dependencies are installed
# - Review build output for specific errors
```

### CI Fails on Event Validation

```bash
# Run locally
npm run validate:events

# Common fixes:
# - Fix JSON syntax errors in public/data/events.json
# - Ensure all event IDs are unique
# - Check that all required fields are present
# - Verify event references in pools
```

### Workflow Doesn't Trigger

- Check that you're pushing to a feature branch (not `main`)
- For PRs, ensure target branch is `main`
- Check workflow file syntax at `.github/workflows/ci.yml`

## Workflow Status Badges

Add CI status badge to README.md:

```markdown
![CI](https://github.com/polsala/Depths-of-the-Fractured-Mind/actions/workflows/ci.yml/badge.svg)
```

## Future Enhancements

Potential additions to the CI system:

- [ ] Code coverage reporting
- [ ] Performance benchmarks
- [ ] Visual regression testing
- [ ] Automated dependency updates (Dependabot)
- [ ] Automated changelog generation
- [ ] Release automation
- [ ] E2E testing with Playwright
- [ ] Bundle size tracking

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
