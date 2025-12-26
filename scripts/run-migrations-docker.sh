#!/bin/bash

# Automated Migration Runner for Docker Supabase
# Runs all migrations in order via direct PostgreSQL connection

echo "🚀 Running APR Schema Migrations via Docker..."
echo "=============================================="
echo ""

# Check if supabase-db container is running
if ! docker ps --format "{{.Names}}" | grep -q "^supabase-db$"; then
    echo "❌ Supabase database container not found!"
    echo "   Make sure Supabase is running: docker ps | grep supabase"
    exit 1
fi

echo "✅ Found Supabase database container"
echo ""

# Run migrations in order
MIGRATIONS=(
    "001_enable_postgis_and_create_apr_schema.sql"
    "002_create_schema_check_function.sql"
    "003_verify_apr_schema_setup.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    file="supabase/migrations/$migration"
    if [ ! -f "$file" ]; then
        echo "❌ Migration file not found: $file"
        exit 1
    fi
    
    echo "📄 Running: $migration"
    docker exec -i supabase-db psql -U postgres < "$file" 2>&1 | grep -E "(NOTICE|ERROR|CREATE|GRANT|DO)" || true
    echo ""
done

echo "✅ All migrations completed!"
echo ""

# Verify setup
echo "🔍 Verifying setup..."
echo "────────────────────"

echo "1. Checking schemas:"
docker exec supabase-db psql -U postgres -t -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('apr', 'records');" 2>&1

echo ""
echo "2. Checking PostGIS:"
docker exec supabase-db psql -U postgres -t -c "SELECT PostGIS_Version();" 2>&1 | head -1

echo ""
echo "3. Checking test table:"
docker exec supabase-db psql -U postgres -t -c "SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = '_schema_test';" 2>&1

echo ""
echo "4. Testing schema check function:"
docker exec supabase-db psql -U postgres -t -c "SELECT check_schema_exists('apr') as apr_exists, check_schema_exists('records') as records_exists;" 2>&1

echo ""
echo "✅ Setup verification complete!"
echo ""
echo "📝 Next steps:"
echo "   - Test connection: npm run test:connection"
echo "   - Or test via API: npm run dev (then visit /api/test-supabase)"
echo ""

