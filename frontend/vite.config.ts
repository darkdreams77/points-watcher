import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/points-watcher/', // nom du repo GitHub
  plugins: [react(), tailwindcss(),],
});
