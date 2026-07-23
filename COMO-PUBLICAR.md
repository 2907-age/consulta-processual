# Como publicar a ferramenta na internet

Este guia é feito para quem **não é desenvolvedor**. Ao final, o site estará no ar
em um endereço público (ex.: `consulta-assertif.vercel.app`), de graça.

A ferramenta tem duas partes que precisam ser publicadas **juntas**:

1. **O site** (a tela que as pessoas veem) — pasta `public/`.
2. **A função** que conversa com o Datajud — pasta `api/`.

A **Vercel** publica as duas de uma vez, sem configuração. Vamos usá-la.

---

## Visão geral (o caminho mais simples)

1. Criar uma conta no **GitHub** e enviar esta pasta para lá.
2. Criar uma conta na **Vercel** e conectar ao GitHub.
3. Clicar em *Deploy*. Pronto.

> Por que GitHub no meio? A Vercel publica a partir de um repositório do GitHub.
> É o jeito mais estável para quem não usa terminal, e toda vez que você quiser
> atualizar o site, é só substituir os arquivos no GitHub — a Vercel republica sozinha.

---

## Passo 1 — Enviar os arquivos para o GitHub

1. Acesse **https://github.com** e crie uma conta gratuita (se ainda não tiver).
2. No canto superior direito, clique em **+** → **New repository**.
3. Dê um nome (ex.: `consulta-processual`), deixe como **Public** e clique
   em **Create repository**.
4. Na página do repositório vazio, clique em **uploading an existing file**
   (link no meio da tela) ou em **Add file → Upload files**.
5. **Arraste para a janela** todo o conteúdo desta pasta (`datajud-assertif`):
   as pastas `api/` e `public/`, e os arquivos `vercel.json`, `package.json`,
   `.gitignore`, `COMO-PUBLICAR.md`.
   - Importante: arraste **o conteúdo** da pasta, não a pasta comprimida (.zip).
6. Clique em **Commit changes** (botão verde). Aguarde o envio terminar.

## Passo 2 — Publicar na Vercel

1. Acesse **https://vercel.com** e clique em **Sign Up**.
2. Escolha **Continue with GitHub** e autorize o acesso.
3. No painel, clique em **Add New… → Project**.
4. Na lista de repositórios, encontre `consulta-processual` e clique em **Import**.
5. **Não altere nada** nas configurações (a Vercel detecta tudo sozinha).
6. Clique em **Deploy** e aguarde cerca de 1 minuto.
7. Ao terminar, aparece **Congratulations**. Clique em **Visit** ou **Continue to
   Dashboard** — o endereço público (algo como
   `consulta-processual.vercel.app`) já está no ar.

Pronto. Teste digitando um número de processo na tela.

---

## Passo 3 (opcional) — Usar um domínio próprio

Se quiser um endereço como `consulta.assertif.com.br`:

1. No painel da Vercel, abra o projeto → aba **Settings → Domains**.
2. Digite o domínio desejado e clique em **Add**.
3. A Vercel mostra um registro (CNAME) para cadastrar no provedor onde o
   domínio da Assertif está registrado. Encaminhe essa informação a quem
   administra o domínio (TI ou o registrador).

---

## Passo 4 (opcional) — Guardar a chave do Datajud como variável

A chave pública do Datajud já vem embutida na função. Ela é **pública** (o próprio
CNJ a divulga), então não há problema. Mas o CNJ pode trocá-la de tempos em tempos.
Se isso acontecer e a consulta parar de funcionar:

1. Pegue a chave nova em
   **https://datajud-wiki.cnj.jus.br/api-publica/acesso** (seção "Autenticação").
2. No painel da Vercel: projeto → **Settings → Environment Variables**.
3. Crie a variável:
   - **Name:** `DATAJUD_API_KEY`
   - **Value:** `APIKey ` seguido da chave (ex.: `APIKey cDZH...w==`)
4. Salve e, na aba **Deployments**, clique nos três pontinhos do último deploy →
   **Redeploy**.

A função passa a usar a chave nova sem precisar mexer no código.

---

## Perguntas comuns

**"É grátis mesmo?"** Sim. O plano gratuito (Hobby) da Vercel atende bem uma
ferramenta como esta. Você não precisa cadastrar cartão.

**"A primeira consulta demorou muito."** Normal. A base do Datajud "acorda" na
primeira chamada e pode levar alguns segundos. As consultas seguintes são rápidas.
A ferramenta já mostra um aviso de carregamento e aguarda até 60 segundos.

**"Preciso instalar alguma coisa no meu computador?"** Não. Todo o processo é
feito pelo navegador (GitHub + Vercel).

**"Como atualizo o site depois?"** Substitua o arquivo alterado no GitHub
(Add file → Upload files, ou editando direto pelo site do GitHub). A Vercel
republica automaticamente em ~1 minuto.

---

## Testar no seu computador antes de publicar (opcional, avançado)

Se algum dia quiser rodar localmente, instale o **Node.js** (https://nodejs.org),
abra o terminal na pasta do projeto e rode:

```bash
npm i -g vercel
vercel dev
```

Acesse o endereço que aparecer (geralmente `http://localhost:3000`).
