#!/bin/bash

# Check ESLint Progress
# This script runs ESLint and provides a summary of violations

echo "🔍 Running ESLint check..."
echo ""

# Run ESLint and capture output
OUTPUT=$(npm run lint:grain 2>&1)

# Extract summary line
SUMMARY=$(echo "$OUTPUT" | grep "problems")

# Extract counts
if [[ $SUMMARY =~ ([0-9]+)\ problems\ \(([0-9]+)\ errors,\ ([0-9]+)\ warnings\) ]]; then
    TOTAL="${BASH_REMATCH[1]}"
    ERRORS="${BASH_REMATCH[2]}"
    WARNINGS="${BASH_REMATCH[3]}"
    
    echo "📊 Current Status:"
    echo "  Total Problems: $TOTAL"
    echo "  Errors: $ERRORS"
    echo "  Warnings: $WARNINGS"
    echo ""
    
    # Calculate progress (assuming target is 0)
    BASELINE=5513
    FIXED=$((BASELINE - TOTAL))
    PERCENT=$((FIXED * 100 / BASELINE))
    
    echo "📈 Progress:"
    echo "  Baseline: $BASELINE problems"
    echo "  Fixed: $FIXED problems"
    echo "  Progress: $PERCENT%"
    echo ""
    
    # Check if passing
    if [ "$TOTAL" -eq 0 ]; then
        echo "✅ ESLint check PASSED!"
        exit 0
    else
        echo "❌ ESLint check FAILED"
        echo ""
        echo "💡 Next steps:"
        echo "  1. Review ESLINT_VIOLATIONS_REPORT.md"
        echo "  2. Check QUICK_FIX_GUIDE.md for common fixes"
        echo "  3. Start with P0 (architecture) violations"
        exit 1
    fi
else
    echo "✅ ESLint check PASSED!"
    exit 0
fi
