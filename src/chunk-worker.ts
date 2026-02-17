import { buildChunkMeshDataFromChunks } from './chunk-mesh-core'

function unpackChunk(base64: string): Uint8Array {
  const binary = atob(base64)
  const packed = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) packed[i] = binary.charCodeAt(i)
  const volume = new Uint8Array(32 * 32 * 32)
  for (let i = 0; i < volume.length; i++) {
    volume[i] = (packed[i >> 3] >> (i & 7)) & 1
  }
  return volume
}

self.onmessage = (
  e: MessageEvent<{
    chunks: Record<string, string>
    center: { x: number; y: number; z: number }
  }>,
) => {
  const { chunks: packed, center } = e.data
  const unpacked: Record<string, Uint8Array> = {}
  for (const [k, v] of Object.entries(packed)) {
    unpacked[k] = unpackChunk(v)
  }
  const result = buildChunkMeshDataFromChunks(unpacked, center)

  self.postMessage(result, {
    transfer: [result.positions.buffer, result.normals.buffer, result.colors.buffer],
  })
}
