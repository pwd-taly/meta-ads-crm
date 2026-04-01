# Contributing to Meta Ads CRM

Thank you for your interest in contributing! 🎉 All contributions are welcome — bug reports, feature requests, documentation improvements, and code changes.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Commit Message Convention](#commit-message-convention)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/your-username/meta-ads-crm.git
   cd meta-ads-crm
   ```
3. **Add the upstream remote:**
   ```bash
   git remote add upstream https://github.com/pwd-taly/meta-ads-crm.git
   ```
4. **Install dependencies:**
   ```bash
   npm install
   ```
5. **Set up environment:**
   ```bash
   cp .env.example .env.local
   # Fill in required values
   ```

---

## How to Contribute

### Branches

- `main` — stable, production-ready code
- Create feature branches off `main`:
  ```bash
  git checkout -b feat/your-feature-name
  git checkout -b fix/your-bug-fix
  ```

### Workflow

1. Sync your fork with upstream before starting:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```
2. Make your changes in a focused, well-named branch
3. Write or update tests where applicable
4. Ensure the project builds and lints cleanly:
   ```bash
   npm run build
   ```
5. Push your branch and open a Pull Request

---

## Development Setup

```bash
# Start development server
npm run dev

# Push database schema (requires DATABASE_URL in .env.local)
npm run db:push

# Open Prisma Studio (visual DB browser)
npm run db:studio

# Seed the database
npm run db:seed
```

See the [README](README.md) for full setup instructions.

---

## Pull Request Guidelines

- **One PR per feature/fix** — keep changes focused
- **Fill out the PR template** — describe what changed and why
- **Link related issues** — use `Closes #123` in the PR body
- **Pass all checks** — the build must succeed
- **No secrets** — never commit `.env` files, API keys, or passwords
- **Update docs** — update the README if your change affects setup or usage

---

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

[optional body]
```

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change without feature/fix |
| `style` | Formatting, whitespace |
| `test` | Adding or updating tests |
| `chore` | Build process, dependencies |

**Examples:**
```
feat: add CSV export for leads
fix: resolve webhook signature validation on cold start
docs: update environment variable reference
```

---

## Reporting Bugs

Open a [GitHub Issue](https://github.com/pwd-taly/meta-ads-crm/issues/new) and include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs. actual behavior
- Your environment (OS, Node.js version, database)
- Relevant logs or screenshots

---

## Suggesting Features

Open a [GitHub Issue](https://github.com/pwd-taly/meta-ads-crm/issues/new) with:

- A clear description of the feature
- The problem it solves or the use case
- Any implementation ideas you have

---

Thank you for helping make Meta Ads CRM better! 🚀
