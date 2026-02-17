/**
 * Block highlight: wireframe outline on the block the player is looking at.
 * Uses a simple DDA (step-through) raycast through the voxel grid.
 * Also tracks the face normal for block placement.
 */

import * as THREE from 'three'
import { getBlock } from './world-types'
import { BlockId, isSolid, type BlockIdType } from './blocks'

const MAX_RANGE = 5

export interface RaycastHit {
  /** Block position (integer coords) */
  x: number
  y: number
  z: number
  /** Position of the air block adjacent to the hit face (for placement) */
  nx: number
  ny: number
  nz: number
}

export interface BlockHighlight {
  update: (camera: THREE.Camera, chunks: Record<string, Uint8Array>) => void
  getTarget: () => RaycastHit | null
}

export function createBlockHighlight(scene: THREE.Scene): BlockHighlight {
  const geo = new THREE.BoxGeometry(1.005, 1.005, 1.005)
  const edges = new THREE.EdgesGeometry(geo)
  const mat = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 1.5,
    transparent: true,
    opacity: 0.6,
  })
  const wireframe = new THREE.LineSegments(edges, mat)
  wireframe.visible = false
  wireframe.renderOrder = 999
  scene.add(wireframe)

  let target: RaycastHit | null = null
  const dir = new THREE.Vector3()

  function update(camera: THREE.Camera, chunks: Record<string, Uint8Array>): void {
    camera.getWorldDirection(dir)
    const origin = camera.position

    const hit = raycastVoxel(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, chunks)

    if (hit) {
      target = hit
      wireframe.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5)
      wireframe.visible = true
    } else {
      target = null
      wireframe.visible = false
    }
  }

  return {
    update,
    getTarget: () => target,
  }
}

/* ── DDA voxel raycast ─────────────────────────────────────── */

function raycastVoxel(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  chunks: Record<string, Uint8Array>,
): RaycastHit | null {
  // Current voxel position
  let ix = Math.floor(ox)
  let iy = Math.floor(oy)
  let iz = Math.floor(oz)

  // Previous voxel (for face normal / placement position)
  let prevX = ix
  let prevY = iy
  let prevZ = iz

  // Step direction
  const stepX = dx >= 0 ? 1 : -1
  const stepY = dy >= 0 ? 1 : -1
  const stepZ = dz >= 0 ? 1 : -1

  // t delta (how far along ray to cross one voxel)
  const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity
  const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity
  const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity

  // t to next boundary
  let tMaxX = dx !== 0 ? (dx > 0 ? ix + 1 - ox : ox - ix) * tDeltaX : Infinity
  let tMaxY = dy !== 0 ? (dy > 0 ? iy + 1 - oy : oy - iy) * tDeltaY : Infinity
  let tMaxZ = dz !== 0 ? (dz > 0 ? iz + 1 - oz : oz - iz) * tDeltaZ : Infinity

  const maxSteps = Math.ceil(MAX_RANGE * 3)

  for (let i = 0; i < maxSteps; i++) {
    // Check current voxel (solid blocks + grass plant are targetable)
    const blockId = getBlock(chunks, ix, iy, iz)
    const targetable = isSolid(blockId as BlockIdType) || blockId === BlockId.GRASS
    if (targetable) {
      // Verify distance
      const cdx = ix + 0.5 - ox
      const cdy = iy + 0.5 - oy
      const cdz = iz + 0.5 - oz
      if (cdx * cdx + cdy * cdy + cdz * cdz <= MAX_RANGE * MAX_RANGE) {
        return { x: ix, y: iy, z: iz, nx: prevX, ny: prevY, nz: prevZ }
      }
      return null
    }

    // Save previous position
    prevX = ix
    prevY = iy
    prevZ = iz

    // Advance to next voxel boundary
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        ix += stepX
        tMaxX += tDeltaX
      } else {
        iz += stepZ
        tMaxZ += tDeltaZ
      }
    } else if (tMaxY < tMaxZ) {
      iy += stepY
      tMaxY += tDeltaY
    } else {
      iz += stepZ
      tMaxZ += tDeltaZ
    }

    // Check if out of range
    const rdx = ix + 0.5 - ox
    const rdy = iy + 0.5 - oy
    const rdz = iz + 0.5 - oz
    if (rdx * rdx + rdy * rdy + rdz * rdz > MAX_RANGE * MAX_RANGE) {
      return null
    }
  }

  return null
}
