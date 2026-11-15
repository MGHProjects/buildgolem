// Conversación con los agentes sobre un diseño: preguntas con opciones, pasos del agente en vivo y recarga si edita el diseño.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PaperPlaneRight, ArrowCounterClockwise, X, Stop } from '@phosphor-icons/react';
import { useI18n } from '../i18n.jsx';
import { api, chatStream } from '../api.js';
import { Button, IconButton, Loading, ErrorNote } from '../ui.jsx';

function Questions({ qs, onAnswer }) {
  const { t } = useI18n(), [a, setA] = useState({});
  return (
    <form onSubmit={e => { e.preventDefault(); onAnswer(qs.map((q, i) => `${q.question}\n→ ${a[i] || t('chat.yourcall')}`).join('\n\n')); }} className="grid gap-4 rounded-[6px] border border-accent/50 bg-bg p-4">
      {qs.map((q, i) => (
        <fieldset key={i} className="grid gap-1.5">
          <legend className="mb-1.5 text-sm font-medium leading-snug">{q.question}</legend>
          {(q.options || []).map(o => (
            <label key={o} className="flex min-h-9 items-center gap-2.5 rounded-[4px] border border-line px-2.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/10">
              <input type="radio" name={`q${i}`} value={o} onChange={() => setA({ ...a, [i]: o })} className="size-4" />{o}
            </label>
          ))}
          <input aria-label={t('chat.other')} placeholder={t('chat.other.ph')} onChange={e => setA({ ...a, [i]: e.target.value })} className="min-h-9 rounded-[4px] border border-line bg-surface px-2.5 text-sm placeholder:text-muted" />
        </fieldset>
      ))}
      <div><Button type="submit" size="sm">{t('ed.answer')}</Button></div>
    </form>
  );
}

// tiempo del turno: con modelos que razonan un turno largo es normal, y así se ve que sigue vivo
function Elapsed({ since }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const s = Math.max(0, Math.round((now - since) / 1000));
  return <span className="tabular-nums">{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</span>;
}

export default function Chat({ design, onDesignChanged, onClose }) {
  const { t, lang } = useI18n();
  const [agents, setAgents] = useState([]), [keys, setKeys] = useState(null), [agent, setAgent] = useState('orchestrator'), [msgs, setMsgs] = useState([]);
  const [text, setText] = useState(''), [busy, setBusy] = useState(false), [events, setEvents] = useState([]), [err, setErr] = useState(null);
  const [reconn, setReconn] = useState(false), [since, setSince] = useState(0), [shot, setShot] = useState(null);
  const end = useRef(null), ctl = useRef(null);
  // payload null = engancharse a un turno que ya está en marcha (si no hay ninguno, el servidor responde 204 y no pasa nada)
  const follow = async payload => {
    setErr(null); setEvents([]); setReconn(false); setShot(null);
    if (payload) { setBusy(true); setSince(Date.now()); }
    ctl.current = new AbortController();
    let reload = false;
    try {
      await chatStream(design.id, payload, ev => {
        if (ev.type === 'reconnecting') return setReconn(true);
        setReconn(false); setBusy(true);
        if (ev.n === 0 && ev.at) setSince(ev.at);
        if (ev.type === 'error') setErr(ev.text);
        if ((ev.type === 'done' || ev.type === 'error') && ev.reload) reload = true;
        if (ev.type === 'tool' || ev.type === 'step') setEvents(e => [...e.slice(-40), ev]);
        if (ev.type === 'result' && ev.image) setShot(ev.image);                // render_design: lo que ve el agente
      }, ctl.current.signal);
    } catch (x) { if (x.name === 'AbortError') return; setErr(x.message); }
    setBusy(false); setReconn(false);
    api(`/designs/${design.id}/chat`).then(setMsgs).catch(() => {});   // el historial del servidor manda: respuesta final, preguntas o aviso de corte
    if (reload) onDesignChanged();
  };
  useEffect(() => {
    api('/agents').then(setAgents); api('/keys').then(setKeys).catch(() => setKeys([]));
    api(`/designs/${design.id}/chat`).then(setMsgs).catch(() => {});
    follow(null);
    return () => ctl.current?.abort();                                  // cerrar el chat no para el turno: sigue en el servidor
  }, [design.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, events]);
  const send = async message => {
    if (!message.trim() || busy) return;
    setText('');
    setMsgs(m => [...m, { role: 'user', content: message }]);
    await follow({ message, agent });
  };
  const stop = () => api(`/designs/${design.id}/chat/stop`, { method: 'POST', body: {} }).catch(() => {});
  const lastAsk = [...msgs].reverse().find((m, i) => m.asked && i === 0);
  const current = agents.find(a => a.name === agent);
  return (
    <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto] bg-surface">
      <div className="grid gap-2 border-b border-line p-3">
        <div className="flex items-center gap-1">
          <label htmlFor="ag" className="sr-only">{t('ed.agents')}</label>
          <select id="ag" value={agent} onChange={e => setAgent(e.target.value)} className="min-h-9 min-w-0 flex-1 rounded-[6px] border border-line bg-bg px-2 text-sm font-medium">
            {agents.map(a => <option key={a.name} value={a.name}>{a.title?.[lang] || a.name}</option>)}
          </select>
          <IconButton label={t('ed.clear')} onClick={async () => { await api(`/designs/${design.id}/chat`, { method: 'DELETE' }); setMsgs([]); }}><ArrowCounterClockwise size={17} /></IconButton>
          {onClose && <IconButton side="end" label={t('common.close')} onClick={onClose}><X size={17} /></IconButton>}
        </div>
        {current?.description && <p className="line-clamp-2 text-xs leading-relaxed text-muted">{current.description}</p>}
      </div>
      <div className="grid content-start gap-3 overflow-y-auto p-3" aria-live="polite">
        {keys === null ? <Loading /> : !keys.length && (
          <p className="rounded-[6px] border border-line p-3 text-sm leading-relaxed text-muted">{t('ed.nokey')} <Link to="/app/ajustes" className="text-accent-ink underline-offset-2 hover:underline">{t('nav.settings')}</Link> · <Link to="/guia/ia-gratis" className="text-accent-ink underline-offset-2 hover:underline">{t('nav.freeai')}</Link></p>
        )}
        {keys?.length > 0 && !msgs.length && <p className="text-sm leading-relaxed text-muted">{t('chat.empty')}</p>}
        {msgs.map((m, i) => m.asked ? (m === lastAsk && !busy ? <Questions key={i} qs={JSON.parse(m.content).questions} onAnswer={send} /> : null)
          : <div key={i} className={`max-w-[94%] whitespace-pre-wrap rounded-[6px] border px-3 py-2 text-sm leading-relaxed ${m.role === 'user' ? 'ml-auto border-accent/40 bg-accent/10' : 'border-line bg-bg'}`}>{m.content}</div>)}
        {busy && <div className="grid gap-2">
          <ol className="grid gap-1 border-l border-ink/40 pl-3 font-mono text-xs text-muted" aria-label={t('ed.thinking')}>
            {events.slice(-8).map((e, i) => <li key={i}>{e.type === 'step' ? `→ ${e.agent}` : `${e.agent} · ${e.name}`}</li>)}
            <li className="animate-pulse text-ink">{reconn ? t('chat.reconnecting') : t('ed.thinking')}… {since > 0 && <Elapsed since={since} />}</li>
          </ol>
          {shot && <figure className="grid gap-1"><img src={shot} alt={t('chat.seen')} className="w-full rounded-[6px] border border-line" /><figcaption className="text-xs text-muted">{t('chat.seen')}</figcaption></figure>}
          <div><Button size="sm" variant="secondary" onClick={stop}><Stop size={14} aria-hidden="true" />{t('chat.stop')}</Button></div>
        </div>}
        <ErrorNote error={err} />
        <div ref={end} />
      </div>
      <form onSubmit={e => { e.preventDefault(); send(text); }} className="flex items-end gap-2 border-t border-line p-3">
        <label htmlFor="msg" className="sr-only">{t('ed.placeholder')}</label>
        <textarea id="msg" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }}
          rows={3} placeholder={t('ed.placeholder')} disabled={!keys?.length || busy} className="min-w-0 flex-1 resize-none rounded-[6px] border border-line bg-bg px-3 py-2 text-sm placeholder:text-muted" />
        <Button type="submit" disabled={!keys?.length || busy || !text.trim()} aria-label={t('ed.send')} className="size-10 !px-0"><PaperPlaneRight size={17} /></Button>
      </form>
    </div>
  );
}
