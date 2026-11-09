#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="${1:-}"
NOTES="${2:-Melhorias e correções.}"
PUBLISH="${PUBLISH:-true}"
RELEASES_REPO="feliperogerioalmeida/fr-notes"
IDENTITY="FR Notes Development"
UPDATER_KEY="$HOME/.tauri/fr-notes-updater.key"
ARCH="aarch64"
PLATFORM="darwin-$ARCH"

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Uso: pnpm --filter desktop release <versão> [\"notas da versão\"]  (ex.: 0.2.0)"
  exit 1
fi

if [ ! -f "$UPDATER_KEY" ]; then
  echo "Chave de atualização não encontrada em $UPDATER_KEY."
  exit 1
fi

if security find-identity -v -p codesigning | grep -q "$IDENTITY"; then
  export APPLE_SIGNING_IDENTITY="$IDENTITY"
else
  echo "Aviso: sem o certificado \"$IDENTITY\" a versão sai com assinatura ad-hoc"
  echo "e o macOS vai pedir as permissões de novo após a atualização."
  echo "Rode uma vez: pnpm --filter desktop setup:signing"
  export APPLE_SIGNING_IDENTITY="-"
fi

python3 - "$VERSION" <<'PY'
import json, pathlib, re, sys
version = sys.argv[1]
conf = pathlib.Path("src-tauri/tauri.conf.json")
data = json.loads(conf.read_text())
data["version"] = version
conf.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
package = pathlib.Path("package.json")
data = json.loads(package.read_text())
data["version"] = version
package.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
cargo = pathlib.Path("src-tauri/Cargo.toml")
cargo.write_text(re.sub(r'(?m)^version = ".*?"', f'version = "{version}"', cargo.read_text(), count=1))
PY

export TAURI_SIGNING_PRIVATE_KEY="$(cat "$UPDATER_KEY")"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
export PATH="$HOME/.cargo/bin:$PATH"
pnpm tauri build --bundles app,dmg

BUNDLE_DIR="src-tauri/target/release/bundle"
OUT_DIR="release/v$VERSION"
DMG_NAME="FR-Notes_${VERSION}_${ARCH}.dmg"
TARBALL_NAME="FR-Notes_${VERSION}_${ARCH}.app.tar.gz"
DOWNLOAD_URL="https://github.com/$RELEASES_REPO/releases/download/v$VERSION/$TARBALL_NAME"

mkdir -p "$OUT_DIR"
cp "$(ls "$BUNDLE_DIR"/dmg/*_"$VERSION"_*.dmg | head -1)" "$OUT_DIR/$DMG_NAME"
cp "$BUNDLE_DIR/macos/FR Notes.app.tar.gz" "$OUT_DIR/$TARBALL_NAME"

python3 - "$VERSION" "$NOTES" "$PLATFORM" "$DOWNLOAD_URL" "$BUNDLE_DIR/macos/FR Notes.app.tar.gz.sig" "$OUT_DIR/latest.json" <<'PY'
import json, pathlib, sys
from datetime import datetime, timezone
version, notes, platform, url, signature_path, output = sys.argv[1:]
latest = {
    "version": version,
    "notes": notes,
    "pub_date": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "platforms": {
        platform: {
            "signature": pathlib.Path(signature_path).read_text().strip(),
            "url": url,
        }
    },
}
pathlib.Path(output).write_text(json.dumps(latest, indent=2, ensure_ascii=False) + "\n")
PY

echo "Arquivos da versão $VERSION em apps/desktop/$OUT_DIR"

if [ "$PUBLISH" != "true" ]; then
  echo "PUBLISH=false: nada foi publicado."
  exit 0
fi

git add src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock package.json
if ! git diff --cached --quiet; then
  git commit -q -m "chore(desktop): release v$VERSION"
fi
git push -q origin HEAD

gh release create "v$VERSION" \
  --repo "$RELEASES_REPO" \
  --target "$(git rev-parse HEAD)" \
  --title "FR Notes $VERSION" \
  --notes "$NOTES" \
  "$OUT_DIR/$DMG_NAME" "$OUT_DIR/$TARBALL_NAME" "$OUT_DIR/latest.json"

echo "Publicado: https://github.com/$RELEASES_REPO/releases/tag/v$VERSION"
