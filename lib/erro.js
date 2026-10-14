// Traduz falhas de configuração em mensagens que dizem o que falta (sem expor segredos).
module.exports = (e) => {
  const m = String((e && e.message) || e);
  console.error('[guia]', m);
  if (/SESSION_SECRET/.test(m)) return 'Falta a variável SESSION_SECRET no Vercel (texto com pelo menos 16 caracteres). Cadastre e faça Redeploy.';
  if (/Banco de dados não configurado/.test(m)) return 'O banco (Upstash) não está conectado ao projeto. Conecte em Storage e faça Redeploy.';
  if (/Erro no banco|fetch failed|WRONGPASS|NOAUTH|Unauthorized/i.test(m)) return 'O banco (Upstash) recusou a conexão. Confira as variáveis KV_REST_API_URL e KV_REST_API_TOKEN e faça Redeploy.';
  return 'Erro no servidor.';
};
