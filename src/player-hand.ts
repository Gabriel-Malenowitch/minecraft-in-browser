/**
 * Player hand: renders the selected block as a small 3D cube
 * in the bottom-right of the camera view.
 */

import * as THREE from 'three'
import { BLOCKS, type BlockIdType, BlockId } from './blocks'
import { buildAtlasCanvas, TILE_COUNT } from './texture-atlas'

export interface PlayerHand {
    update: (blockId: BlockIdType | null, time: number) => void
    mesh: THREE.Group
}

let sharedTexture: THREE.CanvasTexture | null = null

function getHandTexture(): THREE.CanvasTexture {
    if (sharedTexture) return sharedTexture
    const atlas = buildAtlasCanvas()
    sharedTexture = new THREE.CanvasTexture(atlas.canvas as HTMLCanvasElement)
    sharedTexture.magFilter = THREE.NearestFilter
    sharedTexture.minFilter = THREE.NearestFilter
    sharedTexture.colorSpace = THREE.SRGBColorSpace
    return sharedTexture
}

export function createPlayerHand(camera: THREE.Camera): PlayerHand {
    const group = new THREE.Group()
    const tex = getHandTexture()

    const blockSize = 0.35
    const geo = new THREE.BoxGeometry(blockSize, blockSize, blockSize)

    // Create 6 materials (one per face) — will update UV mapping per block
    const materials = Array.from({ length: 6 }, () =>
        new THREE.MeshLambertMaterial({ map: tex })
    )

    const blockMesh = new THREE.Mesh(geo, materials)
    blockMesh.rotation.set(0.4, -0.75, 0.15)
    group.add(blockMesh)

    // Add small ambient light to make the hand always visible even at night
    const handLight = new THREE.PointLight(0xffffff, 0.3, 3)
    handLight.position.set(0, 0.2, 0)
    group.add(handLight)

    // Position relative to camera
    group.position.set(0.65, -0.5, -0.8)
    camera.add(group)
    group.visible = false

    let currentBlockId: BlockIdType | null = null

    function updateBlock(blockId: BlockIdType | null): void {
        if (blockId === null || blockId === BlockId.AIR || blockId === BlockId.GRASS) {
            group.visible = false
            currentBlockId = blockId
            return
        }

        const def = BLOCKS[blockId]
        if (!def) {
            group.visible = false
            return
        }

        // Update UV for each face
        // Three.js BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
        const faceTiles = def.faceTiles
        for (let f = 0; f < 6; f++) {
            const tileIdx = faceTiles[f]
            const u0 = tileIdx / TILE_COUNT
            const u1 = (tileIdx + 1) / TILE_COUNT

            const mat = materials[f]
            mat.map = tex

            // Update UV on the geometry for this face
            // Each face of BoxGeometry has 4 vertices and 2 UV entries each
            const uvAttr = geo.getAttribute('uv') as THREE.BufferAttribute
            const faceStart = f * 4
            // BoxGeometry UV layout per face: [0,1], [1,1], [0,0], [1,0]
            uvAttr.setXY(faceStart, u0, 1)
            uvAttr.setXY(faceStart + 1, u1, 1)
            uvAttr.setXY(faceStart + 2, u0, 0)
            uvAttr.setXY(faceStart + 3, u1, 0)
        }
        geo.getAttribute('uv').needsUpdate = true

        group.visible = true
        currentBlockId = blockId
    }

    function update(blockId: BlockIdType | null, time: number): void {
        if (blockId !== currentBlockId) {
            updateBlock(blockId)
        }

        if (group.visible) {
            // Subtle bob animation
            const bob = Math.sin(time * 0.003) * 0.015
            group.position.y = -0.5 + bob
        }
    }

    return { update, mesh: group }
}
