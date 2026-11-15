// Sandbox para el código de los agentes: QuickJS compilado a WebAssembly, sin acceso a archivos, red ni procesos.
// Lo único que ve el código son las funciones de `api` (cada llamada cruza como JSON) y un tope de tiempo y memoria.
import { newQuickJSWASMModuleFromVariant, shouldInterruptAfterDeadline } from 'quickjs-emscripten-core';
import variant from '@jitl/quickjs-wasmfile-release-sync';

let mod;
const quickjs = async () => (mod ??= await newQuickJSWASMModuleFromVariant(variant));

const NAME = /^[a-z][a-zA-Z0-9]*$/;
export async function runCode(code, api, { timeoutMs = 10_000, memory = 128 * 1024 * 1024 } = {}) {
  const Q = await quickjs(), rt = Q.newRuntime();
  rt.setMemoryLimit(memory);
  rt.setMaxStackSize(1024 * 1024);
  rt.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + timeoutMs));
  const vm = rt.newContext();
  let error = null;
  try {
    // puente: __host(nombre, argumentos en JSON) → resultado en JSON o {"__error": "..."}
    const host = vm.newFunction('__host', (nameH, argsH) => {
      try {
        const name = vm.getString(nameH), fn = Object.hasOwn(api, name) ? api[name] : null;
        if (!fn) throw new Error(`${name} no existe`);
        const out = fn(...JSON.parse(vm.getString(argsH)));
        return out === undefined ? vm.undefined : vm.newString(JSON.stringify(out));
      } catch (e) { return vm.newString(JSON.stringify({ __error: String(e?.message || e) })); }
    });
    vm.setProp(vm.global, '__host', host);
    host.dispose();
    const names = Object.keys(api).filter(n => NAME.test(n));
    const prelude = `const __call = (n, a) => { const r = __host(n, JSON.stringify(a)); if (r === undefined) return undefined; const v = JSON.parse(r); if (v && typeof v === 'object' && '__error' in v) throw new Error(v.__error); return v; };\n`
      + names.map(n => `const ${n} = (...a) => __call(${JSON.stringify(n)}, a);`).join('\n')
      + (names.includes('print') ? '\nconst console = { log: print, warn: print, error: print };' : '');
    const shift = prelude.split('\n').length + 1;                         // líneas del preámbulo: los errores apuntan al código del agente
    const r = vm.evalCode(`${prelude}\n;(function(){\n${code}\n})();`, 'diseño.js');
    if (r.error) {
      const e = vm.dump(r.error); r.error.dispose();
      const where = e?.stack ? String(e.stack).split('\n').map(l => +(l.match(/diseño\.js:(\d+)/)?.[1] || 0) - shift).filter(n => n > 0).slice(0, 1) : [];
      error = e && typeof e === 'object' ? `${e.name || 'Error'}: ${e.message}${where.length ? ` (línea ${where[0]} de tu código)` : ''}` : String(e);
    }
    else r.value.dispose();
  } catch (e) { error = String(e?.message || e); }
  finally { vm.dispose(); rt.dispose(); }
  if (error && /interrupted/i.test(error)) error = `Tiempo agotado (${timeoutMs / 1000} s): el código tarda demasiado o tiene un bucle infinito`;
  return { error };
}
