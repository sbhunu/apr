# Environment Management Guide

This document outlines how to manage different environments (development, staging, production) for the APR system.

## Environment Overview

### Development
- **Purpose**: Local development and testing
- **Database**: Local Supabase (Docker)
- **URL**: http://localhost:3000
- **Features**: Hot reload, debug mode, verbose logging

### Staging
- **Purpose**: Pre-production testing and QA
- **Database**: Staging Supabase project
- **URL**: https://apr-staging.example.com
- **Features**: Production-like environment, test data

### Production
- **Purpose**: Live production system
- **Database**: Production Supabase project
- **URL**: https://apr.gov.zw
- **Features**: Optimized builds, monitoring, alerts

## Environment Variables

### Required Variables

All environments require:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Environment-Specific Variables

#### Development (.env.local)

```bash
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
LOG_LEVEL=debug
```

#### Staging

```bash
NODE_ENV=staging
NEXT_PUBLIC_APP_URL=https://apr-staging.example.com
LOG_LEVEL=info
```

#### Production

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://apr.gov.zw
LOG_LEVEL=warn
ADMIN_IP_WHITELIST=1.2.3.4,5.6.7.8
```

## Secrets Management

### Local Development

Store secrets in `.env.local` (never commit):

```bash
cp .env.local.example .env.local
# Edit .env.local with your values
```

### Vercel

1. Go to Project Settings → Environment Variables
2. Add variables for each environment
3. Use different values for staging and production

### GitHub Actions

Store secrets in Repository Settings → Secrets:

- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_ANON_KEY`
- `STAGING_SERVICE_ROLE_KEY`
- `PROD_SUPABASE_URL`
- `PROD_SUPABASE_ANON_KEY`
- `PROD_SERVICE_ROLE_KEY`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Environment Configuration

### Supabase Projects

Create separate Supabase projects for each environment:

1. **Development**: Local Docker instance
2. **Staging**: `apr-staging` project
3. **Production**: `apr-production` project

### Database Migrations

Migrations should be tested in order:

1. Development (local)
2. Staging
3. Production

### Feature Flags

Use environment variables for feature flags:

```typescript
const FEATURES = {
  ENABLE_PKI: process.env.ENABLE_PKI === 'true',
  ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS === 'true',
  MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === 'true',
}
```

## Environment Switching

### Local Development

```bash
# Use .env.local for development
npm run dev
```

### Staging Deployment

```bash
# Deploy to staging
git push origin develop
# Or manually
vercel --env=staging
```

### Production Deployment

```bash
# Deploy to production
git push origin main
# Or manually
vercel --prod
```

## Environment Validation

### Pre-Deployment Checks

Run before deploying:

```bash
./scripts/deploy/pre-deploy.sh
```

This checks:
- Required environment variables
- Database connectivity
- Build success
- Type checking

## Best Practices

1. **Never commit secrets**: Use `.env.local` and Vercel secrets
2. **Use different databases**: Separate Supabase projects per environment
3. **Test migrations**: Always test on staging before production
4. **Monitor environments**: Set up monitoring for each environment
5. **Document changes**: Keep environment documentation updated
6. **Rotate secrets**: Regularly rotate API keys and passwords
7. **Use feature flags**: Control feature rollout per environment
8. **Backup production**: Regular backups of production data
9. **Limit access**: Restrict production access to authorized personnel
10. **Audit logs**: Monitor access and changes to environments

