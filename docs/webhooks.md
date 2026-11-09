# Webhooks do FR Notes

Os webhooks enviam suas notas para outros sistemas — FR Hub, n8n, Make, Zapier ou o seu próprio backend — assim que elas ficam prontas. Cadastre em **Configurações → Integrações → Nova integração**.

## Eventos

| Evento           | Quando é enviado                                                                |
| ---------------- | ------------------------------------------------------------------------------- |
| `note.completed` | Ao parar uma gravação. Traz suas anotações e a transcrição completa.            |
| `note.enhanced`  | Quando a IA termina de gerar as notas. Traz também as notas finais em Markdown. |

O menu **⋯ → Enviar para integrações** de cada nota reenvia o evento correspondente ao estado atual da nota.

## Requisição

`POST` para a URL cadastrada, com corpo JSON (UTF-8):

| Cabeçalho              | Conteúdo                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `Content-Type`         | `application/json`                                                                             |
| `User-Agent`           | `FR-Notes/<versão>`                                                                            |
| `X-FR-Notes-Event`     | Nome do evento                                                                                 |
| `X-FR-Notes-Delivery`  | ID único da entrega (use para descartar duplicatas)                                            |
| `X-FR-Notes-Timestamp` | Momento do envio, em segundos desde 1970 (Unix)                                                |
| `X-FR-Notes-Signature` | `sha256=<hex>` — HMAC-SHA256 de `<timestamp>.<corpo>` com o segredo da integração              |
| Cabeçalho de API key   | Opcional: `Authorization: Bearer <chave>`, `X-API-Key: <chave>` ou outro nome que você definir |

### Corpo

```json
{
  "version": 1,
  "id": "1b6f0c4e-6c1c-4f53-9a4f-6a0f6f2d2b7e",
  "event": "note.enhanced",
  "sentAt": "2026-11-09T13:31:12.408Z",
  "source": { "app": "FR Notes", "version": "0.2.0" },
  "note": {
    "id": "8f0d704d-4fd1-4f3b-b29a-a74cf82cf880",
    "title": "Kickoff — App de pedidos",
    "status": "done",
    "myNotesMarkdown": "- prazo: março\n- orçamento 40k",
    "enhancedMarkdown": "### Resumo\n- ...",
    "participants": [{ "name": "Marina Souza", "email": "marina@cliente.com" }],
    "calendarEventId": "6A1B...:1762693200000",
    "folder": { "id": "...", "name": "Clientes" },
    "template": {
      "id": "builtin-client-discovery",
      "name": "Cliente / Descoberta"
    },
    "recordingStartedAt": "2026-11-09T13:00:02.100Z",
    "recordingEndedAt": "2026-11-09T13:30:41.900Z",
    "createdAt": "2026-11-09T12:59:40.000Z",
    "updatedAt": "2026-11-09T13:31:10.000Z"
  },
  "transcript": [
    {
      "speaker": "Eles",
      "source": "system",
      "text": "O orçamento aprovado é de quarenta mil.",
      "startedAt": "2026-11-09T13:12:04.000Z",
      "endedAt": "2026-11-09T13:12:08.000Z"
    }
  ]
}
```

`speaker` é `Eu` (seu microfone), o nome que você atribuiu à voz, `Pessoa N` (voz separada automaticamente e ainda sem nome) ou `Eles` (áudio do computador sem separação). Campos sem valor chegam como `null`.

## Verificando a assinatura

Copie o segredo em **Integrações → ícone de chave** (começa com `whsec_`). Calcule o HMAC sobre o **corpo bruto**, antes de fazer o parse do JSON, e compare em tempo constante. Recuse requisições com timestamp muito antigo para evitar replay.

### Node.js / TypeScript

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_AGE_SECONDS = 300;

export const isValidFrNotesRequest = (
  rawBody: string,
  headers: Record<string, string | undefined>,
  secret: string,
): boolean => {
  const timestamp = headers["x-fr-notes-timestamp"] ?? "";
  const received = headers["x-fr-notes-signature"] ?? "";
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!timestamp || Number.isNaN(age) || age > MAX_AGE_SECONDS) return false;
  const expected = `sha256=${createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")}`;
  return (
    expected.length === received.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(received))
  );
};
```

### Python

```python
import hashlib, hmac, time

def is_valid_fr_notes_request(raw_body: bytes, headers: dict, secret: str) -> bool:
    timestamp = headers.get("X-FR-Notes-Timestamp", "")
    received = headers.get("X-FR-Notes-Signature", "")
    if not timestamp or abs(time.time() - int(timestamp)) > 300:
        return False
    message = timestamp.encode() + b"." + raw_body
    expected = "sha256=" + hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, received)
```

## Entrega e novas tentativas

- Qualquer resposta `2xx` conta como sucesso.
- Em caso de erro ou timeout (15 s), o FR Notes tenta de novo após 2 s e após 10 s.
- O resultado da última entrega aparece em **Configurações → Integrações**.
- Como o envio parte do seu Mac, o app precisa estar aberto; uma nota finalizada sem internet pode ser reenviada pelo menu da nota.
- Use `X-FR-Notes-Delivery` para tornar o processamento idempotente.

## Segurança

- O segredo de assinatura e a API key do destino ficam no Keychain do macOS, nunca no banco de dados.
- Use sempre URLs `https://` para destinos fora da sua rede.
