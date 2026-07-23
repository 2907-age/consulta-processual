// Função serverless (Vercel) — proxy para a API Pública do Datajud (CNJ).
//
// Por que existe: a API do Datajud não envia cabeçalhos CORS, então o
// navegador não pode chamá-la diretamente. Esta função roda no servidor,
// repassa a consulta ao Datajud e devolve o resultado já filtrado.
//
// Também aplica os resguardos exigidos: descarta processos sigilosos
// (nivelSigilo > 0) e remove qualquer dado de partes que porventura venha.

const DATAJUD_BASE = "https://api-publica.datajud.cnj.jus.br";

// Chave pública oficial do Datajud (publicada na wiki do CNJ). Pode ser
// sobrescrita por variável de ambiente na Vercel, caso o CNJ atualize.
const API_KEY =
  process.env.DATAJUD_API_KEY ||
  "APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

// Somente aliases oficiais do Datajud podem ser consultados. Isto evita que
// a função seja usada para acessar endereços arbitrários (SSRF).
// Padrão: api_publica_<sigla>. Ex.: api_publica_tjsp, api_publica_trf1,
// api_publica_trt15, api_publica_tre-sp, api_publica_stj.
const ALIAS_RE = /^api_publica_[a-z0-9-]{2,20}$/;

// Campos que jamais devem ser expostos (defesa contra dados de parte, caso
// a API algum dia passe a retorná-los). A API pública hoje não os envia.
const CAMPOS_PROIBIDOS = [
  "partes",
  "polos",
  "poloAtivo",
  "poloPassivo",
  "advogados",
  "representantes",
  "nomeParte",
  "documentoParte",
  "cpf",
  "cnpj",
];

function limparSigilo(sub) {
  // Remove campos proibidos de forma recursiva e superficial.
  if (!sub || typeof sub !== "object") return sub;
  for (const campo of CAMPOS_PROIBIDOS) delete sub[campo];
  return sub;
}

export default async function handler(req, res) {
  // CORS — permite que o front-end (mesmo domínio ou outro) chame a função.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return res.status(405).json({ erro: "Método não permitido. Use POST." });

  let corpo = req.body;
  if (typeof corpo === "string") {
    try {
      corpo = JSON.parse(corpo || "{}");
    } catch {
      return res.status(400).json({ erro: "Corpo da requisição inválido." });
    }
  }

  const { alias, query } = corpo || {};

  if (!alias || !ALIAS_RE.test(alias))
    return res
      .status(400)
      .json({ erro: "Tribunal (alias) ausente ou inválido." });

  if (!query || typeof query !== "object")
    return res.status(400).json({ erro: "Consulta (query) ausente." });

  // Monta o corpo enviado ao Datajud. Sempre pede o campo nivelSigilo para
  // conseguirmos filtrar. Limita o tamanho para no máximo 50 resultados.
  const size = Math.min(Number(corpo.size) || 20, 50);
  const payload = { query, size };
  if (Array.isArray(corpo.sort)) payload.sort = corpo.sort;
  if (corpo.search_after) payload.search_after = corpo.search_after;
  if (Number.isInteger(corpo.from)) payload.from = corpo.from;

  const url = `${DATAJUD_BASE}/${alias}/_search`;

  // A API do Datajud pode ser lenta (consultas frias chegam a 30s).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  try {
    const resposta = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resposta.ok) {
      const texto = await resposta.text();
      return res.status(resposta.status).json({
        erro: `O Datajud retornou erro ${resposta.status}.`,
        detalhe: texto.slice(0, 500),
      });
    }

    const dados = await resposta.json();
    const hits = dados?.hits?.hits || [];

    // Filtra sigilo e limpa campos proibidos.
    const publicos = hits.filter((h) => {
      const s = h._source || {};
      return (s.nivelSigilo ?? 0) === 0;
    });
    const removidos = hits.length - publicos.length;

    const processos = publicos.map((h) => ({
      _sort: h.sort, // usado para paginação search_after
      ...limparSigilo(h._source),
    }));

    return res.status(200).json({
      total: dados?.hits?.total?.value ?? processos.length,
      quantidade: processos.length,
      removidosPorSigilo: removidos,
      processos,
    });
  } catch (e) {
    clearTimeout(timeout);
    const abortou = e?.name === "AbortError";
    return res.status(abortou ? 504 : 502).json({
      erro: abortou
        ? "O Datajud demorou para responder. Tente novamente em instantes."
        : "Não foi possível consultar o Datajud no momento.",
    });
  }
}
