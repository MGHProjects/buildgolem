// h('div', { class, onclick, html, ...atributos }, ...hijos): crea un elemento; los hijos null/false se ignoran
export function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.replaceChildren(sanitize(v));
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k in e && typeof v !== 'string') e[k] = v;
    else e.setAttribute(k, v);
  }
  e.append(...kids.flat(Infinity).filter(x => x != null && x !== false));
  return e;
}
export const $ = id => document.getElementById(id);
export const fmt = x => Math.round(x).toLocaleString('es');

// HTML de fichas e información: solo etiquetas de formato y enlaces https; todo lo demás se queda en texto
const OK = new Set(['B', 'STRONG', 'I', 'EM', 'SMALL', 'CODE', 'BR', 'P', 'UL', 'OL', 'LI', 'SUB', 'SUP', 'A']);
export function sanitize(html) {
  const tpl = document.createElement('template'); tpl.innerHTML = String(html);
  const clean = node => {
    for (const ch of [...node.childNodes]) {
      if (ch.nodeType === 3) continue;
      if (ch.nodeType !== 1 || !OK.has(ch.tagName)) { ch.replaceWith(document.createTextNode(ch.textContent || '')); continue; }
      for (const a of [...ch.attributes]) if (!(ch.tagName === 'A' && a.name === 'href' && /^https:\/\//.test(a.value))) ch.removeAttribute(a.name);
      if (ch.tagName === 'A') { ch.setAttribute('rel', 'noopener noreferrer nofollow'); ch.setAttribute('target', '_blank'); }
      clean(ch);
    }
  };
  clean(tpl.content);
  return tpl.content;
}
