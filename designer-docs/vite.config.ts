import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const designerAssetsRoot = path.resolve(rootDir, '../designer_assets')
const catMafiaAssetsRoot = path.resolve(
  rootDir,
  '../third_party/web-sdk/apps/cat_mafia/static/assets',
)

const MIME: Record<string, string> = {
  '.json': 'application/json',
  '.atlas': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
}

function serveStaticMount(mount: string, assetsRoot: string, name: string): Plugin {
  const handler = (
    req: { url?: string },
    res: {
      statusCode: number
      setHeader: (name: string, value: string) => void
      end: (body?: string) => void
    },
    next: () => void,
  ) => {
    const raw = req.url?.split('?')[0] ?? ''
    const rel = decodeURIComponent(raw.replace(/^\/+/, ''))
    const filePath = path.normalize(path.join(assetsRoot, rel))

    if (!filePath.startsWith(assetsRoot)) {
      res.statusCode = 403
      res.end('Forbidden')
      return
    }

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        next()
        return
      }
      const ext = path.extname(filePath).toLowerCase()
      res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream')
      res.setHeader('Cache-Control', 'no-cache')
      fs.createReadStream(filePath).pipe(res as unknown as NodeJS.WritableStream)
    })
  }

  return {
    name,
    configureServer(server) {
      server.middlewares.use(mount, handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(mount, handler)
    },
    closeBundle() {
      const outDir = path.resolve(rootDir, `dist${mount}`)
      if (!fs.existsSync(assetsRoot)) return
      fs.mkdirSync(outDir, { recursive: true })
      fs.cpSync(assetsRoot, outDir, { recursive: true })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    serveStaticMount('/designer-assets', designerAssetsRoot, 'serve-designer-assets'),
    serveStaticMount('/cat-mafia-assets', catMafiaAssetsRoot, 'serve-cat-mafia-assets'),
  ],
  resolve: {
    alias: {
      '@assets': designerAssetsRoot,
    },
  },
  server: {
    host: true,
    port: 3010,
    fs: {
      allow: [rootDir, path.resolve(rootDir, '..')],
    },
  },
})
