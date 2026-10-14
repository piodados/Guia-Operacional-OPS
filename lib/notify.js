// Aviso por e-mail quando alguém pede acesso, com links para aprovar ou recusar.
// Usa o Resend (https://resend.com). Sem as variáveis, não envia nada e o cadastro funciona igual.
const { sign } = require('./auth');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

exports.avisarCadastro = async (u) => {
  const key = process.env.RESEND_API_KEY, to = process.env.NOTIFY_EMAIL;
  if (!key || !to) return false;
  let site = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : '');
  site = site.replace(/\/+$/, '');
  const quando = new Date(u.criadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  let linkOk = '', linkNo = '';
  if (site) {
    const t = encodeURIComponent(sign({ k: 'dec', u: u.login, c: u.criadoEm }, 7 * 24 * 3600 * 1000));
    linkOk = `${site}/api/decidir?t=${t}&a=aprovar`;
    linkNo = `${site}/api/decidir?t=${t}&a=recusar`;
  }
  const text = [
    'Um novo usuário pediu acesso ao Guia de Operação.',
    '',
    'Nome: ' + u.nome,
    'Login: ' + u.login,
    'Pedido em: ' + quando,
    '',
    ...(site
      ? ['APROVAR: ' + linkOk, '', 'RECUSAR: ' + linkNo, '', 'Os links valem por 7 dias. Cada um abre uma página pedindo a sua confirmação.']
      : ['Para aprovar ou recusar, abra o guia, toque em "Acesso administrador", entre com o login principal e abra "Usuários e acessos".']),
    '',
    'Se você não conhece essa pessoa, recuse o pedido.',
  ].join('\n');
  const btn = (href, cor, rot) => `<a href="${esc(href)}" style="display:inline-block;background:${cor};color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;margin-right:8px">${rot}</a>`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#2B3350"><p>Um novo usuário pediu acesso ao <b>Guia de Operação</b>.</p>` +
    `<p><b>Nome:</b> ${esc(u.nome)}<br><b>Login:</b> ${esc(u.login)}<br><b>Pedido em:</b> ${esc(quando)}</p>` +
    (site ? `<p>${btn(linkOk, '#0052C2', 'Aprovar')}${btn(linkNo, '#B42318', 'Recusar')}</p><p style="color:#5B6488;font-size:13px">Os links valem por 7 dias. Cada um abre uma página pedindo a sua confirmação.</p>`
          : '<p>Para aprovar ou recusar, abra o guia, toque em <b>Acesso administrador</b>, entre com o login principal e abra <b>Usuários e acessos</b>.</p>') +
    '<p>Se você não conhece essa pessoa, recuse o pedido.</p></div>';
  try {
    const r = await fetch(process.env.MAIL_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || 'Guia Zig <onboarding@resend.dev>',
        to: [to],
        subject: 'Novo pedido de acesso ao Guia de Operação',
        text,
        html,
      }),
      signal: AbortSignal.timeout(5000),
    });
    return r.ok;
  } catch (e) {
    return false; // falha no e-mail nunca impede o cadastro
  }
};
