import { createNoise2D } from 'simplex-noise'
import {
  TERRAIN_SCALE,
  TERRAIN_AMPLITUDE,
  TERRAIN_BASE_HEIGHT,
  TERRAIN_HEIGHT_FACTOR,
  DEFAULT_TERRAIN_SEED,
  createSeededRandom,
} from './terrain-params'
import { BlockId } from './blocks'
import { placeTrees } from './tree-generation'

export const CHUNK_SIZE = 32
export const CHUNK_HEIGHT = 32

const GRASS_CHANCE = 0.56

function getIndex(x: number, y: number, z: number): number {
  return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE
}

export function generateChunk(
  offsetX = 0,
  offsetZ = 0,
  seed = DEFAULT_TERRAIN_SEED,
  spawnX?: number,
  spawnZ?: number,
): Uint8Array {
  const volume = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE)
  const noise2D = createNoise2D(createSeededRandom(seed))

  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      const worldX = x + offsetX
      const worldZ = z + offsetZ

      const noiseVal = noise2D(worldX * TERRAIN_SCALE, worldZ * TERRAIN_SCALE)
      const height = Math.floor(
        TERRAIN_BASE_HEIGHT + TERRAIN_AMPLITUDE * (noiseVal + 1) * TERRAIN_HEIGHT_FACTOR,
      )

      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        const index = getIndex(x, y, z)
        if (y > height) {
          volume[index] = BlockId.AIR
        } else if (y === height) {
          volume[index] = BlockId.GRASS_BLOCK
        } else {
          volume[index] = BlockId.DIRT
        }
      }
    }
  }

  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let y = 0; y < CHUNK_HEIGHT - 1; y++) {
        const idx = getIndex(x, y, z)
        if (volume[idx] === BlockId.GRASS_BLOCK && volume[getIndex(x, y + 1, z)] === BlockId.AIR) {
          let h = (offsetX + x) * 374761393 + (offsetZ + z) * 668265263 + y * 2147483647 + seed
          h = Math.imul(h ^ (h >>> 13), 1274126177)
          h = h ^ (h >>> 16)
          if (((h >>> 0) % 1000) / 1000 < GRASS_CHANCE) {
            volume[getIndex(x, y + 1, z)] = BlockId.GRASS
          }
        }
      }
    }
  }

  placeTrees(volume, offsetX, offsetZ, seed, spawnX, spawnZ)

  return volume
}

