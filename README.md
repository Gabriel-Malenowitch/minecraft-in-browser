# Minecraft in Browser

Clonagem de Minecraft rodando inteiramente no navegador, construída com TypeScript, Vite e Three.js. Mundo procedural infinito, geração de terreno com noise, árvores variadas, sistema de blocos, persistência em localStorage e controles para desktop e mobile.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Stack Tecnológica](#stack-tecnológica)
3. [Estrutura do Projeto](#estrutura-do-projeto)
4. [Fluxo de Execução](#fluxo-de-execução)
5. [Sistema de Chunks](#sistema-de-chunks)
6. [Geração de Mundo](#geração-de-mundo)
7. [Renderização e Meshing](#renderização-e-meshing)
8. [Texturas e Atlas](#texturas-e-atlas)
9. [Iluminação e Ciclo Dia/Noite](#iluminação-e-ciclo-dianoite)
10. [Interação e Controles](#interação-e-controles)
11. [Persistência e Memória](#persistência-e-memória)
12. [Outdoor (Billboards)](#outdoor-billboards)
13. [Scripts de Build](#scripts-de-build)

---

## Visão Geral

O jogo inicia com um menu principal que permite:
- **Create New World**: gera um novo mundo com seed aleatória
- **Entrar no mundo**: carrega o último mundo salvo (se existir)

Após entrar, o jogador nasce no centro de uma área inicial de 9×9 chunks (raio 4), em cima do terreno. O mundo se expande dinamicamente conforme o jogador se afasta das bordas, com novos chunks gerados em background via Web Worker.

---

## Stack Tecnológica

| Dependência | Uso |
|-------------|-----|
| **Vite** | Build e dev server |
| **TypeScript** | Tipagem estática |
| **Three.js** | Renderização 3D, câmera, controles |
| **simplex-noise** | Geração procedural de terreno |
| **marked** | Parse de Markdown para billboards |
| **html2canvas** | Renderização de HTML em textura para billboards |

---

## Estrutura do Projeto

```
src/
├── main.ts                 # Entry point, orquestra menu e início do jogo
├── renderer.ts            # Loop principal, câmera, física, meshes, worker
├── world-types.ts         # CHUNK_SIZE, CHUNK_HEIGHT, getBlock, setBlock, chunkKey
├── world-generator.ts     # Geração síncrona de chunks (menu / inicial)
├── world-generator-worker.ts  # Geração assíncrona de chunks (expansão)
├── terrain-params.ts      # Parâmetros do noise (scale, amplitude, height)
├── tree-generation.ts     # Lógica de árvores (8 tipos)
├── blocks.ts              # BlockId, BLOCKS, isSolid, isTransparent
├── chunk-mesh-core.ts     # buildSubChunkMeshData, greedy meshing
├── chunk-mesh.ts          # meshesFromData, atlas, materiais
├── chunk-packing.ts       # packChunk / unpackChunk (4-bit)
├── chunk-worker.ts        # Worker para mesh (não usado atualmente)
├── memory.ts              # localStorage, saveWorldChunks, getWorldData
├── texture-atlas.ts       # Atlas procedural 16×16
├── shaders.ts             # Iluminação, vento na grama
├── block-highlight.ts     # Raycast DDA para bloco alvo
├── hud.ts                 # Crosshair, hotbar, seleção de bloco
├── player-hand.ts         # Cubo 3D do bloco selecionado
├── mobile-controls.ts     # Botões e zona de arraste para mobile
├── menu.ts                # Menu principal
├── outdoor.ts             # Posições dos billboards
├── outdoor-billboard.ts   # Criação de mesh a partir de Markdown
└── style.css              # Estilos globais, menu, HUD, mobile

scripts/
└── fetch-avatar.mjs       # Baixa avatar do GitHub para billboards
```

---

## Fluxo de Execução

### 1. Inicialização (`main.ts`)

1. Importa CSS e módulos
2. Cria o menu e injeta no `#menu-container`
3. Ao clicar em **Create New World**:
   - Gera seed aleatória
   - Gera 9×9 chunks síncronos via `generateChunk`
   - Limpa memória e salva chunks
   - Chama `startGame` com chunks e bounds
4. Ao clicar em **Entrar no mundo**:
   - Carrega dados via `getWorldData`
   - Chama `startGame` com chunks e bounds existentes

### 2. Início do Jogo (`startGame`)

1. Esconde o menu
2. Calcula centro do mundo e `groundY` no spawn
3. Obtém posições dos outdoors via `getOutdoorPositions`
4. Cria canvas e chama `createRenderer`
5. Inicia `ctx.animate()` (loop de renderização)

### 3. Loop Principal (`renderer.ts` → `animate`)

A cada frame:
- Atualiza movimento (WASD, gravidade, colisão)
- Verifica se o jogador está perto das bordas → envia mensagem ao `worldGenWorker`
- Se o jogador se moveu 32 blocos → agenda rebuild de meshes
- Atualiza sol/lua, céu, estrelas, nuvens, folhas
- Atualiza iluminação (dia/noite)
- Atualiza highlight do bloco alvo
- Atualiza mão do jogador
- Renderiza a cena

---

## Sistema de Chunks

### Dimensões

- **CHUNK_SIZE**: 32 (X e Z)
- **CHUNK_HEIGHT**: 32 (Y)
- Volume por chunk: 32×32×32 = 32.768 blocos

### Indexação

- Chunks são armazenados em `Record<string, Uint8Array>` com chave `chunkKey(cx, cz)` = `"${cx}_${cz}"`
- Índice linear dentro do chunk: `x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE`

### Coordenadas

- **Mundo (wx, wy, wz)**: coordenadas absolutas
- **Chunk (cx, cz)**: `Math.floor(wx / CHUNK_SIZE)`, `Math.floor(wz / CHUNK_SIZE)`
- **Local (lx, ly, lz)**: `((wx % 32) + 32) % 32` para X/Z, `Math.floor(wy)` para Y

### Sub-chunks

- **SUB_CHUNK_SIZE**: 8
- Cada chunk 32×32×32 é dividido em sub-chunks 8×8×8 para rebuild parcial
- Chave: `subChunkKey(sx, sy, sz)` = `"${sx}_${sy}_${sz}"`

---

## Geração de Mundo

### Parâmetros (`terrain-params.ts`)

- **TERRAIN_SCALE**: 0.02 (frequência do noise)
- **TERRAIN_AMPLITUDE**: 10
- **TERRAIN_BASE_HEIGHT**: 8
- **TERRAIN_HEIGHT_FACTOR**: 0.6
- **DEFAULT_TERRAIN_SEED**: 12345

### Pipeline (`world-generator.ts`)

1. **Terreno base**: Para cada (x, z) no chunk:
   - `noiseVal = noise2D(worldX * TERRAIN_SCALE, worldZ * TERRAIN_SCALE)`
   - `height = TERRAIN_BASE_HEIGHT + TERRAIN_AMPLITUDE * (noiseVal + 1) * TERRAIN_HEIGHT_FACTOR`
   - Abaixo de `height`: DIRT
   - Em `height`: GRASS_BLOCK
   - Acima: AIR

2. **Graminha**: Em blocos GRASS_BLOCK com AIR acima, 56% de chance de colocar GRASS (plantinha)

3. **Árvores**: `placeTrees` (ver `tree-generation.ts`)

### Árvores (`tree-generation.ts`)

- **TREE_CHANCE**: 7% por posição elegível
- **WORLD_TREE_CHANCE**: 5% para árvore gigante
- **SPAWN_CLEAR_RADIUS**: 8 blocos em volta do spawn

Tipos de árvore:
- Oak (4–6)
- Birch (5–7)
- Spruce (6–9)
- Jungle (8–11)
- Acacia (6–8)
- Dark Oak (5–6, tronco 2×2)
- Cherry (5–7)
- World Tree (20–26, tronco 3×3, raro)

Cada tipo tem função de folhas específica (shape, raio).

### Expansão em Background (`world-generator-worker.ts`)

Quando o jogador está a menos de 32 blocos da borda:

1. Main thread envia: `playerX`, `playerZ`, `minCX`, `maxCX`, `minCZ`, `maxCZ`, `seed`
2. Worker determina quais bordas precisam de chunks (West, East, South, North)
3. Gera chunks novos com `generateChunk` (noise + trees)
4. Empacota com `packChunk` e envia de volta
5. Main thread desempacota com `unpackChunk`, atualiza `worldChunks` e bounds, salva

---

## Renderização e Meshing

### Distância de Renderização

- **RENDER_DISTANCE**: 96 blocos (raio do centro do jogador)

### Sub-chunk Meshing (`chunk-mesh-core.ts`)

`buildSubChunkMeshData` percorre um volume 8×8×8 e:

1. **Blocos sólidos**: Para cada face, verifica se o vizinho é transparente (AIR ou GRASS). Se sim, adiciona 2 triângulos (6 vértices) com posição, normal e UVs.

2. **Graminha (GRASS)**: Planta em formato de cruz (2 planos perpendiculares). Usa `buildGrassPlanes` com variação de altura por hash.

3. **Faces**: Ordem +X, -X, +Y, -Y, +Z, -Z. Cada face usa o tile correspondente de `faceTiles` do bloco.

### Greedy Meshing (Culling)

- Apenas faces com vizinho transparente são renderizadas (face culling)

### Rebuild

- **Rebuild completo**: Ao mover 32 blocos, `requestMeshRebuild` agenda `rebuildAllChunks`
- **Rebuild parcial**: Ao quebrar/colocar bloco, `scheduleBlockEditRebuild` reconstrói apenas os sub-chunks afetados (bloco + 6 vizinhos)

### Materiais (`chunk-mesh.ts`, `shaders.ts`)

- **Terrain**: `MeshLambertMaterial` com atlas, sombras
- **Grass**: `MeshLambertMaterial` com `alphaTest: 0.5`, `onBeforeCompile` para vento no vertex shader

---

## Texturas e Atlas

### Atlas Procedural (`texture-atlas.ts`)

- **TILE_SIZE**: 16px
- **TILE_COUNT**: 18 tiles em uma linha

Cada tile é gerado via Canvas API com RNG determinístico:
- Dirt, Grass Top, Grass Side, Wood, Leaves, Grass Plant
- Birch Wood/Leaves, Spruce Wood/Leaves, Jungle Wood/Leaves
- Acacia Wood/Leaves, Dark Oak Wood/Leaves, Cherry Wood/Leaves

### UVs

- `getTileUVs(tileIndex)` retorna `[u0, 0, u1, 1]` para o tile no atlas
- U: `(tileIndex * 16) / (18 * 16)`

---

## Iluminação e Ciclo Dia/Noite

### Configuração (`shaders.ts`)

- **AmbientLight**: 0xb8d4e8, 0.5
- **HemisphereLight**: céu 0x87ceeb, chão 0x6b8e6b, 0.45
- **DirectionalLight (sol)**: 0xfff5e6, 0.85, sombras
- **DirectionalLight (lua)**: 0xaaccff, 0 (inicial, aumenta à noite)

### Ciclo

- **DAY_CYCLE_MS**: 480000
- **START_HOUR**: 15
- `dayAngle` baseado em `performance.now()` e hora inicial
- Sol e lua orbitam em raio 280 em torno do jogador
- Céu interpola entre SKY_DAY (0x87ceeb) e SKY_NIGHT (0x0a0b14)
- Estrelas aparecem quando `darkness > STAR_THRESHOLD = 0.6`

### Atualização (`updateLighting`)

- `sunHeight = sin(dayAngle)`
- Dia: sol projeta sombra, lua não
- Noite: lua projeta sombra, sol não
- Intensidades ajustadas por `dayFactor` e `nightFactor`

---

## Interação e Controles

### Física do Jogador

- **MOVE_SPEED**: 0.12
- **SPRINT_MULTIPLIER**: 1.6
- **FLY_SPEED**: 0.2
- **GRAVITY**: 0.025
- **JUMP_FORCE**: 0.35
- **PLAYER_HEIGHT**: 2, **PLAYER_WIDTH**: 0.8
- **DOUBLE_TAP_MS**: 350 (duplo toque em Space alterna voar)

### Colisão

- `checkCollision`: verifica AABB do jogador contra blocos sólidos (exceto GRASS)
- `isSolidForCollision`: `isSolid` excluindo GRASS

### Raycast (`block-highlight.ts`)

- DDA (Digital Differential Analyzer) para percorrer voxels
- **MAX_RANGE**: 5 blocos
- Retorna bloco atingido e posição do vizinho (para colocar bloco)
- Blocos alvo: sólidos ou GRASS

### Quebrar e Colocar

- **Quebrar**: clique esquerdo → `setBlock` para AIR, remove GRASS acima se existir
- **Colocar**: clique direito → `setBlock` no bloco vizinho com bloco selecionado no hotbar

### HUD (`hud.ts`)

- Crosshair central
- Hotbar com 9 slots, blocos: GRASS_BLOCK, DIRT, WOOD, LEAVES, BIRCH_WOOD, SPRUCE_WOOD, CHERRY_WOOD, CHERRY_LEAVES, DARK_OAK_WOOD
- Teclas 1–9 e scroll para trocar slot

### Player Hand (`player-hand.ts`)

- Cubo 3D com texturas do bloco selecionado
- Posicionado em relação à câmera (canto inferior direito)
- Animação de “bob” sutil

### Mobile (`mobile-controls.ts`)

- Ativo quando `width ≤ 768` ou `height ≤ 600`
- Setas WASD, botão de pular, Quebrar, Colocar
- Zona de arraste para olhar (touchmove → `onLookDelta`)

---

## Persistência e Memória

### Armazenamento (`memory.ts`)

- **Chave**: `minecraft-memory`
- **Formato**: `{ [worldName]: WorldInfos }`
- **WorldInfos**: `chunks` (Record<string, string> base64), `minCX`, `maxCX`, `minCZ`, `maxCZ`, `seed`

### Packing (`chunk-packing.ts`)

- **packChunk**: compacta 32×32×32 blocos (0–15) em 4 bits por bloco → base64
- **unpackChunk**: descompacta base64 → Uint8Array

### Salvamento

- `saveWorldChunks` é chamado após: criar mundo, receber chunks do worker, quebrar/colocar bloco
- `beforeunload` e `pagehide` disparam salvamento

---

## Outdoor (Billboards)

### Conceito

Billboards 3D que exibem Markdown (ex.: currículo) no mundo.

### Posicionamento (`outdoor.ts`)

- Um outdoor fixo à frente do spawn (z - 25)
- Um outdoor aleatório dentro do RENDER_DISTANCE
- `getOutdoorPositions` retorna `{ x, y, z, facing }`

### Criação (`outdoor-billboard.ts`)

1. Cria `div` com HTML gerado por `marked.parse(md)`
2. Estiliza (fonte, cores, bordas)
3. Aguarda carregamento de imagens (ex.: avatar)
4. `html2canvas` renderiza o div em canvas
5. Cria textura e `PlaneGeometry` com a textura
6. Adiciona poste (cilindro) e base
7. Grupo posicionado e rotacionado conforme `facing`

### Visibilidade

- Outdoors fora do RENDER_DISTANCE são ocultados (`child.visible = false`)

---

## Scripts de Build

### `scripts/fetch-avatar.mjs`

- Baixa avatar do GitHub (`https://github.com/Gabriel-Malenowitch.png`)
- Salva em `public/avatar.png`
- Executado antes de `dev` e `build` (`package.json`)

### Comandos

- `npm run dev`: fetch avatar + Vite dev
- `npm run build`: fetch avatar + tsc + Vite build
- `npm run preview`: preview do build

---

## Resumo de Constantes Importantes

| Constante | Valor |
|-----------|-------|
| CHUNK_SIZE | 32 |
| CHUNK_HEIGHT | 32 |
| SUB_CHUNK_SIZE | 8 |
| RENDER_DISTANCE | 96 |
| INITIAL_RADIUS | 4 (9×9 chunks) |
| EXTEND_THRESHOLD | 32 |
| MAX_RANGE (raycast) | 5 |
| REBUILD_THRESHOLD | 32 blocos |
