#!/bin/bash
# Rollback Script
# Rolls back to previous deployment version

set -e

ENVIRONMENT="${1:-production}"

if [ -z "${ENVIRONMENT}" ]; then
  echo "Usage: $0 <environment>"
  echo "Example: $0 production"
  exit 1
fi

echo "WARNING: This will rollback ${ENVIRONMENT} environment"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
  echo "Rollback cancelled"
  exit 0
fi

echo "Rolling back ${ENVIRONMENT} environment..."

# For Vercel deployments
if command -v vercel &> /dev/null; then
  echo "Rolling back Vercel deployment..."
  vercel rollback --prod=${ENVIRONMENT} --yes
else
  echo "Vercel CLI not found. Manual rollback required."
  echo "1. Go to Vercel dashboard"
  echo "2. Select project"
  echo "3. Go to Deployments"
  echo "4. Find previous successful deployment"
  echo "5. Click 'Promote to Production'"
fi

echo "Rollback completed"
echo "Next steps:"
echo "1. Verify application health"
echo "2. Check error logs"
echo "3. Investigate root cause"
echo "4. Fix issues before redeploying"

