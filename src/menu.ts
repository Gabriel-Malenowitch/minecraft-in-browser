import { hasWorld } from './memory'

export type MenuCallback = (action: 'enter' | 'create') => void

const SPLASHES = [
  'Also try Terraria!',
  'Minceraft!',
  '100% browser!',
  'Voxel powered!',
  'Now with TypeScript!',
  'Does barrel rolls!',
  'Woo, /r/minecraft!',
  'Singleplayer only!',
  'Limitless!',
  'Pixels!',
  'Three.js!',
]

function pickSplash(): string {
  return SPLASHES[Math.floor(Math.random() * SPLASHES.length)]
}

function createButton(text: string, full = false): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.className = `menu-btn${full ? ' menu-btn-full' : ''}`
  btn.textContent = text
  return btn
}

export function createMenu(onAction: MenuCallback): HTMLDivElement {
  const menu = document.createElement('div')
  menu.className = 'menu'

  /* ── Logo (CSS text) + splash ───────────────────── */
  const logoWrapper = document.createElement('div')
  logoWrapper.className = 'menu-logo-wrapper'

  const logo = document.createElement('div')
  logo.className = 'menu-logo'

  const line1 = document.createElement('span')
  line1.className = 'menu-logo-line1'
  line1.textContent = 'MINE'

  const line2 = document.createElement('span')
  line2.className = 'menu-logo-line2'
  line2.textContent = 'CRAFT'

  logo.appendChild(line1)
  logo.appendChild(line2)
  logoWrapper.appendChild(logo)

  const splash = document.createElement('span')
  splash.className = 'menu-splash'
  splash.textContent = pickSplash()
  logoWrapper.appendChild(splash)

  menu.appendChild(logoWrapper)

  /* ── Main buttons ───────────────────────────────── */
  const buttons = document.createElement('div')
  buttons.className = 'menu-buttons'

  const enterBtn = createButton('Entrar no mundo', true)
  if (!hasWorld()) {
    enterBtn.disabled = true
    enterBtn.title = 'No world created yet'
  }

  const createBtn = createButton('Create New World', true)

  buttons.appendChild(enterBtn)
  buttons.appendChild(createBtn)

  /* ── Bottom row (decorative) ────────────────────── */
  const bottomRow = document.createElement('div')
  bottomRow.className = 'menu-buttons-row'

  const optionsBtn = createButton('Options...')
  optionsBtn.disabled = true

  const quitBtn = createButton('Quit Game')
  quitBtn.disabled = true

  bottomRow.appendChild(optionsBtn)
  bottomRow.appendChild(quitBtn)
  buttons.appendChild(bottomRow)

  menu.appendChild(buttons)

  /* ── Version & copyright ────────────────────────── */
  const version = document.createElement('div')
  version.className = 'menu-version'
  version.textContent = 'Minecraft in Browser v0.1'
  menu.appendChild(version)

  const copyright = document.createElement('div')
  copyright.className = 'menu-copyright'
  copyright.textContent = 'Not affiliated with Mojang'
  menu.appendChild(copyright)

  /* ── Events ─────────────────────────────────────── */
  enterBtn.addEventListener('click', () => {
    menu.remove()
    onAction('enter')
  })

  createBtn.addEventListener('click', () => {
    menu.remove()
    onAction('create')
  })

  return menu
}
