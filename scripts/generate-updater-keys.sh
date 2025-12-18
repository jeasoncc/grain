#!/bin/bash

# Generate Tauri updater signing keys

set -e

echo "🔐 Generating Tauri Updater Signing Keys"
echo "========================================"
echo ""

cd apps/desktop

# Generate keys
bun run tauri signer generate -w ~/.tauri/grain-updater.key

echo ""
echo "✅ Keys generated successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Private key saved to: ~/.tauri/grain-updater.key"
echo "2. Public key will be displayed above"
echo "3. Copy the public key and update tauri.conf.json"
echo "4. Add TAURI_SIGNING_PRIVATE_KEY to GitHub Secrets"
echo ""
