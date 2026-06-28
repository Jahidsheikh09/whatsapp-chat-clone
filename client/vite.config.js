import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  if (mode === 'production' && env.VERCEL && !env.VITE_API_URL && !env.VITE_SERVER_URL) {
    console.warn(
      '\n[Vercel] VITE_API_URL / VITE_SERVER_URL are not set.\n' +
        'Add them in Vercel → Project → Settings → Environment Variables,\n' +
        'then redeploy so the frontend can reach your Render backend.\n'
    )
  }

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      port: 5173,
      host: true,
    },
  }
})

