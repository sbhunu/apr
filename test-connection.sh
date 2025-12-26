#!/bin/bash
echo "Testing Supabase Connection and APR Schema Setup"
echo "================================================"
echo ""

# Check environment variables
if [ -f .env.local ]; then
  echo "✓ .env.local file exists"
  if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
    echo "✓ NEXT_PUBLIC_SUPABASE_URL is set"
  else
    echo "✗ NEXT_PUBLIC_SUPABASE_URL is missing"
  fi
  if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
    echo "✓ NEXT_PUBLIC_SUPABASE_ANON_KEY is set"
  else
    echo "✗ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing"
  fi
else
  echo "✗ .env.local file not found"
  echo "  Copy .env.local.example to .env.local and add your Supabase credentials"
fi

echo ""
echo "To verify schema setup, run this SQL in Supabase SQL Editor:"
echo "  supabase/verify-setup.sql"
echo ""
echo "To test API connection:"
echo "  1. Start dev server: npm run dev"
echo "  2. Visit: http://localhost:3000/api/test-supabase"
