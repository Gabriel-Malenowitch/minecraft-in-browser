/**
 * HUD overlay: crosshair + hotbar with block previews.
 */

import { BlockId, BLOCKS, type BlockIdType } from './blocks'
import { buildAtlasCanvas, TILE_SIZE } from './texture-atlas'

/* ── Hotbar slot definitions ───────────────────────────────── */

const HOTBAR_BLOCKS: (BlockIdType | null)[] = [
    BlockId.GRASS_BLOCK,
    BlockId.DIRT,
    BlockId.WOOD,
    BlockId.LEAVES,
    null,
    null,
    null,
    null,
    null,
]

/* ── Public interface ──────────────────────────────────────── */

export interface HUD {
    el: HTMLElement
    getSelectedSlot: () => number
    setSelectedSlot: (slot: number) => void
    getSelectedBlockId: () => BlockIdType | null
    destroy: () => void
}

/* ── Builder ───────────────────────────────────────────────── */

export function createHUD(): HUD {
    let selectedSlot = 0

    // Root element
    const el = document.createElement('div')
    el.id = 'game-hud'

    // Crosshair
    const crosshair = document.createElement('div')
    crosshair.className = 'crosshair'
    crosshair.textContent = '+'
    el.appendChild(crosshair)

    // Hotbar container
    const hotbar = document.createElement('div')
    hotbar.className = 'hotbar'

    const atlas = buildAtlasCanvas()

    const slots: HTMLElement[] = []
    for (let i = 0; i < 9; i++) {
        const slot = document.createElement('div')
        slot.className = 'hotbar-slot' + (i === selectedSlot ? ' active' : '')

        const blockId = HOTBAR_BLOCKS[i]
        if (blockId !== null) {
            const icon = renderBlockIcon(atlas.canvas as HTMLCanvasElement, blockId)
            slot.appendChild(icon)
        }

        const num = document.createElement('span')
        num.className = 'hotbar-number'
        num.textContent = String(i + 1)
        slot.appendChild(num)

        slot.addEventListener('click', () => setSelectedSlot(i))
        slots.push(slot)
        hotbar.appendChild(slot)
    }
    el.appendChild(hotbar)

    // Slot selection logic
    function setSelectedSlot(s: number): void {
        if (s < 0 || s > 8) return
        slots[selectedSlot].classList.remove('active')
        selectedSlot = s
        slots[selectedSlot].classList.add('active')
    }

    // Key handler (1-9)
    const onKey = (e: KeyboardEvent): void => {
        const d = e.code.match(/^Digit(\d)$/)
        if (d) {
            const n = parseInt(d[1], 10)
            if (n >= 1 && n <= 9) {
                setSelectedSlot(n - 1)
                e.preventDefault()
            }
        }
    }

    // Scroll handler
    const onWheel = (e: WheelEvent): void => {
        if (!document.pointerLockElement) return
        const delta = e.deltaY > 0 ? 1 : -1
        let next = selectedSlot + delta
        if (next < 0) next = 8
        if (next > 8) next = 0
        setSelectedSlot(next)
        e.preventDefault()
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('wheel', onWheel, { passive: false })

    return {
        el,
        getSelectedSlot: () => selectedSlot,
        setSelectedSlot,
        getSelectedBlockId: () => HOTBAR_BLOCKS[selectedSlot] ?? null,
        destroy: () => {
            document.removeEventListener('keydown', onKey)
            document.removeEventListener('wheel', onWheel)
            el.remove()
        },
    }
}

/* ── Block icon renderer ───────────────────────────────────── */

function renderBlockIcon(atlasCanvas: HTMLCanvasElement, blockId: BlockIdType): HTMLCanvasElement {
    const def = BLOCKS[blockId]
    const topTile = def.faceTiles[2] // +Y = top face
    const iconSize = 32
    const canvas = document.createElement('canvas')
    canvas.width = iconSize
    canvas.height = iconSize
    canvas.className = 'hotbar-icon'
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false

    // Draw the top-face tile scaled to fill the icon
    const sx = topTile * TILE_SIZE
    ctx.drawImage(atlasCanvas, sx, 0, TILE_SIZE, TILE_SIZE, 0, 0, iconSize, iconSize)

    return canvas
}
