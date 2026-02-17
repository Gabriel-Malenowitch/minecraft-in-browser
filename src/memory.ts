import { CHUNK_SIZE, CHUNK_HEIGHT } from './world-types'
import { packChunk, unpackChunk } from './chunk-packing'

export interface WorldInfos {
  chunks?: Record<string, string>
  minCX?: number
  maxCX?: number
  minCZ?: number
  maxCZ?: number
  volume?: string
  chunkSize?: number
  chunkHeight?: number
  [key: string]: unknown
}

export interface Memory {
  [worldName: string]: WorldInfos
}

const STORAGE_KEY = 'minecraft-memory'

export const setMemory = (memory: Memory): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
}

export const getMemory = (): Memory | undefined => {
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? (JSON.parse(data) as Memory) : undefined
}

export const hasWorld = (): boolean => {
  const memory = getMemory()
  return !!memory && Object.keys(memory).length > 0
}

export const DEFAULT_WORLD_NAME = 'Mundo 1'

function packVolume(volume: Uint8Array): string {
  const len = Math.ceil(volume.length / 8)
  const packed = new Uint8Array(len)
  for (let i = 0; i < volume.length; i++) {
    if (volume[i]) {
      packed[i >> 3] |= 1 << (i & 7)
    }
  }
  const chunkSize = 8192
  const parts: string[] = []
  for (let i = 0; i < packed.length; i += chunkSize) {
    const chunk = packed.subarray(i, Math.min(i + chunkSize, packed.length))
    parts.push(String.fromCharCode.apply(null, Array.from(chunk)))
  }
  return btoa(parts.join(''))
}

function unpackVolume(base64: string, chunkSize: number, chunkHeight: number): Uint8Array {
  const binary = atob(base64)
  const packed = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    packed[i] = binary.charCodeAt(i)
  }
  const volume = new Uint8Array(chunkSize * chunkHeight * chunkSize)
  for (let i = 0; i < volume.length; i++) {
    volume[i] = (packed[i >> 3] >> (i & 7)) & 1
  }
  return volume
}

export const getWorldData = ():
  | {
      chunks: Record<string, Uint8Array>
      minCX: number
      maxCX: number
      minCZ: number
      maxCZ: number
    }
  | undefined => {
  const memory = getMemory()
  if (!memory) {
    return undefined
  }
  const worldName = Object.keys(memory)[0]
  const info = worldName ? memory[worldName] : undefined
  if (!info) {
    return undefined
  }

  if (
    info.chunks &&
    info.minCX != null &&
    info.maxCX != null &&
    info.minCZ != null &&
    info.maxCZ != null
  ) {
    const chunks: Record<string, Uint8Array> = {}
    for (const [k, v] of Object.entries(info.chunks)) {
      chunks[k] = unpackChunk(v as string)
    }
    return {
      chunks,
      minCX: info.minCX,
      maxCX: info.maxCX,
      minCZ: info.minCZ,
      maxCZ: info.maxCZ,
    }
  }

  if (info.volume && info.chunkSize != null && info.chunkHeight != null) {
    const volume = unpackVolume(info.volume as string, info.chunkSize, info.chunkHeight)
    const chunks: Record<string, Uint8Array> = {}
    const cs = info.chunkSize as number
    const ch = info.chunkHeight as number
    for (let cz = 0; cz < cs / CHUNK_SIZE; cz++) {
      for (let cx = 0; cx < cs / CHUNK_SIZE; cx++) {
        const key = `${cx}_${cz}`
        const chunk = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE)
        for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
          for (let lz = 0; lz < CHUNK_SIZE; lz++) {
            for (let lx = 0; lx < CHUNK_SIZE; lx++) {
              const wx = cx * CHUNK_SIZE + lx
              const wz = cz * CHUNK_SIZE + lz
              const wy = ly
              if (wx < cs && wz < cs && wy < ch) {
                const i = wx + wz * cs + wy * cs * cs
                const j = lx + lz * CHUNK_SIZE + ly * CHUNK_SIZE * CHUNK_SIZE
                chunk[j] = volume[i]
              }
            }
          }
        }
        chunks[key] = chunk
      }
    }
    const numChunks = Math.floor(cs / CHUNK_SIZE)
    return {
      chunks,
      minCX: 0,
      maxCX: numChunks - 1,
      minCZ: 0,
      maxCZ: numChunks - 1,
    }
  }
  return undefined
}

export const saveWorldChunks = (
  chunks: Record<string, Uint8Array>,
  minCX: number,
  maxCX: number,
  minCZ: number,
  maxCZ: number,
): void => {
  const packed: Record<string, string> = {}
  for (const [k, v] of Object.entries(chunks)) {
    packed[k] = packChunk(v)
  }
  const memory = getMemory() ?? {}
  const worldName = Object.keys(memory)[0] ?? DEFAULT_WORLD_NAME
  memory[worldName] = {
    ...memory[worldName],
    chunks: packed,
    minCX,
    maxCX,
    minCZ,
    maxCZ,
  }
  setMemory(memory)
}

export const saveWorldData = (volume: Uint8Array, chunkSize: number, chunkHeight: number): void => {
  const memory = getMemory() ?? {}
  const worldName = Object.keys(memory)[0] ?? DEFAULT_WORLD_NAME
  memory[worldName] = {
    ...memory[worldName],
    volume: packVolume(volume),
    chunkSize,
    chunkHeight,
  }
  setMemory(memory)
}
