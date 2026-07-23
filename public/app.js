/* =========================================================================
   Consulta Processual Pública — Assertif
   Lógica de front-end: roteamento por número CNJ, chamada ao proxy e render.
   ========================================================================= */

const ENDPOINT = "/api/consulta";

/* -------------------------------------------------------------------------
   Tabelas oficiais da numeração única (Resolução CNJ nº 65/2008).
   O número tem o formato NNNNNNN-DD.AAAA.J.TR.OOOO:
     J  = segmento do Poder Judiciário
     TR = tribunal dentro do segmento
   ------------------------------------------------------------------------- */

// Justiça Estadual (J=8) e Eleitoral (J=6) usam o código de UF (01..27).
const UF_POR_CODIGO = {
  "01":"ac","02":"al","03":"ap","04":"am","05":"ba","06":"ce","07":"df",
  "08":"es","09":"go","10":"ma","11":"mt","12":"ms","13":"mg","14":"pa",
  "15":"pb","16":"pr","17":"pe","18":"pi","19":"rj","20":"rn","21":"rs",
  "22":"ro","23":"rr","24":"sc","25":"se","26":"sp","27":"to"
};

// Traduz (J, TR) -> alias do Datajud. Retorna null se não for possível inferir.
function aliasPorSegmento(j, tr) {
  const n = parseInt(tr, 10);
  switch (j) {
    case "3": return "api_publica_stj";                    // STJ
    case "4": return n>=1 && n<=6 ? `api_publica_trf${n}` : null; // Justiça Federal
    case "5": return tr==="00" ? "api_publica_tst"         // TST
                    : (n>=1 && n<=24 ? `api_publica_trt${n}` : null); // TRTs
    case "6": if (tr==="00") return "api_publica_tse";      // TSE
              return UF_POR_CODIGO[tr] ? `api_publica_tre-${UF_POR_CODIGO[tr]}` : null;
    case "7": return "api_publica_stm";                     // Justiça Militar da União
    case "8": { // Justiça Estadual
              if (tr==="07") return "api_publica_tjdft";     // DF -> TJDFT
              return UF_POR_CODIGO[tr] ? `api_publica_tj${UF_POR_CODIGO[tr]}` : null;
            }
    case "9": { // Justiça Militar Estadual (só MG, RS, SP)
              const m={"13":"tjmmg","21":"tjmrs","26":"tjmsp"};
              return m[tr] ? `api_publica_${m[tr]}` : null;
            }
    default: return null; // J=1 (STF) e J=2 (CNJ) não têm consulta processual pública aqui
  }
}

/* -------------------------------------------------------------------------
   Lista de tribunais para o seletor da busca avançada.
   ------------------------------------------------------------------------- */
const UFS = [
  ["ac","Acre"],["al","Alagoas"],["ap","Amapá"],["am","Amazonas"],["ba","Bahia"],
  ["ce","Ceará"],["dft","Distrito Federal (TJDFT)"],["es","Espírito Santo"],["go","Goiás"],
  ["ma","Maranhão"],["mt","Mato Grosso"],["ms","Mato Grosso do Sul"],["mg","Minas Gerais"],
  ["pa","Pará"],["pb","Paraíba"],["pr","Paraná"],["pe","Pernambuco"],["pi","Piauí"],
  ["rj","Rio de Janeiro"],["rn","Rio Grande do Norte"],["rs","Rio Grande do Sul"],
  ["ro","Rondônia"],["rr","Roraima"],["sc","Santa Catarina"],["se","Sergipe"],
  ["sp","São Paulo"],["to","Tocantins"]
];

function montarSeletorTribunais() {
  const sel = document.getElementById("trib");
  const grupos = [];

  grupos.push(["Tribunais Superiores", [
    ["api_publica_stj","STJ — Superior Tribunal de Justiça"],
    ["api_publica_tst","TST — Tribunal Superior do Trabalho"],
    ["api_publica_tse","TSE — Tribunal Superior Eleitoral"],
    ["api_publica_stm","STM — Superior Tribunal Militar"],
  ]]);

  grupos.push(["Justiça Federal", Array.from({length:6},(_,i)=>
    [`api_publica_trf${i+1}`,`TRF${i+1} — Tribunal Regional Federal da ${i+1}ª Região`])]);

  grupos.push(["Justiça Estadual",
    UFS.map(([uf,nome])=>[`api_publica_tj${uf}`,`TJ${uf==="dft"?"DFT":uf.toUpperCase()} — ${nome}`])]);

  grupos.push(["Justiça do Trabalho", Array.from({length:24},(_,i)=>
    [`api_publica_trt${i+1}`,`TRT${i+1} — Tribunal Regional do Trabalho da ${i+1}ª Região`])]);

  grupos.push(["Justiça Eleitoral",
    UFS.filter(([uf])=>uf!=="dft").concat([["df","Distrito Federal"]])
       .map(([uf,nome])=>[`api_publica_tre-${uf}`,`TRE-${uf.toUpperCase()} — ${nome}`])]);

  grupos.push(["Justiça Militar Estadual", [
    ["api_publica_tjmmg","TJM-MG — Minas Gerais"],
    ["api_publica_tjmrs","TJM-RS — Rio Grande do Sul"],
    ["api_publica_tjmsp","TJM-SP — São Paulo"],
  ]]);

  sel.innerHTML = '<option value="">Selecione o tribunal…</option>' +
    grupos.map(([g,itens])=>
      `<optgroup label="${g}">`+
      itens.map(([v,t])=>`<option value="${v}">${t}</option>`).join("")+
      `</optgroup>`).join("");
}

/* -------------------------------------------------------------------------
   Número CNJ: limpeza, validação (dígito verificador) e formatação.
   ------------------------------------------------------------------------- */
function soDigitos(s){return (s||"").replace(/\D/g,"")}

function formatarNumero(d){
  d=soDigitos(d).padEnd(20,"").slice(0,20);
  if(d.length<20) return d;
  return `${d.slice(0,7)}-${d.slice(7,9)}.${d.slice(9,13)}.${d.slice(13,14)}.${d.slice(14,16)}.${d.slice(16,20)}`;
}

// Verificador ISO 7064 (mód. 97) usado pelo CNJ.
function digitoVerificadorOk(d){
  if(d.length!==20) return false;
  const seq=d.slice(0,7), dd=d.slice(7,9), ano=d.slice(9,13),
        j=d.slice(13,14), tr=d.slice(14,16), org=d.slice(16,20);
  try{
    const base=BigInt(seq+ano+j+tr+org+"00");
    const dv=98n-(base%97n);
    return String(dv).padStart(2,"0")===dd;
  }catch{return false}
}

function partesNumero(d){
  return {j:d.slice(13,14),tr:d.slice(14,16)};
}

/* -------------------------------------------------------------------------
   Chamada ao proxy serverless.
   ------------------------------------------------------------------------- */
async function consultar(alias, query, extra={}){
  const resp = await fetch(ENDPOINT,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({alias, query, ...extra})
  });
  const dados = await resp.json().catch(()=>({}));
  if(!resp.ok) throw new Error(dados.erro || `Erro ${resp.status}.`);
  return dados;
}

/* -------------------------------------------------------------------------
   UI: estados de carregamento, erro e resultados.
   ------------------------------------------------------------------------- */
const $status = document.getElementById("status");
const $results = document.getElementById("results");

function limpar(){ $status.innerHTML=""; $results.innerHTML=""; }

function mostrarCarregando(){
  $results.innerHTML="";
  $status.innerHTML=`<div class="loading"><div class="spinner"></div>
    Consultando o Datajud…<small>A base pode levar alguns segundos para responder</small></div>`;
}

function mostrarMensagem(texto,tipo="msg"){
  $results.innerHTML="";
  $status.innerHTML=`<div class="msg ${tipo}">${texto}</div>`;
}

function fmtData(v){
  if(!v) return "—";
  // formatos possíveis: "AAAAMMDDHHMMSS" ou ISO "AAAA-MM-DDT..."
  let s=String(v);
  if(/^\d{8,14}$/.test(s)) s=`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  const d=new Date(s);
  if(isNaN(d)) return "—";
  return d.toLocaleDateString("pt-BR");
}
function fmtDataHora(v){
  const d=new Date(v);
  if(isNaN(d)) return "—";
  return d.toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
}
function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}

function renderProcesso(p){
  const assuntos=(p.assuntos||[]).map(a=>`<span class="badge">${esc(a.nome||a.codigo)}</span>`).join("");
  const movs=[...(p.movimentos||[])].sort((a,b)=>new Date(b.dataHora)-new Date(a.dataHora));
  const LIM=5;
  const linhaMov=m=>{
    const cx=(m.complementosTabelados||[]).map(c=>esc(c.nome||c.descricao)).filter(Boolean).join(" · ");
    return `<li><time>${fmtDataHora(m.dataHora)}</time>
      <div class="mv">${esc(m.nome||("Código "+m.codigo))}</div>
      ${cx?`<div class="cx">${cx}</div>`:""}</li>`;
  };
  const visiveis=movs.slice(0,LIM).map(linhaMov).join("");
  const ocultos=movs.slice(LIM).map(linhaMov).join("");

  return `<article class="proc">
    <div class="proc-head">
      <div class="proc-num">${esc(formatarNumero(p.numeroProcesso))}</div>
      <span class="proc-trib">${esc(p.tribunal||"")}${p.grau?" · "+esc(p.grau):""}</span>
    </div>
    <div class="proc-body">
      <dl class="meta">
        <div><dt>Classe</dt><dd>${esc(p.classe?.nome||"—")}</dd></div>
        <div><dt>Órgão julgador</dt><dd>${esc(p.orgaoJulgador?.nome||"—")}</dd></div>
        <div><dt>Ajuizamento</dt><dd>${fmtData(p.dataAjuizamento)}</dd></div>
        <div><dt>Última atualização</dt><dd>${fmtData(p.dataHoraUltimaAtualizacao)}</dd></div>
        <div><dt>Sistema</dt><dd>${esc(p.sistema?.nome||"—")}</dd></div>
        <div><dt>Formato</dt><dd>${esc(p.formato?.nome||"—")}</dd></div>
      </dl>
      ${assuntos?`<div class="badges">${assuntos}</div>`:""}
      ${movs.length?`<div class="movs-title">Movimentações (${movs.length})</div>
        <ul class="tl">${visiveis}<span class="tl-mais">${ocultos}</span></ul>
        ${ocultos?`<button class="more" data-mais>Ver todas as ${movs.length} movimentações</button>`:""}`:""}
    </div>
  </article>`;
}

function renderResultados(dados){
  $status.innerHTML="";
  const {processos=[],total=0,removidosPorSigilo=0}=dados;
  if(!processos.length){
    mostrarMensagem("Nenhum processo público encontrado para os critérios informados. Verifique o número ou os filtros. Processos em segredo de justiça não são exibidos.");
    return;
  }
  const nota = removidosPorSigilo>0
    ? ` · ${removidosPorSigilo} ocultado(s) por sigilo`
    : "";
  $results.innerHTML =
    `<p class="resumo">${processos.length} de ${total} resultado(s)${nota}</p>` +
    processos.map(renderProcesso).join("");

  // expandir movimentações
  $results.querySelectorAll(".tl-mais").forEach(el=>el.style.display="none");
  $results.querySelectorAll("[data-mais]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const mais=btn.previousElementSibling.querySelector(".tl-mais");
      if(mais){mais.style.display="contents";btn.remove();}
    });
  });
}

/* -------------------------------------------------------------------------
   Ações dos botões.
   ------------------------------------------------------------------------- */
async function buscarPorNumero(){
  const bruto=document.getElementById("numero").value;
  const d=soDigitos(bruto);
  const hint=document.getElementById("hint-num");

  if(d.length!==20){
    hint.className="hint err";
    hint.textContent="O número deve ter 20 dígitos.";
    return;
  }
  const {j,tr}=partesNumero(d);
  const alias=aliasPorSegmento(j,tr);
  if(!alias){
    hint.className="hint err";
    hint.textContent="Não foi possível identificar o tribunal a partir deste número. Use a busca avançada.";
    return;
  }
  hint.className="hint"; hint.textContent="Tribunal identificado. Consultando…";

  const btn=document.getElementById("btn-num");
  btn.disabled=true; btn.textContent="Consultando…";
  limpar(); mostrarCarregando();
  try{
    const dados=await consultar(alias,{match:{numeroProcesso:d}},{size:5});
    renderResultados(dados);
    hint.className="hint ok"; hint.textContent="Consulta concluída.";
  }catch(e){
    mostrarMensagem(esc(e.message),"error");
    hint.className="hint"; hint.textContent="";
  }finally{
    btn.disabled=false; btn.textContent="Consultar";
  }
}

async function buscarAvancada(){
  const alias=document.getElementById("trib").value;
  const classe=soDigitos(document.getElementById("classe").value);
  const orgao=soDigitos(document.getElementById("orgao").value);
  const de=document.getElementById("de").value;
  const ate=document.getElementById("ate").value;
  const hint=document.getElementById("hint-adv");

  if(!alias){hint.className="hint err";hint.textContent="Selecione um tribunal.";return;}
  const must=[];
  if(classe) must.push({match:{"classe.codigo":Number(classe)}});
  if(orgao) must.push({match:{"orgaoJulgador.codigo":Number(orgao)}});
  if(de||ate){
    const range={};
    if(de) range.gte=de.replace(/-/g,"")+"000000";
    if(ate) range.lte=ate.replace(/-/g,"")+"235959";
    must.push({range:{dataAjuizamento:range}});
  }
  if(!must.length){hint.className="hint err";hint.textContent="Informe ao menos um filtro (classe, órgão ou período).";return;}
  hint.className="hint"; hint.textContent="";

  const btn=document.getElementById("btn-adv");
  btn.disabled=true; btn.textContent="Buscando…";
  limpar(); mostrarCarregando();
  try{
    const dados=await consultar(alias,{bool:{must}},{
      size:20, sort:[{"@timestamp":{order:"desc"}}]
    });
    renderResultados(dados);
  }catch(e){
    mostrarMensagem(esc(e.message),"error");
  }finally{
    btn.disabled=false; btn.textContent="Buscar processos";
  }
}

/* -------------------------------------------------------------------------
   Ligações de eventos.
   ------------------------------------------------------------------------- */
function trocarAba(alvo){
  const abas={num:["tab-num","pane-num"],adv:["tab-adv","pane-adv"]};
  for(const [k,[tabId,paneId]] of Object.entries(abas)){
    const sel=k===alvo;
    document.getElementById(tabId).setAttribute("aria-selected",sel);
    document.getElementById(paneId).classList.toggle("active",sel);
  }
  limpar();
}

document.addEventListener("DOMContentLoaded",()=>{
  montarSeletorTribunais();
  document.getElementById("tab-num").addEventListener("click",()=>trocarAba("num"));
  document.getElementById("tab-adv").addEventListener("click",()=>trocarAba("adv"));
  document.getElementById("btn-num").addEventListener("click",buscarPorNumero);
  document.getElementById("btn-adv").addEventListener("click",buscarAvancada);

  // máscara + validação em tempo real do número
  const inp=document.getElementById("numero");
  const hint=document.getElementById("hint-num");
  inp.addEventListener("input",()=>{
    const d=soDigitos(inp.value);
    const pos=inp.selectionStart;
    if(d.length===20){
      inp.value=formatarNumero(d);
      const {j,tr}=partesNumero(d);
      const alias=aliasPorSegmento(j,tr);
      if(!alias){hint.className="hint warn";hint.textContent="Tribunal não identificado — verifique o número.";}
      else if(!digitoVerificadorOk(d)){hint.className="hint warn";hint.textContent="Dígito verificador não confere, mas a consulta pode ser tentada.";}
      else{hint.className="hint ok";hint.textContent="Número válido. Pronto para consultar.";}
    }else{
      inp.value=d; // mantém só dígitos enquanto digita
      hint.className="hint";
      hint.textContent=`${d.length}/20 dígitos.`;
      try{inp.setSelectionRange(pos,pos)}catch{}
    }
  });
  inp.addEventListener("keydown",e=>{if(e.key==="Enter")buscarPorNumero()});
});
