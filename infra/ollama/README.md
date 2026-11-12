# Ollama no Coolify

Sobe o modelo de IA do FR Notes num VPS com Coolify, protegido por uma chave.

- `ollama`: baixa o `qwen3.5:4b` na primeira vez e cria o modelo `fr-notes`, com contexto de 16 mil tokens (cabe a transcrição de uma reunião de cerca de 1 hora).
- `gateway`: Caddy na frente do Ollama. Só repassa pedidos com `Authorization: Bearer <chave>`; o resto recebe 401. O Ollama nunca fica exposto direto.

## Como subir

1. Coolify → **Projects** → seu projeto → **+ New** → **Docker Compose Empty**, cole o `docker-compose.yml` e salve.
2. No serviço **gateway**, defina o domínio com HTTPS. Exemplos: `https://ollama.seudominio.com` (com um registro DNS A apontando para o IP do VPS) ou o domínio `sslip.io` que o Coolify sugere, trocando `http` por `https`.
3. **Deploy**. Na primeira vez o modelo é baixado (cerca de 3,5 GB); acompanhe os logs do `ollama` até aparecer `success`.
4. Em **Environment Variables**, copie o valor de `SERVICE_PASSWORD_64_FRNOTES`. Essa é a chave.

## No FR Notes

Configurações → IA, no painel **Ollama ou compatível com OpenAI**:

| Campo                | Valor                      |
| -------------------- | -------------------------- |
| URL base             | `https://<seu domínio>/v1` |
| Modelo               | `fr-notes`                 |
| Chave da API         | o valor copiado no passo 4 |
| Raciocínio do modelo | desligado                  |

Depois, em **Provedor em uso**, escolha **Ollama ou compatível com OpenAI**. A configuração do Vercel AI Gateway continua salva ao lado, e dá para alternar entre as duas a qualquer momento.

Com 16 mil tokens de contexto, reuniões mais longas que cerca de 1 hora não cabem inteiras: deixe ligado **Adiantar as notas durante a reunião**, que resume a conversa a cada 10 minutos.

## Memória

O modelo com 16 mil tokens de contexto usa cerca de 4 a 5 GB de RAM enquanto está carregado (ele descarrega depois de 15 minutos sem uso). Num VPS de 8 GB com Coolify, isso deixa pouca folga. Se o servidor ficar sem memória, reduza `num_ctx` no `docker-compose.yml`.
