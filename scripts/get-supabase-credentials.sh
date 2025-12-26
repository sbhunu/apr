#!/bin/bash

# Script to extract Supabase credentials from local Docker setup
# This script helps get the correct anon key and URL for local Supabase

echo "🔍 Finding Supabase Local Credentials..."
echo "=========================================="
echo ""

# Method 1: Check Supabase CLI status
if command -v supabase &> /dev/null; then
    echo "📋 Method 1: Using Supabase CLI"
    echo "────────────────────────────────"
    supabase status 2>/dev/null | grep -E "(API URL|anon key|service_role key)" || echo "   ⚠️  Supabase CLI not linked or not running"
    echo ""
fi

# Method 2: Check Docker containers
echo "📋 Method 2: Checking Docker Containers"
echo "────────────────────────────────────────"

# Common Supabase container names
CONTAINERS=("supabase_db_kong" "supabase-kong" "supabase_db" "supabase_db_1" "supabase-postgres")

FOUND=false
for container in "${CONTAINERS[@]}"; do
    if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
        echo "   ✅ Found container: $container"
        FOUND=true
        
        # Try to get credentials from container
        echo "   🔑 Attempting to extract credentials..."
        
        # Check for .env file in common locations
        if docker exec "$container" test -f /var/run/supabase/.env 2>/dev/null; then
            echo "   📄 Found .env file in container"
            docker exec "$container" cat /var/run/supabase/.env 2>/dev/null | grep -E "(SUPABASE_URL|ANON_KEY|SERVICE_ROLE_KEY)" || true
        fi
        
        # Check for config in /etc
        docker exec "$container" cat /etc/kong/kong.yml 2>/dev/null | grep -E "(url|key)" | head -5 || true
        
        break
    fi
done

if [ "$FOUND" = false ]; then
    echo "   ⚠️  No Supabase containers found with common names"
    echo "   💡 Listing all running containers:"
    docker ps --format "  - {{.Names}} ({{.Image}})" | head -10
fi

echo ""

# Method 3: Check for Supabase config files
echo "📋 Method 3: Checking Local Config Files"
echo "─────────────────────────────────────────"

# Check for supabase/.env or supabase/config.toml
if [ -f "supabase/.env" ]; then
    echo "   ✅ Found supabase/.env"
    grep -E "(SUPABASE_URL|ANON_KEY)" supabase/.env | sed 's/^/   /' || true
elif [ -f "supabase/config.toml" ]; then
    echo "   ✅ Found supabase/config.toml"
    grep -E "(api_url|anon_key)" supabase/config.toml | sed 's/^/   /' || true
else
    echo "   ⚠️  No Supabase config files found in ./supabase/"
fi

echo ""

# Method 4: Check environment variables
echo "📋 Method 4: Current Environment Variables"
echo "───────────────────────────────────────────"
if [ -f ".env.local" ]; then
    echo "   📄 .env.local:"
    grep -E "SUPABASE" .env.local | sed 's/\(ANON_KEY=\).*/ANON_KEY=***hidden***/' | sed 's/^/   /' || echo "   ⚠️  No SUPABASE vars found"
elif [ -f ".env" ]; then
    echo "   📄 .env:"
    grep -E "SUPABASE" .env | sed 's/\(ANON_KEY=\).*/ANON_KEY=***hidden***/' | sed 's/^/   /' || echo "   ⚠️  No SUPABASE vars found"
else
    echo "   ⚠️  No .env files found"
fi

echo ""
echo "=========================================="
echo "💡 Next Steps:"
echo ""
echo "1. If using Supabase CLI:"
echo "   supabase status"
echo ""
echo "2. If using Docker:"
echo "   docker exec <container_name> env | grep SUPABASE"
echo ""
echo "3. Check Supabase Dashboard:"
echo "   Local: http://localhost:54323"
echo "   Or check: supabase status | grep 'API URL'"
echo ""
echo "4. Once you have credentials, update .env.local:"
echo "   NEXT_PUBLIC_SUPABASE_URL=<your_url>"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>"
echo ""

