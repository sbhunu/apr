#!/bin/bash
echo "📋 APR Migration SQL Files"
echo "=========================="
for file in supabase/migrations/*.sql; do
  echo ""
  echo "📄 $(basename $file):"
  echo "─────────────────────"
  cat "$file"
  echo ""
done
