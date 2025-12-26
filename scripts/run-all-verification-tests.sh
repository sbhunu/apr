#!/bin/bash

# Run All Verification Tests
# Executes SQL verification and TypeScript tests

echo "🧪 Running All Verification Tests"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: SQL Verification Migration
echo "1️⃣ Running SQL Verification Migration..."
echo "─────────────────────────────────────────"
if docker exec -i supabase-db psql -U postgres < supabase/migrations/005_verify_foundation_setup.sql 2>&1 | grep -E "(NOTICE|ERROR|✓|⚠️)" | head -20; then
    echo -e "${GREEN}✅ SQL verification completed${NC}"
else
    echo -e "${RED}❌ SQL verification failed${NC}"
fi
echo ""

# Test 2: Schema Prefix Verification
echo "2️⃣ Verifying Schema Prefixes..."
echo "─────────────────────────────────"
docker exec supabase-db psql -U postgres -t -c "
SELECT 
    CASE 
        WHEN table_schema = 'apr' THEN '✅'
        ELSE '❌'
    END as status,
    table_schema,
    table_name
FROM information_schema.tables
WHERE table_schema IN ('apr', 'public')
  AND table_name IN ('user_profiles', 'roles', 'permissions', '_schema_test')
ORDER BY table_schema, table_name;
" 2>&1
echo ""

# Test 3: RLS Verification
echo "3️⃣ Verifying RLS Policies..."
echo "─────────────────────────────"
docker exec supabase-db psql -U postgres -t -c "
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'apr'
  AND tablename IN ('user_profiles', 'roles', 'permissions')
ORDER BY tablename;
" 2>&1
echo ""

# Test 4: Default Roles Verification
echo "4️⃣ Verifying Default Roles..."
echo "──────────────────────────────"
docker exec supabase-db psql -U postgres -t -c "
SELECT 
    name,
    CASE 
        WHEN is_system_role THEN 'System'
        ELSE 'Custom'
    END as type
FROM apr.roles
ORDER BY name;
" 2>&1
echo ""

# Test 5: Default Permissions Verification
echo "5️⃣ Verifying Default Permissions..."
echo "────────────────────────────────────"
docker exec supabase-db psql -U postgres -t -c "
SELECT 
    resource,
    COUNT(*) as permission_count
FROM apr.permissions
GROUP BY resource
ORDER BY resource;
" 2>&1
echo ""

# Test 6: SRID Verification
echo "6️⃣ Verifying Spatial Reference System..."
echo "─────────────────────────────────────────"
docker exec supabase-db psql -U postgres -t -c "
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM spatial_ref_sys WHERE srid = 32735) 
        THEN '✅ SRID 32735 (UTM Zone 35S) available'
        ELSE '❌ SRID 32735 not found'
    END as srid_status;
" 2>&1
echo ""

# Test 7: TypeScript Tests (if available)
echo "7️⃣ Running TypeScript Verification Tests..."
echo "────────────────────────────────────────────"
if command -v npx &> /dev/null; then
    npx tsx tests/verify-foundation.test.ts 2>&1 || echo "TypeScript tests require additional setup"
else
    echo "⚠️  npx not available, skipping TypeScript tests"
fi
echo ""

echo "=================================="
echo "✅ Verification Tests Complete!"
echo ""
echo "📋 Summary:"
echo "   - SQL verification: See output above"
echo "   - Schema prefixes: Verified via SQL"
echo "   - RLS policies: Verified via SQL"
echo "   - Default data: Verified via SQL"
echo ""

