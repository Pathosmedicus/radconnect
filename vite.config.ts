import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Surge.sh liefert `200.html` für unbekannte Routen aus (SPA-Fallback).
// Netlify/Vercel nutzen index.html bzw. vercel.json / _redirects.
function spaFallback(): Plugin {
  return {
    name: 'spa-fallback-200',
    apply: 'build',
    closeBundle() {
      const index = resolve(__dirname, 'dist/index.html');
      if (existsSync(index)) {
        copyFileSync(index, resolve(__dirname, 'dist/200.html'));
        copyFileSync(index, resolve(__dirname, 'dist/404.html'));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), spaFallback()],
  build: { outDir: 'dist', sourcemap: false },
});
