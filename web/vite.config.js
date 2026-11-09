import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { resolve } from 'node:path';

// el motor vive en ../engine y usa "three": se resuelve siempre al three de la web para no cargarlo dos veces
export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: {
    alias: [
      { find: /^three\/addons\/(.*)$/, replacement: resolve('node_modules/three/examples/jsm') + '/$1' },
      { find: /^three$/, replacement: resolve('node_modules/three/build/three.module.js') },
      { find: '@engine', replacement: resolve('../engine') },
    ],
  },
  server: { port: 5173, proxy: { '/api': 'http://127.0.0.1:8099' }, fs: { allow: ['..'] } },
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
});
