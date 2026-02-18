import { createNoise2D } from 'simplex-noise'
import { CHUNK_SIZE, CHUNK_HEIGHT, chunkKey } from './world-types'
import {
  TERRAIN_SCALE,
  TERRAIN_AMPLITUDE,
  TERRAIN_BASE_HEIGHT,
  TERRAIN_HEIGHT_FACTOR,
  DEFAULT_TERRAIN_SEED,
  createSeededRandom,
} from './terrain-params'
import { BlockId } from './blocks'
import { packChunk } from './chunk-packing'
import { placeTrees } from './tree-generation'

const GRASS_CHANCE = 0.56

function getIndex(x: number, y: number, z: number): number {
  return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE
}

function generateChunk(
  noise2D: (x: number, y: number) => number,
  offsetX: number,
  offsetZ: number,
  seed: number,
): Uint8Array {
  const volume = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE)

  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      const worldX = x + offsetX
      const worldZ = z + offsetZ
      const noiseVal = noise2D(worldX * TERRAIN_SCALE, worldZ * TERRAIN_SCALE)
      const height = Math.floor(
        TERRAIN_BASE_HEIGHT + TERRAIN_AMPLITUDE * (noiseVal + 1) * TERRAIN_HEIGHT_FACTOR,
      )

      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        if (y > height) {
          volume[getIndex(x, y, z)] = BlockId.AIR
        } else if (y === height) {
          volume[getIndex(x, y, z)] = BlockId.GRASS_BLOCK
        } else {
          volume[getIndex(x, y, z)] = BlockId.DIRT
        }
      }
    }
  }

  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let y = 0; y < CHUNK_HEIGHT - 1; y++) {
        const idx = getIndex(x, y, z)
        if (volume[idx] === BlockId.GRASS_BLOCK && volume[getIndex(x, y + 1, z)] === BlockId.AIR) {
          let h =
            (offsetX + x) * 374761393 + (offsetZ + z) * 668265263 + y * 2147483647 + seed
          h = Math.imul(h ^ (h >>> 13), 1274126177)
          h = h ^ (h >>> 16)
          if (((h >>> 0) % 1000) / 1000 < GRASS_CHANCE) {
            volume[getIndex(x, y + 1, z)] = BlockId.GRASS
          }
        }
      }
    }
  }

  placeTrees(volume, offsetX, offsetZ, seed)

  return volume
}

self.onmessage = (
  e: MessageEvent<{
    playerX: number
    playerZ: number
    minCX: number
    maxCX: number
    minCZ: number
    maxCZ: number
    seed?: number
  }>,
) => {
  const { playerX, playerZ, minCX, maxCX, minCZ, maxCZ, seed = DEFAULT_TERRAIN_SEED } = e.data
  const noise2D = createNoise2D(createSeededRandom(seed))
  const EXTEND = 32
  const newChunks: Record<string, string> = {}

  const worldMinX = minCX * CHUNK_SIZE
  const worldMaxX = (maxCX + 1) * CHUNK_SIZE
  const worldMinZ = minCZ * CHUNK_SIZE
  const worldMaxZ = (maxCZ + 1) * CHUNK_SIZE

  const needWest = playerX < worldMinX + EXTEND
  const needEast = playerX > worldMaxX - EXTEND
  const needSouth = playerZ < worldMinZ + EXTEND
  const needNorth = playerZ > worldMaxZ - EXTEND

  const toGenerate = new Set<string>()
  if (needWest) {
    for (let cz = minCZ - 1; cz <= maxCZ + 1; cz++) {
      toGenerate.add(chunkKey(minCX - 1, cz))
    }
  }
  if (needEast) {
    for (let cz = minCZ - 1; cz <= maxCZ + 1; cz++) {
      toGenerate.add(chunkKey(maxCX + 1, cz))
    }
  }
  if (needSouth) {
    for (let cx = minCX - 1; cx <= maxCX + 1; cx++) {
      toGenerate.add(chunkKey(cx, minCZ - 1))
    }
  }
  if (needNorth) {
    for (let cx = minCX - 1; cx <= maxCX + 1; cx++) {
      toGenerate.add(chunkKey(cx, maxCZ + 1))
    }
  }

  for (const key of toGenerate) {
    const [cx, cz] = key.split('_').map(Number)
    const offsetX = cx * CHUNK_SIZE
    const offsetZ = cz * CHUNK_SIZE
    const volume = generateChunk(noise2D, offsetX, offsetZ, seed)
    newChunks[key] = packChunk(volume)
  }

  const newBounds = {
    minCX: needWest ? minCX - 1 : minCX,
    maxCX: needEast ? maxCX + 1 : maxCX,
    minCZ: needSouth ? minCZ - 1 : minCZ,
    maxCZ: needNorth ? maxCZ + 1 : maxCZ,
  }

  self.postMessage({ newChunks, newBounds })
}
