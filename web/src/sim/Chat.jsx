// Conversación con los agentes sobre un diseño: preguntas con opciones, pasos del agente en vivo y recarga si edita el diseño.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PaperPlaneRight, ArrowCounterClockwise, X } from '@phosphor-icons/react';
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

export default function Chat({ design, onDesignChanged, onClose }) {
  const { t, lang } = useI18n();
  const [agents, setAgents] = useState([]), [keys, setKeys] = useState(null), [agent, setAgent] = useState('orchestrator'), [msgs, setMsgs] = useState([]);
  const [text, setText] = useState(''), [busy, setBusy] = useState(false), [events, setEvents] = useState([]), [err, setErr] = useState(null);
  const end = useRef(null), ctl = useRef(null);
  useEffect(() => {
    api('/agents').then(setAgents); api('/keys').then(setKeys).catch(() => setKeys([]));
    api(`/designs/${design.id}/chat`).then(setMsgs).catch(() => {});
    return () => ctl.current?.abort();
  }, [design.id]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, events]);
  const send = async message => {
    if (!message.trim() || busy) return;
    setErr(null); setBusy(true); setEvents([]); setText('');
    setMsgs(m => [...m, { role: 'user', content: message }]);
    ctl.current = new AbortController();
    let reload = false;
    try {
      await chatStream(design.id, { message, agent }, ev => {
        if (ev.type === 'text' && ev.final) setMsgs(m => [...m, { role: 'assistant', content: ev.text }]);
        else if (ev.type === 'ask') setMsgs(m => [...m, { role: 'assistant', asked: true, content: JSON.stringify({ questions: ev.questions }) }]);
        else if (ev.type === 'error') setErr(ev.text);
        else if (ev.type === 'done') reload = ev.reload;
        else setEvents(e => [...e.slice(-40), ev]);
        if (ev.type === 'result' && (ev.name === 'edit_design' || ev.name === 'set_process')) reload = true;
      }, ctl.current.signal);
    } catch (x) { if (x.name !== 'AbortError') setErr(x.message); }
    setBusy(false);
    if (reload) onDesignChanged();
  };
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
        {busy && <ol className="grid gap-1 border-l border-ink/40 pl-3 font-mono text-xs text-muted" aria-label={t('ed.thinking')}>
          {events.filter(e => e.type === 'tool' || e.type === 'step').slice(-8).map((e, i) => <li key={i}>{e.type === 'step' ? `→ ${e.agent}` : `${e.agent} · ${e.name}`}</li>)}
          <li className="animate-pulse text-ink">{t('ed.thinking')}…</li></ol>}
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
