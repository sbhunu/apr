# Environment Files Explanation

## 📁 File Purpose

### `.env.local` ✅ **KEEP THIS ONE**
- **Purpose**: Local development secrets and configuration
- **Loaded by**: Next.js (highest priority), Node.js scripts
- **Git status**: Ignored (never committed)
- **Contains**: 
  - Supabase credentials (auto-generated)
  - Taskmaster API keys (for CLI)
  - Any local-only secrets

### `.env` ❌ **CAN BE REMOVED**
- **Purpose**: Was used for Taskmaster CLI keys
- **Loaded by**: Node.js scripts (if `.env.local` doesn't exist)
- **Git status**: Ignored
- **Status**: **Redundant** - All keys moved to `.env.local`

### `.env.example` / `.env.local.example` ✅ **KEEP AS TEMPLATES**
- **Purpose**: Template files showing what variables are needed
- **Git status**: Committed (safe to share)
- **Contains**: Example values or placeholders
- **Usage**: Copy to `.env.local` and fill in real values

## 🎯 Recommendation

**You only need `.env.local`** for local development.

### What to do:

1. ✅ **Keep `.env.local`** - This is your main environment file
2. ❌ **Delete `.env`** - It's redundant now (all keys are in `.env.local`)
3. ✅ **Keep `.env.example` files** - These are templates for other developers

### Next.js Environment Variable Priority:

```
.env.local (highest priority) ← Use this
.env.development.local
.env.development
.env.local
.env
```

## 🔒 Security Notes

- ✅ Both `.env` and `.env.local` are gitignored (`.env*` in `.gitignore`)
- ✅ Never commit actual API keys or secrets
- ✅ Use `.env.example` files as templates
- ✅ `.env.local` takes precedence over `.env` in Next.js

## 📝 Current Setup

After consolidation:
- **`.env.local`** - Contains all your actual keys (Supabase + Taskmaster)
- **`.env.example`** - Template for Supabase variables
- **`.env.local.example`** - Template for Supabase variables
- **`.env`** - Can be deleted (redundant)

## 🚀 Usage

### For Next.js App:
- Uses `.env.local` automatically
- Variables prefixed with `NEXT_PUBLIC_` are exposed to browser

### For CLI Scripts:
- Scripts load both `.env.local` and `.env` (via dotenv)
- `.env.local` takes precedence
- This is why consolidating to `.env.local` works for everything

