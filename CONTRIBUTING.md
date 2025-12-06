# Contributing to Depths of the Fractured Mind

Thank you for your interest in contributing! This guide will help you get started with feature development and ensure your contributions can be easily integrated.

## 🚀 Quick Start

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/Depths-of-the-Fractured-Mind.git
cd Depths-of-the-Fractured-Mind

# Add upstream remote
git remote add upstream https://github.com/polsala/Depths-of-the-Fractured-Mind.git
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create a Feature Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a new feature branch
git checkout -b feature/your-feature-name
```

## 🛠️ Development Workflow

### Running the Development Server

```bash
npm run dev
# Opens at http://localhost:5173/Depths-of-the-Fractured-Mind/
```

### Before Committing

Always run these checks before committing:

```bash
# Run all CI checks
npm run ci

# Or run individual checks
npm run typecheck        # TypeScript type checking
npm run build           # Production build
npm run validate:events # Event data validation
npm test               # Quick test (typecheck + events)
```

### Making Changes

1. **Write clean, typed code**
   - Use TypeScript types
   - Follow existing code style
   - Add comments for complex logic

2. **Test your changes**
   - Test in dev mode: `npm run dev`
   - Test production build: `npm run build && npm run preview`
   - Run all checks: `npm run ci`

3. **Update documentation**
   - Update relevant `.md` files
   - Add JSDoc comments for new functions
   - Update event documentation if modifying events

## 📝 Commit Guidelines

### Commit Message Format

```
<type>: <short description>

<optional longer description>

<optional footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat: Add new combat ability system

Implements a flexible ability system allowing characters to have
customizable skills that level up with experience.

- Created ability interface and types
- Added ability resolution logic
- Updated character system to support abilities
```

```
fix: Resolve event trigger condition bug

Event trigger conditions were not properly checking depth requirements.
Fixed comparison logic in procedural.ts.
```

## 🔍 Code Review Process

### Creating a Pull Request

1. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create PR on GitHub**
   - Use the pull request template
   - Fill in all relevant sections
   - Link related issues

3. **CI Checks**
   - All CI checks must pass
   - Fix any failures before requesting review

4. **Address Review Feedback**
   - Make requested changes
   - Push updates to your branch
   - Respond to reviewer comments

### PR Checklist

Before submitting a PR, ensure:

- [ ] All CI checks pass (`npm run ci`)
- [ ] Code is well-documented
- [ ] Changes are tested (manual + automated)
- [ ] Event data is valid (if applicable)
- [ ] No new TypeScript errors
- [ ] Build succeeds
- [ ] Documentation is updated

## 🎯 Feature Development

### Adding New Features

For new features, consider:

1. **Architecture**
   - Does it fit the existing structure?
   - Is it modular and reusable?
   - Does it follow TypeScript best practices?

2. **Data-Driven Design**
   - Can configuration be external (JSON)?
   - Is it easy for designers to modify?
   - Does it support future expansion?

3. **Testing**
   - Can it be validated automatically?
   - Are edge cases handled?
   - Is error handling robust?

### Example: Adding Event Validation

If adding a new validation step:

1. **Create validator**
   ```bash
   touch utils/validate-maps.cjs
   ```

2. **Add script to package.json**
   ```json
   "scripts": {
     "validate:maps": "node utils/validate-maps.cjs"
   }
   ```

3. **Add to CI workflow**
   Edit `.github/workflows/ci.yml`:
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

4. **Update ci-success job**
   ```yaml
   needs: [lint, build, validate-events, validate-maps, security]
   ```

5. **Document in docs/ci-cd.md**

## 📚 Resources

### Project Documentation

- [Design Document](docs/design.md) - Game design specification
- [Event System](docs/event-system.md) - Event system architecture
- [CI/CD Guide](docs/ci-cd.md) - Continuous integration setup

### External Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Vite Documentation](https://vitejs.dev/guide/)
- [GitHub Actions](https://docs.github.com/en/actions)

## 🐛 Reporting Bugs

### Before Reporting

1. Check existing issues
2. Verify it's not a local environment issue
3. Test on the latest version

### Bug Report Template

When reporting bugs, include:

- **Description**: Clear description of the bug
- **Steps to Reproduce**: Detailed steps to reproduce
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: Browser, OS, Node version
- **Screenshots**: If applicable

## 💡 Feature Requests

We welcome feature requests! When suggesting a feature:

1. **Check existing issues** - Has it been suggested?
2. **Describe the use case** - Why is it needed?
3. **Propose a solution** - How might it work?
4. **Consider alternatives** - Other approaches?

## 🎨 Code Style

### TypeScript

- Use explicit types where beneficial
- Prefer interfaces over type aliases for objects
- Use meaningful variable names
- Add JSDoc comments for public APIs

### File Organization

```
src/
├── game/           # Game logic
│   ├── events/     # Event system
│   ├── combat/     # Combat system
│   └── ...
├── ui/             # UI components
└── ...
```

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Types/Interfaces**: `PascalCase`
- **Variables/Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`

## 🔒 Security

If you discover a security vulnerability:

1. **Do not** open a public issue
2. Email the maintainers directly
3. Provide detailed information
4. Wait for a response before disclosure

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

## ❓ Questions?

- Open a discussion on GitHub
- Check existing documentation
- Ask in pull request comments

## 🙏 Thank You!

Every contribution helps make this project better. Whether it's code, documentation, bug reports, or feature ideas - thank you for being part of this project!
