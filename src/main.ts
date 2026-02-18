import './style.css'
import { createRenderer } from './renderer'
import { generateChunk } from './world-generator'
import { createMenu } from './menu'
import { setMemory, getWorldData, saveWorldChunks, DEFAULT_WORLD_NAME } from './memory'
import { getOutdoorPositions, md } from './outdoor'
import { getBlock } from './world-types'
import { isSolid, BlockId, type BlockIdType } from './blocks'
import { CHUNK_SIZE, CHUNK_HEIGHT } from './world-types'

const app = document.getElementById('app')!
const menuContainer = document.getElementById('menu-container') as HTMLDivElement

const INITIAL_RADIUS = 4
let currentDispose: (() => void) | null = null

function createFreshCanvas(): HTMLCanvasElement {
  const existing = document.getElementById('canvas') as HTMLCanvasElement | null
  if (existing) existing.remove()
  const canvas = document.createElement('canvas')
  canvas.id = 'canvas'
  return canvas
}

function findGroundY(chunks: Record<string, Uint8Array>, x: number, z: number): number {
  for (let by = CHUNK_HEIGHT - 1; by >= 0; by--) {
    const b = getBlock(chunks, x, by, z) as BlockIdType
    if (isSolid(b) && b !== BlockId.GRASS) return by + 1
  }
  return 0
}

function startGame(
  chunks: Record<string, Uint8Array>,
  minCX: number,
  maxCX: number,
  minCZ: number,
  maxCZ: number,
  seed: number,
): void {
  if (currentDispose) {
    currentDispose()
    currentDispose = null
  }
  menuContainer.classList.add('hidden')
  const worldMinX = minCX * CHUNK_SIZE
  const worldMaxX = (maxCX + 1) * CHUNK_SIZE
  const worldMinZ = minCZ * CHUNK_SIZE
  const worldMaxZ = (maxCZ + 1) * CHUNK_SIZE
  const centerX = (worldMinX + worldMaxX) / 2
  const centerZ = (worldMinZ + worldMaxZ) / 2
  const groundY = findGroundY(chunks, centerX, centerZ)
  const getGroundY = (x: number, z: number) => findGroundY(chunks, x, z)
  const outdoorPositions = getOutdoorPositions(
    seed,
    centerX,
    groundY,
    centerZ,
    minCX,
    maxCX,
    minCZ,
    maxCZ,
    getGroundY,
  )
  const canvas = createFreshCanvas()
  const ctx = createRenderer(
    canvas,
    chunks,
    minCX,
    maxCX,
    minCZ,
    maxCZ,
    seed,
    outdoorPositions,
    md,
  )
  app.appendChild(canvas)
  currentDispose = ctx.dispose
  ctx.animate()
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
