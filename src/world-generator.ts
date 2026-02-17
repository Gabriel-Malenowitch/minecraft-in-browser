import { createNoise2D } from 'simplex-noise'

export const CHUNK_SIZE = 512
export const CHUNK_HEIGHT = 32

function getIndex(x: number, y: number, z: number): number {
  return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE
}

export function generateChunk(offsetX = 0, offsetZ = 0): Uint8Array {
  const volume = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE)
  const noise2D = createNoise2D()

  const scale = 0.02
  const amplitude = 10
  const baseHeight = 8

  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      const worldX = x + offsetX
      const worldZ = z + offsetZ

      const noiseVal = noise2D(worldX * scale, worldZ * scale)
      const height = Math.floor(baseHeight + amplitude * (noiseVal + 1) * 0.6)

      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        const index = getIndex(x, y, z)
        volume[index] = y <= height ? 1 : 0
      }
    }
  }

  return volume
}

export const mapData = generateChunk()
