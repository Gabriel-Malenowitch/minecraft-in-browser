export interface WorldInfos {
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
  | { volume: Uint8Array; chunkSize: number; chunkHeight: number }
  | undefined => {
  const memory = getMemory()
  if (!memory) {
    return undefined
  }
  const worldName = Object.keys(memory)[0]
  const info = worldName ? memory[worldName] : undefined
  // eslint-disable-next-line eqeqeq
  if (!info?.volume || info.chunkSize == null || info.chunkHeight == null) {
    return undefined
  }
  const volume = unpackVolume(info.volume as string, info.chunkSize, info.chunkHeight)
  return { volume, chunkSize: info.chunkSize, chunkHeight: info.chunkHeight }
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
