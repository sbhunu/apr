#!/bin/bash
#
# Apply Workflow Events Migration Script
# Applies the workflow_events table migration to Supabase
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATION_FILE="$PROJECT_ROOT/supabase/migrations/031_workflow_events.sql"

echo "=========================================="
echo "Applying Workflow Events Migration"
echo "=========================================="
echo ""

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Migration file: $MIGRATION_FILE"
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    echo ""
    echo "Alternatively, you can apply the migration manually:"
    echo "   1. Open your Supabase dashboard"
    echo "   2. Go to SQL Editor"
    echo "   3. Copy and paste the contents of: $MIGRATION_FILE"
    echo "   4. Execute the SQL"
    echo ""
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "$PROJECT_ROOT/supabase/config.toml" ]; then
    echo "⚠️  Not a Supabase project directory."
    echo "   To apply migration manually:"
    echo "   1. Open your Supabase dashboard"
    echo "   2. Go to SQL Editor"
    echo "   3. Copy and paste the contents of: $MIGRATION_FILE"
    echo "   4. Execute the SQL"
    echo ""
    exit 1
fi

echo "✅ Supabase project detected"
echo ""

# Apply migration using Supabase CLI
echo "🔄 Applying migration..."
if supabase db push --db-url "$DATABASE_URL" 2>/dev/null || \
   supabase migration up --db-url "$DATABASE_URL" 2>/dev/null; then
    echo "✅ Migration applied successfully!"
else
    echo ""
    echo "⚠️  Could not apply migration automatically."
    echo "   Please apply manually:"
    echo ""
    echo "   Option 1: Using Supabase Dashboard"
    echo "   1. Open https://supabase.com/dashboard"
    echo "   2. Select your project"
    echo "   3. Go to SQL Editor"
    echo "   4. Copy and paste the contents of: $MIGRATION_FILE"
    echo "   5. Click 'Run'"
    echo ""
    echo "   Option 2: Using psql"
    echo "   psql \$DATABASE_URL -f $MIGRATION_FILE"
    echo ""
    echo "   Migration file location: $MIGRATION_FILE"
    echo ""
fi

echo ""
echo "=========================================="
echo "Migration Complete"
echo "=========================================="

