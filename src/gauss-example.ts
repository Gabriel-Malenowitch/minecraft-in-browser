export const CHUNK_SIZE = 32 // Largura e profundidade (X e Z)
export const CHUNK_HEIGHT = 32 // Altura máxima (Y)

// O array linear que representa o volume 3D
const volume = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);

// Função auxiliar para mapear coordenadas 3D para um índice 1D
function getIndex(x: number, y: number, z: number): number {
    return x + (z * CHUNK_SIZE) + (y * CHUNK_SIZE * CHUNK_SIZE);
}

function generateGaussianChunk(): Uint8Array {
    const amplitude = 25; // Altura máxima do morro
    const centerX = CHUNK_SIZE / 2;
    const centerZ = CHUNK_SIZE / 2;
    const sigma = 6; // O quão "gordo" é o morro

    // Loop pelos eixos horizontais X e Z
    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {

            // Distância ao quadrado do ponto atual até o centro
            const distSq = Math.pow(x - centerX, 2) + Math.pow(z - centerZ, 2);

            // Calcula a altura da curva de Gauss para este (X, Z)
            const gaussianHeight = Math.floor(amplitude * Math.exp(-distSq / (2 * Math.pow(sigma, 2))));

            // Preenche o eixo Y de baixo para cima
            for (let y = 0; y < CHUNK_HEIGHT; y++) {
                const index = getIndex(x, y, z);

                if (y <= gaussianHeight) {
                    volume[index] = 1; // Bloco
                } else {
                    volume[index] = 0; // Ar
                }
            }
        }
    }

    return volume;
}

export const mapData = generateGaussianChunk();