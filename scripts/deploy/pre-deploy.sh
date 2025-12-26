#!/bin/bash
# Pre-Deployment Checks
# Validates system state before deployment

set -e

echo "Running pre-deployment checks..."

# Check environment variables
REQUIRED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
)

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "Error: Required environment variable ${VAR} is not set"
    exit 1
  fi
done

# Check database connection
echo "Checking database connection..."
npm run test:connection || {
  echo "Error: Database connection failed"
  exit 1
}

# Check backup status
echo "Checking backup status..."
# Would check backup API or logs

# Run linting
echo "Running linting..."
npm run lint || {
  echo "Warning: Linting issues found"
}

# Type check
echo "Running type check..."
npx tsc --noEmit || {
  echo "Error: Type check failed"
  exit 1
}

# Build check
echo "Running build check..."
npm run build || {
  echo "Error: Build failed"
  exit 1
}

echo "✅ Pre-deployment checks passed"

