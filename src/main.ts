import './style.css'

const canvas = document.getElementById('canvas') as HTMLCanvasElement

canvas.width = window.innerWidth
canvas.height = window.innerHeight

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
})

console.log('Minecraft - ready!')
