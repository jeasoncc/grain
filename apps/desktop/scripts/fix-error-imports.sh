#!/bin/bash

# Fix error imports from utils to types
# Replace @/utils/error.util with @/types/error

echo "🔧 Fixing error imports..."

# Find all TypeScript files with utils/error.util imports
files=$(grep -rl "@/utils/error\.util" src/)

count=0
for file in $files; do
  # Replace the import
  sed -i 's|@/utils/error\.util|@/types/error|g' "$file"
  count=$((count + 1))
  echo "  ✓ Fixed: $file"
done

echo ""
echo "✅ Fixed $count files"
echo ""
echo "🔍 Verifying..."
remaining=$(grep -rl "@/utils/error\.util" src/ | wc -l)

if [ "$remaining" -eq 0 ]; then
  echo "✅ All error imports fixed!"
else
  echo "⚠️  Still $remaining files with utils/error imports"
fi
