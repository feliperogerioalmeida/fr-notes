#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

IDENTITY="FR Notes Development"
APP_PATH="src-tauri/target/debug/bundle/macos/FR Notes.app"

if security find-identity -v -p codesigning | grep -q "$IDENTITY"; then
  export APPLE_SIGNING_IDENTITY="$IDENTITY"
else
  echo "Aviso: sem o certificado \"$IDENTITY\", o macOS pode pedir as permissões de novo a cada build."
  echo "Rode uma vez: pnpm --filter desktop setup:signing"
fi

export PATH="$HOME/.cargo/bin:$PATH"
pnpm tauri build --debug --bundles app --config '{"bundle":{"createUpdaterArtifacts":false}}'

if [ -z "${APPLE_SIGNING_IDENTITY:-}" ]; then
  codesign --force --deep --sign - \
    --entitlements src-tauri/Entitlements.plist \
    "$APP_PATH"
fi

pkill -f "FR Notes.app/Contents/MacOS" 2>/dev/null || true
open "$APP_PATH"
