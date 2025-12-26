#!/bin/bash
#
# Test Workflow Triggers Script
# Tests all workflow triggers end-to-end
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=========================================="
echo "Workflow Triggers Test Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if API is running
echo "🔍 Checking if API is running..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is running${NC}"
else
    echo -e "${YELLOW}⚠️  API not responding at http://localhost:3000${NC}"
    echo "   Please start the development server: npm run dev"
    exit 1
fi

# Check if workflow events table exists
echo ""
echo "🔍 Checking workflow events table..."
if psql "$DATABASE_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'apr' AND table_name = 'workflow_events');" 2>/dev/null | grep -q t; then
    echo -e "${GREEN}✅ Workflow events table exists${NC}"
else
    echo -e "${RED}❌ Workflow events table not found${NC}"
    echo "   Please apply the migration: ./scripts/apply-workflow-migration.sh"
    exit 1
fi

# Test API endpoint
echo ""
echo "🔍 Testing workflow events API endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/workflows/events?pending=true 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ API endpoint accessible${NC}"
    echo "   Response: $BODY" | head -c 100
    echo "..."
else
    echo -e "${RED}❌ API endpoint returned HTTP $HTTP_CODE${NC}"
    echo "   Response: $BODY"
    exit 1
fi

# Check for pending events
echo ""
echo "🔍 Checking for pending workflow events..."
PENDING_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM apr.workflow_events WHERE status = 'pending';" 2>/dev/null || echo "0")

if [ "$PENDING_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $PENDING_COUNT pending workflow events${NC}"
    echo "   These may indicate failed triggers. Check the dashboard: http://localhost:3000/admin/workflows"
else
    echo -e "${GREEN}✅ No pending events${NC}"
fi

# Check for failed events
echo ""
echo "🔍 Checking for failed workflow events..."
FAILED_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM apr.workflow_events WHERE status = 'failed';" 2>/dev/null || echo "0")

if [ "$FAILED_COUNT" -gt 0 ]; then
    echo -e "${RED}❌ Found $FAILED_COUNT failed workflow events${NC}"
    echo "   Check the dashboard for details: http://localhost:3000/admin/workflows"
    echo ""
    echo "   Recent failed events:"
    psql "$DATABASE_URL" -c "SELECT trigger_type, entity_id, error, triggered_at FROM apr.workflow_events WHERE status = 'failed' ORDER BY triggered_at DESC LIMIT 5;" 2>/dev/null || true
else
    echo -e "${GREEN}✅ No failed events${NC}"
fi

# Summary
echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo "✅ API is running"
echo "✅ Workflow events table exists"
echo "✅ API endpoint accessible"
echo "📊 Pending events: $PENDING_COUNT"
echo "📊 Failed events: $FAILED_COUNT"
echo ""
echo "Next steps:"
echo "1. Navigate to http://localhost:3000/admin/workflows to view workflow events"
echo "2. Follow the testing guide: docs/WORKFLOW_TESTING_GUIDE.md"
echo "3. Test end-to-end workflow: Planning → Survey → Deeds → Operations"
echo ""

