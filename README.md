# Consulta Processual Pública — Assertif

Ferramenta web de consulta pública aos **metadados de processos judiciais do Brasil**,
a partir da API Pública do **Datajud** (Base Nacional de Dados do Poder Judiciário / CNJ),
seguindo os critérios da **Portaria CNJ nº 160/2020**.

Identidade visual conforme o Manual de Marca da Assertif (cores, tipografia Sora/Geist,
elemento diagonal 18°). Interface **mobile-first**, em português.

> **Para publicar, leia [`COMO-PUBLICAR.md`](COMO-PUBLICAR.md)** — passo a passo sem exigir
> conhecimento técnico.

## Como funciona

```
Navegador (public/)  ──►  Função serverless (api/consulta.js)  ──►  API Datajud/CNJ
   site estático            proxy: resolve CORS, guarda a
   mobile-first             chave e aplica os resguardos
```

A API do Datajud **não permite chamadas diretas do navegador** (sem CORS) e exige uma
chave no cabeçalho. Por isso existe a função `api/consulta.js`, que:

- repassa a consulta ao endpoint correto do tribunal;
- **descarta processos sigilosos** (`nivelSigilo > 0`);
- remove defensivamente quaisquer campos de partes (a API pública já não os envia);
- restringe o acesso apenas a *aliases* oficiais (`api_publica_*`).

## Recursos

- **Busca por número:** digita-se o número único do CNJ (20 dígitos); o tribunal é
  identificado **automaticamente** a partir dos dígitos do número (Resolução CNJ 65/2008),
  com máscara e validação do dígito verificador.
- **Busca avançada:** seleção de tribunal (todos os do Datajud) + filtros por classe
  (código TPU), órgão julgador e período de ajuizamento. Não há busca por nome de parte.
- Exibição de metadados (classe, órgão, datas, sistema, formato, assuntos) e linha do
  tempo de movimentações.

## Estrutura

| Caminho | O que é |
|---|---|
| `public/index.html` | Página (layout, estilos da marca) |
| `public/app.js` | Lógica: roteamento por número, filtros, renderização |
| `public/assets/` | Logo e fontes da Assertif |
| `api/consulta.js` | Função serverless (proxy do Datajud) |
| `vercel.json` | Configuração da Vercel (tempo máximo da função: 60s) |

## Configuração

A chave pública do Datajud vem embutida na função. Para sobrescrevê-la (caso o CNJ a
atualize), defina a variável de ambiente `DATAJUD_API_KEY` na Vercel — veja o Passo 4 do
guia de publicação.

## Aviso

Ferramenta de caráter **informativo**. Exibe apenas metadados públicos e **não substitui**
certidões ou consultas oficiais nos sistemas dos tribunais. Processos em segredo de
justiça e dados pessoais das partes não são exibidos.

Fonte: Base Nacional de Dados do Poder Judiciário (Datajud) — CNJ.
Documentação da API: https://datajud-wiki.cnj.jus.br/
