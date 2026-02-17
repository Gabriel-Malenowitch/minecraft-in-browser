import { createNoise2D } from 'simplex-noise'
import {
  TERRAIN_SCALE,
  TERRAIN_AMPLITUDE,
  TERRAIN_BASE_HEIGHT,
  TERRAIN_HEIGHT_FACTOR,
  TERRAIN_SEED,
  createSeededRandom,
} from './terrain-params'

export const CHUNK_SIZE = 32
export const CHUNK_HEIGHT = 32

function getIndex(x: number, y: number, z: number): number {
  return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE
}

export function generateChunk(offsetX = 0, offsetZ = 0): Uint8Array {
  const volume = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE)
  const noise2D = createNoise2D(createSeededRandom(TERRAIN_SEED))

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
        volume[index] = y <= height ? 1 : 0
      }
    }
  }

  return volume
}
