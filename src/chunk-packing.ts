import { CHUNK_SIZE, CHUNK_HEIGHT } from './world-types'

const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE
const PACKED_4BIT_LEN = Math.ceil(CHUNK_VOLUME / 2)
const PACKED_1BIT_LEN = Math.ceil(CHUNK_VOLUME / 8)

export function packChunk(chunk: Uint8Array): string {
  const packed = new Uint8Array(PACKED_4BIT_LEN)
  for (let i = 0; i < CHUNK_VOLUME; i++) {
    const v = (chunk[i] ?? 0) & 0xf
    if (i & 1) {
      packed[i >> 1] |= v << 4
    } else {
      packed[i >> 1] |= v
    }
  }
  return btoa(String.fromCharCode.apply(null, Array.from(packed)))
}

export function unpackChunk(base64: string): Uint8Array {
  const binary = atob(base64)
  const packed = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    packed[i] = binary.charCodeAt(i)
  }
  const chunk = new Uint8Array(CHUNK_VOLUME)
  if (packed.length === PACKED_1BIT_LEN) {
    for (let i = 0; i < CHUNK_VOLUME; i++) {
      chunk[i] = (packed[i >> 3] >> (i & 7)) & 1
    }
  } else {
    for (let i = 0; i < CHUNK_VOLUME; i++) {
      chunk[i] = (packed[i >> 1] >> ((i & 1) * 4)) & 0xf
    }
  }
  return chunk
}
