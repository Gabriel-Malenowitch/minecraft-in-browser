import * as THREE from 'three'

/**
 * Builds a Three.js mesh from a voxel volume array.
 * Uses InstancedMesh for performance — one draw call for all cubes.
 */
export function buildChunkMesh(
    volume: Uint8Array,
    chunkSize: number,
    chunkHeight: number,
): THREE.InstancedMesh {
    const blockGeometry = new THREE.BoxGeometry(1, 1, 1)

    // Minecraft-style grass material: green top, brown sides
    const blockMaterial = [
        new THREE.MeshLambertMaterial({ color: 0x8b6914 }), // right  (brown)
        new THREE.MeshLambertMaterial({ color: 0x8b6914 }), // left   (brown)
        new THREE.MeshLambertMaterial({ color: 0x4caf50 }), // top    (green)
        new THREE.MeshLambertMaterial({ color: 0x6d4c1d }), // bottom (dark brown)
        new THREE.MeshLambertMaterial({ color: 0x8b6914 }), // front  (brown)
        new THREE.MeshLambertMaterial({ color: 0x8b6914 }), // back   (brown)
    ]

    // First pass: count solid blocks to allocate InstancedMesh
    let blockCount = 0
    for (let i = 0; i < volume.length; i++) {
        if (volume[i] > 0) {
            blockCount++
        }
    }

    const mesh = new THREE.InstancedMesh(blockGeometry, blockMaterial, blockCount)
    const matrix = new THREE.Matrix4()

    // Second pass: set instance transforms
    let instanceIndex = 0
    for (let y = 0; y < chunkHeight; y++) {
        for (let z = 0; z < chunkSize; z++) {
            for (let x = 0; x < chunkSize; x++) {
                const index = x + z * chunkSize + y * chunkSize * chunkSize
                if (volume[index] > 0) {
                    matrix.setPosition(x, y, z)
                    mesh.setMatrixAt(instanceIndex, matrix)
                    instanceIndex++
                }
            }
        }
    }

    mesh.instanceMatrix.needsUpdate = true
    return mesh
}
