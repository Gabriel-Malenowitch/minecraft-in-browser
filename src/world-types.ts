export const CHUNK_SIZE = 32
export const CHUNK_HEIGHT = 32
export const EXTEND_THRESHOLD = 32

export type Chunks = Record<string, Uint8Array>

export interface WorldBounds {
  minCX: number
  maxCX: number
  minCZ: number
  maxCZ: number
}

export function chunkKey(cx: number, cz: number): string {
  return `${cx}_${cz}`
}

export function getChunkCoords(wx: number, wz: number): [number, number] {
  const cx = Math.floor(wx / CHUNK_SIZE)
  const cz = Math.floor(wz / CHUNK_SIZE)
  return [cx, cz]
}

export function getBlock(chunks: Chunks, wx: number, wy: number, wz: number): number {
  const [cx, cz] = getChunkCoords(wx, wz)
  const key = chunkKey(cx, cz)
  const chunk = chunks[key]
  if (!chunk) {
    return 0
  }
  const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  const ly = Math.floor(wy)
  if (ly < 0 || ly >= CHUNK_HEIGHT) {
    return 0
  }
  const i = lx + lz * CHUNK_SIZE + ly * CHUNK_SIZE * CHUNK_SIZE
  return chunk[i] ?? 0
}
