/**
 * Mobile controls: arrow buttons + break/place action buttons + drag-to-look zone.
 * Shown when viewport is mobile-sized (narrow or short).
 */

const MOBILE_BREAKPOINT_WIDTH = 768
const MOBILE_BREAKPOINT_HEIGHT = 600

export interface MobileControlsCallbacks {
  onBreak: () => void
  onPlace: () => void
  onLookDelta: (dx: number, dy: number) => void
}

export interface MobileControls {
  el: HTMLElement
  destroy: () => void
}

export function createMobileControls(callbacks: MobileControlsCallbacks): MobileControls {
  const el = document.createElement('div')
  el.id = 'mobile-controls'
  el.className = 'mobile-controls'
  el.setAttribute('aria-hidden', 'true')

  const dispatchKey = (code: string, type: 'keydown' | 'keyup'): void => {
    document.dispatchEvent(
      new KeyboardEvent(type, {
        code,
        key: code.replace('Key', '').toLowerCase(),
        bubbles: true,
      }),
    )
  }

  const createArrow = (label: string, code: string, dir: string): HTMLButtonElement => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `mobile-arrow mobile-arrow-${dir}`
    btn.textContent = label
    btn.setAttribute('aria-label', label)
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      dispatchKey(code, 'keydown')
    })
    btn.addEventListener('pointerup', () => dispatchKey(code, 'keyup'))
    btn.addEventListener('pointerleave', () => dispatchKey(code, 'keyup'))
    btn.addEventListener('pointercancel', () => dispatchKey(code, 'keyup'))
    return btn
  }

  const up = createArrow('↑', 'KeyW', 'up')
  const left = createArrow('←', 'KeyA', 'left')
  const down = createArrow('↓', 'KeyS', 'down')
  const right = createArrow('→', 'KeyD', 'right')

  const arrowsGrid = document.createElement('div')
  arrowsGrid.className = 'mobile-arrows'
  arrowsGrid.appendChild(up)
  arrowsGrid.appendChild(left)
  arrowsGrid.appendChild(down)
  arrowsGrid.appendChild(right)

  const bottomRow = document.createElement('div')
  bottomRow.className = 'mobile-bottom-row'
  bottomRow.appendChild(arrowsGrid)

  const actionsWrap = document.createElement('div')
  actionsWrap.className = 'mobile-actions'

  const jumpBtn = document.createElement('button')
  jumpBtn.type = 'button'
  jumpBtn.className = 'mobile-action mobile-action-jump'
  jumpBtn.textContent = '↑'
  jumpBtn.setAttribute('aria-label', 'Pular (duplo toque: voar)')
  jumpBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    dispatchKey('Space', 'keydown')
  })
  jumpBtn.addEventListener('pointerup', () => dispatchKey('Space', 'keyup'))
  jumpBtn.addEventListener('pointerleave', () => dispatchKey('Space', 'keyup'))
  jumpBtn.addEventListener('pointercancel', () => dispatchKey('Space', 'keyup'))
  actionsWrap.appendChild(jumpBtn)

  const breakBtn = document.createElement('button')
  breakBtn.type = 'button'
  breakBtn.className = 'mobile-action mobile-action-break'
  breakBtn.textContent = 'Quebrar'
  breakBtn.setAttribute('aria-label', 'Quebrar bloco')
  breakBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    callbacks.onBreak()
  })
  actionsWrap.appendChild(breakBtn)

  const placeBtn = document.createElement('button')
  placeBtn.type = 'button'
  placeBtn.className = 'mobile-action mobile-action-place'
  placeBtn.textContent = 'Colocar'
  placeBtn.setAttribute('aria-label', 'Colocar bloco')
  placeBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    callbacks.onPlace()
  })
  actionsWrap.appendChild(placeBtn)
  bottomRow.appendChild(actionsWrap)
  el.appendChild(bottomRow)

  const lookZone = document.createElement('div')
  lookZone.className = 'mobile-look-zone'
  lookZone.setAttribute('aria-label', 'Arraste para olhar')
  let lastX = 0
  let lastY = 0
  lookZone.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      lastX = e.touches[0].clientX
      lastY = e.touches[0].clientY
    }
  })
  lookZone.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastX
        const dy = e.touches[0].clientY - lastY
        lastX = e.touches[0].clientX
        lastY = e.touches[0].clientY
        callbacks.onLookDelta(dx, dy)
        e.preventDefault()
      }
    },
    { passive: false },
  )
  el.insertBefore(lookZone, bottomRow)

  const updateVisibility = (): void => {
    const w = window.innerWidth
    const h = window.innerHeight
    const isMobile = w <= MOBILE_BREAKPOINT_WIDTH || h <= MOBILE_BREAKPOINT_HEIGHT
    el.classList.toggle('visible', isMobile)
  }

  const resizeObserver = new ResizeObserver(updateVisibility)
  resizeObserver.observe(document.body)
  updateVisibility()

  return {
    el,
    destroy: () => {
      resizeObserver.disconnect()
      el.remove()
    },
  }
}
