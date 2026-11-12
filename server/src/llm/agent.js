// Bucle de un agente: modelo → herramientas → resultados → siguiente paso, hasta respuesta final o el máximo de pasos.
// Con tool_mode "json" (modelos sin herramientas nativas) cada respuesta es un objeto {"tool","args"} o {"answer"}, con 2 reintentos.
import { chat, extractJson } from './providers.js';
import { getAgents, listSkills, readSkill } from './catalog.js';
import { TOOL_DEFS, runTool } from './tools.js';
import { AGENT_MAX_STEPS } from '../config.js';

// razonamiento que algunos modelos (DeepSeek, Qwen…) escriben en el texto: no es para el jugador
export const cleanText = s => String(s || '').replace(/<(think|thought|thinking)>[\s\S]*?<\/\1>/gi, '').replace(/^[\s\S]*?<\/(think|thought|thinking)>/i, '').trim();

function systemPrompt(agent, ctx, json) {
  const skills = listSkills(ctx.workspaceId), allowed = agent.skills || [], preload = agent.preload || [];
  // las skills de siempre van ya dentro (ahorra un paso por skill y el prefijo estable se cachea); el resto, en la lista
  const skillList = Object.entries(skills).filter(([k]) => !preload.includes(k) && (allowed.includes(k) || k.startsWith('mods/'))).map(([k, s]) => `- ${k}: ${s.description || ''}`).join('\n');
  const loaded = preload.map(k => readSkill(k, ctx.workspaceId)).filter(Boolean);
  const sig = d => Object.keys(d.parameters?.properties || {}).map(k => (d.parameters.required || []).includes(k) ? k : k + '?').join(', ');
  const tools = (agent.tools || []).filter(t => TOOL_DEFS[t]).map(t => `- ${t}(${sig(TOOL_DEFS[t])}): ${TOOL_DEFS[t].description}`).join('\n');
  return [agent.prompt,
    `Idioma del jugador: ${ctx.lang === 'en' ? 'inglés' : 'español'}. Workspace: ${ctx.workspaceName || 'ninguno'}${ctx.mcVersion ? ` (Minecraft ${ctx.mcVersion})` : ''}.`,
    ...loaded,
    skillList && `Más skills (cárgalas con read_skill cuando las necesites):\n${skillList}`,
    json && `${readSkill('json-protocol') || ''}\n\nHerramientas:\n${tools}\n\nResponde SIEMPRE con un único objeto JSON: {"tool": "...", "args": {...}} o {"answer": "..."}.`,
  ].filter(Boolean).join('\n\n');
}

// emit(event): {type: 'step'|'tool'|'result'|'text'|'ask'|'error'|'done', ...}
export async function runAgent(agentName, history, ctx, emit, depth = 0) {
  const agent = getAgents()[agentName];
  if (!agent) throw new Error(`Agente desconocido: ${agentName}`);
  const json = ctx.key.toolMode === 'json', tools = (agent.tools || []).filter(t => TOOL_DEFS[t]).map(t => ({ name: t, ...TOOL_DEFS[t] }));
  const messages = [{ role: 'system', content: systemPrompt(agent, ctx, json) }, ...history];
  const send = extra => (ctx.chat || chat)({ ...ctx.key, messages, signal: ctx.signal, ...extra });   // ctx.chat: modelo simulado en pruebas
  let asked = null, retries = 0;
  const sub = {
    ...ctx,
    onAsk: q => { asked = q; emit({ type: 'ask', agent: agentName, questions: q }); },
    runAgent: async (name, task) => {
      if (depth >= 2) return 'No se pueden encadenar más de 2 niveles de agentes.';
      emit({ type: 'step', agent: name, text: task.slice(0, 200) });
      const r = await runAgent(name, [{ role: 'user', content: task }], ctx, emit, depth + 1);
      return r.text || '(sin respuesta)';
    },
  };
  // preguntas escritas como texto ({"questions": […]}) en vez de llamar a ask_user: se tratan igual
  const textQuestions = text => {
    if (!agent.tools?.includes('ask_user') || !/"questions"\s*:/.test(text)) return null;
    const q = extractJson(text)?.questions;
    return Array.isArray(q) && q.length ? q : null;
  };
  const steps = +agent.steps || AGENT_MAX_STEPS;
  for (let step = 0; step < steps; step++) {
    if (ctx.signal?.aborted) throw new Error('Cancelado');
    const r = await send({ tools: json ? undefined : tools });
    const text = cleanText(r.text);
    let calls = r.toolCalls;
    if (json) {
      const j = extractJson(text), q = textQuestions(text);
      if (q) { sub.onAsk(q); return { text: '', asked, messages }; }
      if (!j || (!j.tool && j.answer == null)) {
        if (++retries > 2) return { text, messages };
        messages.push({ role: 'assistant', content: r.text }, { role: 'user', content: 'Formato no válido. Responde solo con {"tool": "...", "args": {...}} o {"answer": "..."}.' });
        continue;
      }
      if (j.answer != null) { const a = cleanText(j.answer); emit({ type: 'text', agent: agentName, text: a, final: depth === 0 }); return { text: a, messages }; }
      calls = [{ id: `j${step}`, name: j.tool, args: j.args || {} }];
      messages.push({ role: 'assistant', content: text });   // sin el razonamiento: no hace falta reenviarlo en cada paso
    } else {
      const q = !calls.length && textQuestions(text);
      if (q) { sub.onAsk(q); return { text: '', asked, messages }; }
      if (text) emit({ type: 'text', agent: agentName, text, final: !calls.length && depth === 0 });
      if (!calls.length) return { text, messages };
      messages.push({ role: 'assistant', content: text, toolCalls: calls });
    }
    for (const call of calls) {
      emit({ type: 'tool', agent: agentName, name: call.name, args: call.args });
      let out;
      try {
        if (!agent.tools.includes(call.name)) throw new Error(`El agente ${agentName} no puede usar ${call.name}`);
        out = await runTool(call.name, call.args || {}, sub);
      } catch (e) { out = `Error: ${e.message}`; }
      emit({ type: 'result', agent: agentName, name: call.name, text: String(out).slice(0, 600) });
      if (json) messages.push({ role: 'user', content: `Resultado de ${call.name}: ${out}` });
      else messages.push({ role: 'tool', toolCallId: call.id, name: call.name, content: String(out) });
    }
    if (asked) return { text: '', asked, messages };
  }
  // sin pasos: un último turno sin herramientas para que diga qué ha hecho y qué falta (a quien le encargó la tarea le sirve más que un aviso)
  messages.push({ role: 'user', content: 'Has llegado al límite de pasos. Sin usar herramientas, resume en pocas líneas qué has hecho, qué falta y qué harías después.' });
  const raw = (await send({})).text, last = cleanText((json && extractJson(raw)?.answer) || raw);
  const text = (last || 'He llegado al máximo de pasos.') + (depth === 0 ? '\n\n(Límite de pasos: dime si continúo.)' : '');
  emit({ type: 'text', agent: agentName, text, final: depth === 0 });
  return { text, messages };
}
