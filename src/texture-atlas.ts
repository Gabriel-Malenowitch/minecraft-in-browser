/**
 * Programmatic 16×16 pixel-art texture atlas.
 * Generates Minecraft-style textures entirely via Canvas API.
 *
 * Atlas layout (one row of TILE_SIZE tiles):
 *   0: dirt
 *   1: grass_top
 *   2: grass_side  (dirt with green strip at the top)
 *   3: wood
 *   4: leaves
 *   5: grass_plant (with alpha transparency)
 */

export const TILE_SIZE = 16
export const TILE_COUNT = 6

export const TileId = {
    DIRT: 0,
    GRASS_TOP: 1,
    GRASS_SIDE: 2,
    WOOD: 3,
    LEAVES: 4,
    GRASS_PLANT: 5,
} as const

/* ── Deterministic pseudo-random for texture generation ─── */
function seededRng(seed: number): () => number {
    let s = seed
    return (): number => {
        s = (s * 1103515245 + 12345) & 0x7fffffff
        return (s >>> 16) / 32767
    }
}

/* ── Per-tile painters ────────────────────────────────────── */

function paintDirt(ctx: CanvasRenderingContext2D, ox: number): void {
    const rng = seededRng(42)
    for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
            const v = 0.35 + rng() * 0.2
            const r = Math.floor((v + 0.15) * 255)
            const g = Math.floor((v * 0.7) * 255)
            const b = Math.floor((v * 0.3) * 255)
            ctx.fillStyle = `rgb(${r},${g},${b})`
            ctx.fillRect(ox + x, y, 1, 1)
        }
    }
}

function paintGrassTop(ctx: CanvasRenderingContext2D, ox: number): void {
    const rng = seededRng(101)
    for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
            const v = 0.3 + rng() * 0.25
            const r = Math.floor(v * 0.4 * 255)
            const g = Math.floor((v + 0.2) * 255)
            const b = Math.floor(v * 0.3 * 255)
            ctx.fillStyle = `rgb(${r},${g},${b})`
            ctx.fillRect(ox + x, y, 1, 1)
        }
    }
}

function paintGrassSide(ctx: CanvasRenderingContext2D, ox: number): void {
    const rng = seededRng(77)
    // Bottom part: dirt
    for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
            const v = 0.35 + rng() * 0.2
            const r = Math.floor((v + 0.15) * 255)
            const g = Math.floor((v * 0.7) * 255)
            const b = Math.floor((v * 0.3) * 255)
            ctx.fillStyle = `rgb(${r},${g},${b})`
            ctx.fillRect(ox + x, y, 1, 1)
        }
    }
    // Top strip: green grass (first 3–4 rows + some irregular drips)
    const rng2 = seededRng(200)
    for (let x = 0; x < TILE_SIZE; x++) {
        const depth = 2 + Math.floor(rng2() * 3)
        for (let y = 0; y < depth; y++) {
            const gv = 0.35 + rng2() * 0.2
            const r = Math.floor(gv * 0.35 * 255)
            const g = Math.floor((gv + 0.25) * 255)
            const b = Math.floor(gv * 0.25 * 255)
            ctx.fillStyle = `rgb(${r},${g},${b})`
            ctx.fillRect(ox + x, y, 1, 1)
        }
    }
}

function paintWood(ctx: CanvasRenderingContext2D, ox: number): void {
    const rng = seededRng(303)
    for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
            const stripe = Math.sin(y * 0.8 + rng() * 0.5) * 0.06
            const v = 0.3 + stripe + rng() * 0.08
            const r = Math.floor((v + 0.1) * 255)
            const g = Math.floor((v * 0.65) * 255)
            const b = Math.floor((v * 0.35) * 255)
            ctx.fillStyle = `rgb(${r},${g},${b})`
            ctx.fillRect(ox + x, y, 1, 1)
        }
    }
}

function paintLeaves(ctx: CanvasRenderingContext2D, ox: number): void {
    const rng = seededRng(505)
    for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
            const v = 0.15 + rng() * 0.3
            const r = Math.floor(v * 0.6 * 255)
            const g = Math.floor((v + 0.12) * 255)
            const b = Math.floor(v * 0.5 * 255)
            ctx.fillStyle = `rgb(${r},${g},${b})`
            ctx.fillRect(ox + x, y, 1, 1)
        }
    }
}

function paintGrassPlant(ctx: CanvasRenderingContext2D, ox: number): void {
    // Draw a transparent-background grass plant silhouette
    // Pattern: narrow bottom, wider top, ragged edges — like Minecraft's tall grass
    const rng = seededRng(606)

    // Clear to transparent
    ctx.clearRect(ox, 0, TILE_SIZE, TILE_SIZE)

    // Draw blade columns
    const blades: { cx: number; w: number; hStart: number }[] = [
        { cx: 3, w: 2, hStart: 6 },
        { cx: 5, w: 3, hStart: 3 },
        { cx: 7, w: 2, hStart: 1 },
        { cx: 9, w: 3, hStart: 4 },
        { cx: 11, w: 2, hStart: 2 },
        { cx: 13, w: 2, hStart: 5 },
        { cx: 4, w: 1, hStart: 8 },
        { cx: 10, w: 1, hStart: 7 },
    ]

    for (const blade of blades) {
        for (let y = blade.hStart; y < TILE_SIZE; y++) {
            for (let dx = 0; dx < blade.w; dx++) {
                const px = blade.cx + dx
                if (px < 0 || px >= TILE_SIZE) continue
                const v = 0.22 + rng() * 0.2
                const r = Math.floor(v * 0.5 * 255)
                const g = Math.floor((v + 0.2) * 255)
                const b = Math.floor(v * 0.3 * 255)
                // Darker at bottom, lighter at top
                const yFactor = 1 - (y - blade.hStart) / (TILE_SIZE - blade.hStart) * 0.3
                ctx.fillStyle = `rgb(${Math.floor(r * yFactor)},${Math.floor(g * yFactor)},${Math.floor(b * yFactor)})`
                ctx.fillRect(ox + px, y, 1, 1)
            }
        }
    }
}

/* ── Atlas builder ────────────────────────────────────────── */

export interface TextureAtlasData {
    canvas: HTMLCanvasElement | OffscreenCanvas
    tileCount: number
    tileSize: number
    /** Width in pixels */
    width: number
    /** Height in pixels */
    height: number
}

export function buildAtlasCanvas(): TextureAtlasData {
    const w = TILE_SIZE * TILE_COUNT
    const h = TILE_SIZE

    let canvas: HTMLCanvasElement | OffscreenCanvas
    let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

    if (typeof OffscreenCanvas !== 'undefined') {
        canvas = new OffscreenCanvas(w, h)
        ctx = canvas.getContext('2d')!
    } else {
        canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        ctx = canvas.getContext('2d')!
    }

    ctx.imageSmoothingEnabled = false

    // Paint each tile at its X offset
    paintDirt(ctx as CanvasRenderingContext2D, TileId.DIRT * TILE_SIZE)
    paintGrassTop(ctx as CanvasRenderingContext2D, TileId.GRASS_TOP * TILE_SIZE)
    paintGrassSide(ctx as CanvasRenderingContext2D, TileId.GRASS_SIDE * TILE_SIZE)
    paintWood(ctx as CanvasRenderingContext2D, TileId.WOOD * TILE_SIZE)
    paintLeaves(ctx as CanvasRenderingContext2D, TileId.LEAVES * TILE_SIZE)
    paintGrassPlant(ctx as CanvasRenderingContext2D, TileId.GRASS_PLANT * TILE_SIZE)

    return { canvas, tileCount: TILE_COUNT, tileSize: TILE_SIZE, width: w, height: h }
}

/**
 * Returns UV coordinates (u0, v0, u1, v1) for a tile in the atlas.
 * v0=0 (top), v1=1 (bottom).
 */
export function getTileUVs(tileIndex: number): [number, number, number, number] {
    const u0 = (tileIndex * TILE_SIZE) / (TILE_COUNT * TILE_SIZE)
    const u1 = ((tileIndex + 1) * TILE_SIZE) / (TILE_COUNT * TILE_SIZE)
    return [u0, 0, u1, 1]
}

/**
 * Returns the raw ImageData of the atlas for transfer to workers.
 */
export function getAtlasImageData(): ImageData {
    const atlas = buildAtlasCanvas()
    const ctx = (atlas.canvas as HTMLCanvasElement).getContext('2d')!
    return ctx.getImageData(0, 0, atlas.width, atlas.height)
}
