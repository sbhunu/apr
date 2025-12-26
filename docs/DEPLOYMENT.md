# Deployment Guide

This document outlines the deployment process for the APR system.

## Environments

### Development
- **URL**: http://localhost:3000
- **Database**: Local Supabase (Docker)
- **Purpose**: Local development and testing

### Staging
- **URL**: https://apr-staging.example.com
- **Database**: Staging Supabase project
- **Purpose**: Pre-production testing and QA

### Production
- **URL**: https://apr.gov.zw
- **Database**: Production Supabase project
- **Purpose**: Live production system

## CI/CD Pipeline

### Continuous Integration (CI)

The CI pipeline runs on every push and pull request:

1. **Lint**: Code linting with ESLint
2. **Type Check**: TypeScript type checking
3. **Unit Tests**: Run unit test suites
4. **Build**: Build application
5. **E2E Tests**: Run end-to-end tests (if build succeeds)

### Continuous Deployment (CD)

#### Staging Deployment
- **Trigger**: Push to `develop` branch
- **Process**:
  1. Run pre-deployment checks
  2. Build application
  3. Deploy to Vercel (staging)
  4. Run database migrations
  5. Health check
  6. Notify team

#### Production Deployment
- **Trigger**: Push to `main` branch or manual workflow dispatch
- **Process**:
  1. Pre-deployment checks
  2. Run all tests
  3. Check backup status
  4. Verify staging deployment
  5. Create backup
  6. Build application
  7. Deploy to Vercel (production)
  8. Run database migrations
  9. Health check
  10. Smoke tests
  11. Notify team

## Deployment Methods

### Vercel (Recommended)

Vercel provides optimized Next.js hosting with:
- Automatic SSL certificates
- Global CDN
- Edge functions
- Zero-downtime deployments
- Automatic rollbacks

#### Setup

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Link Project**:
   ```bash
   vercel link
   ```

4. **Deploy**:
   ```bash
   # Preview deployment
   vercel
   
   # Production deployment
   vercel --prod
   ```

#### Environment Variables

Set in Vercel dashboard or via CLI:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

### Docker Deployment

#### Build Image

```bash
docker build -t apr-system:latest .
```

#### Run Container

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
  apr-system:latest
```

#### Docker Compose

```bash
docker-compose up -d
```

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Backup created (production only)
- [ ] Documentation updated
- [ ] Changelog updated

## Deployment Steps

### Automated Deployment

1. **Push to branch**:
   ```bash
   git push origin develop  # Staging
   git push origin main     # Production
   ```

2. **Monitor CI/CD pipeline**:
   - Check GitHub Actions
   - Monitor deployment logs
   - Verify health checks

3. **Verify deployment**:
   ```bash
   curl https://apr.gov.zw/api/health
   ```

### Manual Deployment

1. **Run pre-deployment checks**:
   ```bash
   ./scripts/deploy/pre-deploy.sh
   ```

2. **Build application**:
   ```bash
   npm run build
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Run migrations**:
   ```bash
   npm run migrate
   ```

5. **Verify**:
   ```bash
   curl https://apr.gov.zw/api/health/ready
   ```

## Rollback Procedures

### Automated Rollback

If deployment fails, the CI/CD pipeline automatically rolls back.

### Manual Rollback

1. **Using script**:
   ```bash
   ./scripts/deploy/rollback.sh production
   ```

2. **Using Vercel CLI**:
   ```bash
   vercel rollback --prod
   ```

3. **Using Vercel Dashboard**:
   - Go to Deployments
   - Find previous successful deployment
   - Click "Promote to Production"

## Database Migrations

### Staging

Migrations run automatically during staging deployment.

### Production

Migrations require manual approval:

1. Review migration SQL
2. Test on staging first
3. Create backup
4. Run migration:
   ```bash
   npm run migrate
   ```
5. Verify migration success
6. Monitor for issues

## Monitoring

### Health Checks

- **Liveness**: `/api/health/live`
- **Readiness**: `/api/health/ready`
- **Full Health**: `/api/health`

### Metrics

- **Performance**: `/api/metrics` (admin only)
- **Monitoring Dashboard**: `/admin/monitoring`

### Alerts

Configure alerts for:
- Deployment failures
- Health check failures
- High error rates
- Performance degradation

## SSL Certificates

### Vercel

SSL certificates are automatically provisioned and renewed by Vercel.

### Custom Domain

1. Add domain in Vercel dashboard
2. Configure DNS records
3. SSL certificate automatically provisioned

## CDN Configuration

Vercel provides automatic CDN:
- Static assets cached globally
- Edge functions for low latency
- Automatic cache invalidation

## Secrets Management

### Environment Variables

Store secrets in:
- **Vercel**: Project settings → Environment Variables
- **GitHub Actions**: Repository secrets
- **Local**: `.env.local` (never commit)

### Required Secrets

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_IP_WHITELIST` (production)
- `EJBCA_BASE_URL` (if using PKI)
- `EJBCA_USERNAME`
- `EJBCA_PASSWORD`

## Troubleshooting

### Deployment Fails

1. Check build logs
2. Verify environment variables
3. Check database connectivity
4. Review error messages
5. Check GitHub Actions logs

### Application Not Responding

1. Check health endpoints
2. Review application logs
3. Check database status
4. Verify environment variables
5. Check resource limits

### Migration Fails

1. Stop application traffic
2. Review migration SQL
3. Check database state
4. Restore from backup if needed
5. Fix migration and retry

## Post-Deployment

1. **Monitor**:
   - Check health endpoints
   - Review error logs
   - Monitor performance metrics

2. **Verify**:
   - Test critical workflows
   - Verify database migrations
   - Check external integrations

3. **Notify**:
   - Update team on deployment status
   - Document any issues
   - Update deployment log

## Best Practices

1. **Always test on staging first**
2. **Create backups before production deployments**
3. **Monitor deployments closely**
4. **Have rollback plan ready**
5. **Document all changes**
6. **Use feature flags for risky changes**
7. **Deploy during low-traffic periods**
8. **Keep deployment windows short**
9. **Communicate with team**
10. **Review metrics after deployment**

