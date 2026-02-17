import './style.css'
import { createRenderer } from './renderer'
import { buildChunkMesh } from './chunk-mesh'
import { generateChunk, CHUNK_SIZE, CHUNK_HEIGHT } from './world-generator'
import { createMenu } from './menu'
import { setMemory, getWorldData, saveWorldData, DEFAULT_WORLD_NAME } from './memory'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const menuContainer = document.getElementById('menu-container') as HTMLDivElement

function startGame(volume: Uint8Array, chunkSize: number, chunkHeight: number): void {
  menuContainer.classList.add('hidden')
  const chunkMesh = buildChunkMesh(volume, chunkSize, chunkHeight)
  const { scene, animate } = createRenderer(canvas)
  scene.add(chunkMesh)
  animate()
}

menuContainer.appendChild(
  createMenu((action) => {
    if (action === 'create') {
      const volume = generateChunk(0, 0)
      setMemory({ [DEFAULT_WORLD_NAME]: {} })
      saveWorldData(volume, CHUNK_SIZE, CHUNK_HEIGHT)
      startGame(volume, CHUNK_SIZE, CHUNK_HEIGHT)
    } else {
      const data = getWorldData()
      if (data) {
        startGame(data.volume, data.chunkSize, data.chunkHeight)
      }
    }
  }),
)
