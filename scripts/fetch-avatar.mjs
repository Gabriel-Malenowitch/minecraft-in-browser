import { mkdir, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const AVATAR_URL = 'https://github.com/Gabriel-Malenowitch.png'
const OUT = join(__dirname, '..', 'public', 'avatar.png')

const res = await fetch(AVATAR_URL, { redirect: 'follow' })
if (!res.ok) throw new Error(`Failed to fetch avatar: ${res.status}`)
const buf = Buffer.from(await res.arrayBuffer())
await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, buf)
console.log('Avatar saved to public/avatar.png')
