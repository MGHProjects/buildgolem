// Correo transaccional por Resend (verificación de email y contraseña olvidada), en el idioma de la cuenta.
// Sin RESEND_API_KEY no se envía nada: el enlace sale en el log del servidor para poder probar en local.
import { RESEND_API_KEY, MAIL_FROM, PUBLIC_URL } from './config.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const TEXT = {
  verify: {
    es: { subject: 'Confirma tu email en BuildGolem', title: 'Confirma tu email', body: 'Pulsa el botón para confirmar que este email es tuyo. El enlace caduca en 24 horas.', cta: 'Confirmar email', foot: 'Si no has creado una cuenta en BuildGolem, ignora este correo.' },
    en: { subject: 'Confirm your email on BuildGolem', title: 'Confirm your email', body: 'Press the button to confirm this email is yours. The link expires in 24 hours.', cta: 'Confirm email', foot: 'If you did not create a BuildGolem account, ignore this email.' },
  },
  reset: {
    es: { subject: 'Cambia tu contraseña de BuildGolem', title: 'Cambia tu contraseña', body: 'Alguien (seguramente tú) ha pedido cambiar la contraseña. El enlace caduca en 1 hora y solo sirve una vez.', cta: 'Elegir contraseña nueva', foot: 'Si no lo has pedido tú, ignora este correo: tu contraseña no cambia.' },
    en: { subject: 'Change your BuildGolem password', title: 'Change your password', body: 'Someone (probably you) asked to change the password. The link expires in 1 hour and works once.', cta: 'Choose a new password', foot: 'If you did not ask for this, ignore this email: your password stays the same.' },
  },
};

export function render(kind, lang, link) {
  const t = TEXT[kind][lang] || TEXT[kind].es;
  const html = `<!doctype html><html><body style="margin:0;background:#121518;padding:32px 16px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#eef1f4">
<table role="presentation" width="100%" style="max-width:520px;margin:0 auto;border:1px solid #333b43;background:#191d21"><tr><td style="padding:28px">
<p style="margin:0 0 20px;font-size:17px;font-weight:600">Build<span style="color:#ffc21a">Golem</span></p>
<h1 style="margin:0 0 12px;font-size:22px">${esc(t.title)}</h1>
<p style="margin:0 0 24px;line-height:1.55;color:#c9d0d6">${esc(t.body)}</p>
<a href="${esc(link)}" style="display:inline-block;background:#ffc21a;color:#1a1405;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:6px;border-bottom:3px solid #b78400">${esc(t.cta)}</a>
<p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#9aa4ae;word-break:break-all">${esc(link)}</p>
<p style="margin:16px 0 0;font-size:12px;color:#9aa4ae">${esc(t.foot)}</p>
</td></tr></table></body></html>`;
  return { subject: t.subject, html, text: `${t.title}\n\n${t.body}\n\n${link}\n\n${t.foot}` };
}

export const linkFor = (kind, tok) => `${PUBLIC_URL}/${kind === 'verify' ? 'verificar' : 'restablecer'}?token=${encodeURIComponent(tok)}`;

export async function sendMail(to, kind, lang, link, { fetchImpl = fetch } = {}) {
  const m = render(kind, lang, link);
  if (!RESEND_API_KEY) { console.log(`[correo sin enviar: falta RESEND_API_KEY] ${kind} → ${to}: ${link}`); return { sent: false }; }
  const r = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(10_000),
    headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: MAIL_FROM, to: [to], subject: m.subject, html: m.html, text: m.text }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return { sent: true };
}
