export const TERRAIN_SCALE = 0.02
export const TERRAIN_AMPLITUDE = 10
export const TERRAIN_BASE_HEIGHT = 8
export const TERRAIN_HEIGHT_FACTOR = 0.6

export const DEFAULT_TERRAIN_SEED = 12345

export function createSeededRandom(seed: number): () => number {
  return (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}
