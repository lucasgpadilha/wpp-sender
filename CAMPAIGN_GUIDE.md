# 🚀 Guia de Campanha Autoflow

Este guia explica o passo-a-passo para criar e disparar uma campanha de marketing no Autoflow 2.0.

## 1. Preparação (Antes de começar)

Antes de criar a campanha, você precisa de **quem** vai receber.

1.  **Crie Tags:**
    *   Vá em **Tags** no menu lateral.
    *   Crie etiquetas para segmentar seu público (ex: `VIP`, `Lead Frio`, `Cliente 2024`).
2.  **Importe/Crie Contatos:**
    *   Vá em **Contatos**.
    *   Ao criar um contato, certifique-se de preencher o **Telefone** (com DDI e DDD, ex: `5511999999999`) e selecionar as **Tags** correspondentes.

## 2. Configuração do Robô

Garanta que o robô sabe como e quando trabalhar.

1.  Vá em **Configurações Gerais**.
2.  **Janela de Segurança:** Defina a hora que o robô acorda e dorme (ex: `08:00` às `20:00`). Fora desse horário, ele entra em modo "Sleep".
3.  **Delays:** Defina o tempo mínimo e máximo entre mensagens (ex: `30` a `120` segundos) para evitar bloqueios.

## 3. Criando a Campanha

Agora vamos ao que interessa.

1.  Vá em **Campanhas** e clique em **+**.
2.  **Nome:** Dê um nome interno (ex: `Promoção Black Friday`).
3.  **Mensagem Base:** Escreva sua mensagem.
    *   Use `{{nome}}` para substituir pelo nome do contato.
    *   Ex: `Olá {{nome}}, tudo bem? Temos uma oferta para você!`
4.  **Prompt IA (Opcional):** Se quiser que a IA reescreva a mensagem para cada pessoa, dê a instrução aqui.
    *   Ex: `Reescreva a mensagem base de forma muito amigável e use um emoji no final.`
    *   *Se deixar em branco, a mensagem base será enviada exatamente como está.*
5.  **Tags Alvo:** Selecione as Tags que você criou no Passo 1. A campanha será enviada APENAS para contatos que tenham essas tags.
6.  **Status:** Selecione **"Calculando"**.
7.  **Salvar:** Clique no check (✔) para salvar.

## 4. O Ciclo de Vida (Automático)

Assim que você salva com status **"Calculando"**:

1.  **O Robô Calcula:** Ele cruza as tags, conta quantos contatos existem e estima o tempo de envio.
2.  **Status Muda:** O robô muda o status da campanha para **"Pronta"** automaticamente.
3.  **Você Confere:** Entre na campanha novamente. Veja os campos de estatística (Total Contatos, Tempo Estimado).
4.  **O Disparo:** Se estiver tudo certo, mude o status para **"Enviando"**.

**Pronto!** O robô agora vai processar a fila, respeitando seus horários e delays. Você pode acompanhar o progresso pela barra de porcentagem ou pela coleção **Fila de Envios**.
