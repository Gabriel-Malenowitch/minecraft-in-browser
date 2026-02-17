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
): void {
  menuContainer.classList.add('hidden')
  const { animate } = createRenderer(canvas, chunks, minCX, maxCX, minCZ, maxCZ)
  animate()
}

menuContainer.appendChild(
  createMenu((action) => {
    if (action === 'create') {
      const chunks: Record<string, Uint8Array> = {}
      for (let cz = -INITIAL_RADIUS; cz <= INITIAL_RADIUS; cz++) {
        for (let cx = -INITIAL_RADIUS; cx <= INITIAL_RADIUS; cx++) {
          const key = `${cx}_${cz}`
          chunks[key] = generateChunk(cx * 32, cz * 32)
        }
      }
      setMemory({ [DEFAULT_WORLD_NAME]: {} })
      saveWorldChunks(chunks, -INITIAL_RADIUS, INITIAL_RADIUS, -INITIAL_RADIUS, INITIAL_RADIUS)
      startGame(chunks, -INITIAL_RADIUS, INITIAL_RADIUS, -INITIAL_RADIUS, INITIAL_RADIUS)
    } else {
      const data = getWorldData()
      if (data) {
        startGame(data.chunks, data.minCX, data.maxCX, data.minCZ, data.maxCZ)
      }
    }
  }),
)
