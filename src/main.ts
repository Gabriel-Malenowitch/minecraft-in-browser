import './style.css'
import { createRenderer } from './renderer'
import { generateChunk } from './world-generator'
import { createMenu } from './menu'
import { setMemory, getWorldData, saveWorldChunks, DEFAULT_WORLD_NAME } from './memory'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const menuContainer = document.getElementById('menu-container') as HTMLDivElement

const INITIAL_RADIUS = 4

function startGame(
  chunks: Record<string, Uint8Array>,
  minCX: number,
  maxCX: number,
  minCZ: number,
  maxCZ: number,
  seed: number,
): void {
  menuContainer.classList.add('hidden')
  const { animate } = createRenderer(canvas, chunks, minCX, maxCX, minCZ, maxCZ, seed)
  animate()
}

menuContainer.appendChild(
  createMenu((action) => {
    if (action === 'create') {
      const seed = Math.floor(Math.random() * 0x7fffffff) + 1
      const chunks: Record<string, Uint8Array> = {}
      for (let cz = -INITIAL_RADIUS; cz <= INITIAL_RADIUS; cz++) {
        for (let cx = -INITIAL_RADIUS; cx <= INITIAL_RADIUS; cx++) {
          const key = `${cx}_${cz}`
          chunks[key] = generateChunk(cx * 32, cz * 32, seed)
        }
      }
      setMemory({ [DEFAULT_WORLD_NAME]: {} })
      saveWorldChunks(
        chunks,
        -INITIAL_RADIUS,
        INITIAL_RADIUS,
        -INITIAL_RADIUS,
        INITIAL_RADIUS,
        seed,
      )
      startGame(chunks, -INITIAL_RADIUS, INITIAL_RADIUS, -INITIAL_RADIUS, INITIAL_RADIUS, seed)
    } else {
      const data = getWorldData()
      if (data) {
        startGame(data.chunks, data.minCX, data.maxCX, data.minCZ, data.maxCZ, data.seed)
      }
    }
  }),
)
