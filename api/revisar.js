// Revisão ortográfica das edições de texto (só administradores). Usa o LanguageTool (pt-BR).
// Os textos são enviados ao serviço apenas para a verificação e não são guardados aqui.
const { verify } = require('../lib/auth');

const URL_LT = () => process.env.LT_API_URL || 'https://api.languagetool.org/v2/check';
// Regras de estilo/pontuação que só atrapalham textos curtos de procedimento
const IGNORAR = /UPPERCASE_SENTENCE_START|WHITESPACE|PUNCTUATION|COMMA|DOUBLE_PUNCTUATION|SENTENCE_WHITESPACE|PT_BR_SIMPLE_REPLACE|ESTILO|REPEATED/i;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const h = req.headers.authorization || '';
    const pl = verify(h.startsWith('Bearer ') ? h.slice(7) : '');
    if (!pl || (pl.role !== 'master' && pl.role !== 'editor')) return res.status(401).json({ erro: 'Sessão expirada. Entre novamente como administrador.' });
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const textos = (Array.isArray(b.textos) ? b.textos : []).slice(0, 4).map((t) => String(t == null ? '' : t).slice(0, 4000));
    // Um só pedido: os campos vão separados por linha em branco e os deslocamentos voltam para cada campo.
    const SEP = '\n\n';
    const ini = [];
    let pos = 0;
    for (const t of textos) { ini.push(pos); pos += t.length + SEP.length; }
    const junto = textos.join(SEP);
    if (!junto.trim()) return res.status(200).json({ itens: [] });

    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 9000);
    let j;
    try {
      const r = await fetch(URL_LT(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({ text: junto, language: 'pt-BR' }).toString(),
        signal: ctl.signal,
      });
      if (!r.ok) throw new Error('LT ' + r.status);
      j = await r.json();
    } finally {
      clearTimeout(to);
    }

    const itens = [];
    for (const m of j.matches || []) {
      const id = (m.rule && m.rule.id) || '';
      const cat = (m.rule && m.rule.category && m.rule.category.id) || '';
      if (IGNORAR.test(id) || !/TYPOS|GRAMMAR|CONFUSED|MISSPELL|SPELL/i.test(cat + ' ' + id)) continue;
      const o = m.offset;
      let c = ini.length - 1;
      while (c > 0 && ini[c] > o) c--;
      const local = o - ini[c];
      if (local < 0 || local + m.length > textos[c].length) continue;
      const s = (m.replacements || []).map((x) => String(x.value)).filter(Boolean).slice(0, 4);
      itens.push({ c, o: local, n: m.length, w: textos[c].substr(local, m.length), m: String(m.shortMessage || m.message || '').slice(0, 160), s });
    }
    return res.status(200).json({ itens: itens.slice(0, 40) });
  } catch (e) {
    console.error('[guia] revisar:', e && e.message);
    return res.status(502).json({ erro: 'Não foi possível consultar o corretor agora.' });
  }
};
