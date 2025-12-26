# Security Documentation

This document outlines the security measures implemented in the APR system.

## Security Features

### 1. Rate Limiting

Rate limiting is implemented to prevent abuse and DoS attacks. Different limits apply to different endpoint types:

- **Public API**: 100 requests per 15 minutes
- **Authenticated API**: 500 requests per 15 minutes
- **Admin API**: 1000 requests per 15 minutes
- **Verification API**: 50 requests per hour
- **Upload API**: 20 requests per hour

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds to wait before retrying (on 429)

### 2. CSRF Protection

CSRF tokens are required for all state-changing operations (POST, PUT, PATCH, DELETE) on protected routes:

- `/api/planning/*`
- `/api/survey/*`
- `/api/deeds/*`
- `/api/admin/*`
- `/api/storage/upload`

CSRF tokens are:
- Generated server-side
- Stored in HTTP-only cookies
- Validated on each request
- Automatically refreshed

### 3. IP Whitelisting

Admin functions require IP whitelisting. Configure via environment variable:

```bash
ADMIN_IP_WHITELIST=192.168.1.1,10.0.0.0/8,172.16.0.0/12
```

Supports:
- Single IP addresses
- CIDR notation for IP ranges

### 4. Security Headers

The following security headers are applied to all responses:

- **Strict-Transport-Security**: Forces HTTPS (production only)
- **X-Frame-Options**: DENY (prevents clickjacking)
- **X-Content-Type-Options**: nosniff (prevents MIME sniffing)
- **X-XSS-Protection**: 1; mode=block
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Content-Security-Policy**: Restricts resource loading
- **Permissions-Policy**: Restricts browser features
- **X-Permitted-Cross-Domain-Policies**: none

### 5. Input Sanitization

All user input is sanitized to prevent XSS attacks:

- Script tags removed
- Event handlers removed
- JavaScript URLs blocked
- HTML entities escaped
- SQL identifiers sanitized

### 6. SQL Injection Prevention

SQL injection is prevented through:

- Parameterized queries (Supabase client)
- Input validation (Zod schemas)
- SQL identifier sanitization
- No direct SQL string concatenation

### 7. Authentication & Authorization

- Supabase Auth for authentication
- JWT tokens for session management
- Row-Level Security (RLS) for database access control
- RBAC middleware for API route protection

### 8. Data Encryption

- **In Transit**: HTTPS/TLS (enforced in production)
- **At Rest**: Database encryption (managed by Supabase)
- **Sensitive Fields**: Encrypted before storage

### 9. GDPR Compliance

- Data retention policies
- Data anonymization utilities
- Access logging for compliance
- Right to access/deletion support

## Configuration

### Environment Variables

```bash
# Admin IP Whitelist (comma-separated)
ADMIN_IP_WHITELIST=192.168.1.1,10.0.0.0/8

# Node Environment
NODE_ENV=production
```

### Rate Limit Configuration

Rate limits can be configured in `lib/security/rate-limiter.ts`:

```typescript
export const rateLimitConfigs = {
  public: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
  },
  // ... other configs
}
```

### Security Headers

Security headers can be customized in `lib/security/headers.ts`:

```typescript
export const defaultSecurityHeaders: SecurityHeaders = {
  'X-Frame-Options': 'DENY',
  // ... other headers
}
```

## Security Best Practices

1. **Never expose sensitive data** in API responses
2. **Always validate input** using Zod schemas
3. **Use parameterized queries** for database operations
4. **Sanitize user input** before display
5. **Log security events** for audit purposes
6. **Keep dependencies updated** to patch vulnerabilities
7. **Use HTTPS** in production
8. **Implement least privilege** access control
9. **Regular security audits** and penetration testing
10. **Monitor for suspicious activity**

## Vulnerability Reporting

If you discover a security vulnerability, please report it to the security team. Do not disclose publicly until it has been addressed.

## Compliance

The system implements measures for:

- **GDPR**: Data protection, retention, and access rights
- **OWASP Top 10**: Protection against common vulnerabilities
- **PCI DSS**: Secure handling of payment data (if applicable)

## Security Testing

Security tests are included in the E2E test suite:

- SQL injection prevention
- XSS protection
- RBAC enforcement
- CSRF protection
- Rate limiting

Run security tests:

```bash
npm run test:e2e -- tests/e2e/security
```

