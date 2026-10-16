/**
 * 零依赖静态服务器，用于本地预览 demo。
 * 用法：npm run demo  然后访问 http://localhost:5173/demo/
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const port = Number(process.env.PORT) || 5173

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`)
    let pathname = decodeURIComponent(url.pathname)
    if (pathname === '/') pathname = '/demo/index.html'
    if (pathname.endsWith('/')) pathname += 'index.html'

    const filePath = join(root, normalize(pathname).replace(/^(\.\.[/\\])+/, ''))
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end('Forbidden')
      return
    }

    const info = await stat(filePath)
    if (!info.isFile()) {
      res.writeHead(404).end('Not Found')
      return
    }

    const body = await readFile(filePath)
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    res.end(body)
  } catch {
    res.writeHead(404).end('Not Found')
  }
})

server.listen(port, () => {
  console.log(`free-watermark demo 已启动：`)
  console.log(`  原生演示   http://localhost:${port}/demo/index.html`)
  console.log(`  自检页面   http://localhost:${port}/demo/self-check.html`)
  console.log(`  Vue 演示   http://localhost:${port}/demo/vue-demo/index.html`)
})
