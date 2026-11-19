# Vozes da sala no microfone

## Por quê

Numa reunião híbrida, três pessoas estavam na sala (o usuário e mais duas) e duas participavam online. Quem mais falou na sala foi um dos convidados, mas toda fala captada pelo microfone do Mac virou "Eu". As notas trataram as perguntas desse convidado como sendo do usuário, mesmo quando a pessoa online respondia chamando o convidado pelo nome.

Causa: o Deepgram só separa vozes no áudio do sistema. Ao vivo, `session.rs` usa `diarize: matches!(source, AudioSource::System)`. No "Refazer transcrição", o microfone também vai sem `diarize`. E o `describeSpeaker` devolve "Eu" para qualquer segmento do microfone.

## Objetivo

Em reuniões presenciais ou híbridas, cada voz da sala aparece separada e pode receber um nome: o usuário ("Eu") e cada convidado pelo nome. Assim a transcrição, as notas, o chat e as integrações atribuem as falas às pessoas certas.

## Abordagens consideradas

- **A) Separar sempre (escolhida pelo Felipe).** O microfone sempre passa pela separação de vozes. Se aparece uma voz só, ela é "Eu", como hoje. Se aparecem várias, elas viram "Sala 1", "Sala 2"… e o Felipe dá os nomes. Não exige lembrar de ligar nada.
- **B) Separar só quando a reunião for marcada como presencial ou híbrida.** As reuniões online ficam idênticas a hoje, mas se o Felipe esquecer de marcar, tudo volta a ser "Eu". Descartada por isso.
- **C) Reconhecer a voz do Felipe automaticamente.** O Deepgram não identifica pessoas, só separa vozes, então isso exigiria outro serviço ou modelo. Fora de escopo.

## Desenho (A)

1. **Transcrição.** O microfone usa `diarize=true` tanto no stream ao vivo quanto no pré-gravado ("Refazer transcrição"). Os segmentos do microfone passam a gravar `speaker`, que já existe na tabela.
2. **Nomes das vozes da sala.** Ficam em `speakerNames` com a chave `mic:N`. As vozes online continuam com as chaves numéricas de hoje (`"0"`, `"1"`…), então nada muda para as notas antigas nem para a detecção de quem fala via Acessibilidade (`attributeSpeakers` já filtra `source === "system"`).
3. **Regra do "Eu".** Para uma voz do microfone, nesta ordem:
   - se tem nome definido, usa o nome;
   - se a nota tem uma voz só no microfone, ou segmentos sem `speaker` (notas antigas e importadas), usa "Eu";
   - senão, usa "Sala N".

   Para decidir se há "uma voz só", vozes com pouquíssima fala (abaixo de um limite de tempo de fala, em constante nomeada, por exemplo 5% do tempo total do microfone) não contam. Isso evita que uma divisão falsa da voz do Felipe numa reunião online faça aparecer "Sala 1" e "Sala 2".
4. **Dar nome.** O mesmo popover de hoje, para as vozes da sala, com três tipos de opção: "Sou eu" (grava "Eu"), os convidados da agenda e um nome livre. Mais de uma voz pode ser "Eu", para juntar uma divisão falsa da voz do Felipe.
5. **Onde aparece.** O cálculo do rótulo tem que ser feito num lugar só, que recebe os segmentos da nota para saber quantas vozes há no microfone. Ele é usado pela transcrição, pela transcrição ao vivo (nub), pela cópia da transcrição, pela busca, pelos webhooks e pelos prompts.
6. **Prompts.** Notas, chat da nota, "Perguntar" e resumos parciais passam a explicar que as pessoas na sala com o usuário dividem o microfone. "Eu" é o usuário, e as outras aparecem pelo nome ou como "Sala N". Uma "Sala N" sem nome pode ser o próprio usuário, então o modelo deve se guiar pelo conteúdo e por como as pessoas se chamam (por exemplo, alguém online respondendo "…o seguinte, <nome>").
7. **Reuniões já gravadas.** Quando o áudio está salvo, o "Refazer transcrição" passa a separar as vozes da sala. Ele já zera todos os nomes, inclusive os online, então o usuário dá os nomes de novo e gera as notas outra vez.

## Fora de escopo

- Reconhecer automaticamente qual voz é o Felipe.
- Opção para marcar a reunião como presencial ou híbrida.
- Melhorar a captação de quem está longe do microfone do Mac.
- Mudar a atribuição das vozes online.

## Fica a critério de quem implementar

- O limite exato de "pouca fala" e se ele é medido por tempo ou por quantidade de segmentos.
- Como a transcrição ao vivo aplica a regra do "Eu" enquanto as vozes ainda estão aparecendo.
- Os testes: as regras de rótulo no `@workspace/core` (Vitest) e a query do pré-gravado no Rust.
