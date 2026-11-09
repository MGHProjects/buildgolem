// Tema antes de pintar (sin parpadeo): lo guardado o, si no hay, el del sistema.
let saved = null;
try { saved = localStorage.getItem('cm-theme'); } catch { /* almacenamiento bloqueado */ }
document.documentElement.dataset.theme = saved || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
