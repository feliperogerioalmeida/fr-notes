#!/usr/bin/env bash
set -euo pipefail

IDENTITY="FR Notes Development"
KEYCHAIN="$HOME/Library/Keychains/login.keychain-db"
P12_PASSWORD="fr-notes-dev"
OPENSSL=/usr/bin/openssl

if security find-identity -v -p codesigning | grep -q "$IDENTITY"; then
  echo "O certificado \"$IDENTITY\" já existe. Nada a fazer."
  exit 0
fi

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

cat > "$WORKDIR/cert.conf" <<CONF
[ req ]
distinguished_name = dn
x509_extensions = ext
prompt = no
[ dn ]
CN = $IDENTITY
[ ext ]
basicConstraints = critical,CA:false
keyUsage = critical,digitalSignature
extendedKeyUsage = critical,codeSigning
CONF

"$OPENSSL" req -x509 -newkey rsa:2048 -nodes -days 3650 \
  -config "$WORKDIR/cert.conf" -keyout "$WORKDIR/key.pem" -out "$WORKDIR/cert.pem"
"$OPENSSL" pkcs12 -export -inkey "$WORKDIR/key.pem" -in "$WORKDIR/cert.pem" \
  -out "$WORKDIR/cert.p12" -passout "pass:$P12_PASSWORD"

security import "$WORKDIR/cert.p12" -k "$KEYCHAIN" -P "$P12_PASSWORD" -T /usr/bin/codesign
echo "O macOS vai pedir sua senha para confiar no certificado para assinatura de código."
security add-trusted-cert -r trustRoot -p codeSign -k "$KEYCHAIN" "$WORKDIR/cert.pem"

echo "Pronto: \"$IDENTITY\" criado. Rode 'pnpm --filter desktop start:app'."
