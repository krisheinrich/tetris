const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

const WIDTH = canvas.width / 2
const HEIGHT = canvas.height

const CELL_ROWS = 20
const CELL_COLS = 10

const CELL_WIDTH = WIDTH/CELL_COLS
const CELL_HEIGHT = HEIGHT/CELL_ROWS

// setup game variables
const BG_COLOR = '#000'

const COLORS = [
  BG_COLOR,
  'lightblue',
  'blue',
  'orange',
  'yellow',
  'green',
  'purple',
  'red'
]

const arena = createMatrix(CELL_ROWS, CELL_COLS)

let DIFFICULTIES = [
  'EASY',
  'NORMAL',
  'HARD'
]

let difficulty = 1

const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0
}

let nextPiece;
resetPlayer()

const DEFAULT_DROP_INTERVAL = 1000;
const MIN_DROP_INTERVAL = 50;

let IS_PAUSED = true
let highScore = localStorage.getItem(`tetris-game-high-score-${DIFFICULTIES[difficulty].toLowerCase()}`) || 0;



/* Game functions */

// Matrix helpers
function cloneMatrix(matrix) {
  return JSON.parse(JSON.stringify(matrix))
}

function createMatrix(rows, cols) {
  const matrix = []
  while (rows--) matrix.push(new Array(cols).fill(0))
  return matrix
}

function createTetromino(name) {
  switch (name) {
    case 'I':
      return [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
      ]
  
    case 'J':
      return [
        [0, 2, 0],
        [0, 2, 0],
        [2, 2, 0],
      ]

    case 'L':
      return [
        [0, 3, 0],
        [0, 3, 0],
        [0, 3, 3],
      ]
  
    case 'O':
      return [
        [4, 4],
        [4, 4],
      ]
  
    case 'S':
      return [
        [0, 5, 5],
        [5, 5, 0],
        [0, 0, 0],
      ]
  
    case 'T':
      return [
        [0, 0, 0],
        [6, 6, 6],
        [0, 6, 0],
      ]
  
    case 'Z':
      return [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0],
      ]
  
    default:
      break;
  }
}

function rotate(matrix, dir) {
  // transpose rows <-> cols
  matrix.forEach((row, y) => {
    row.forEach((val, x) => {
      if (x < y) [ matrix[x][y], matrix[y][x] ] = [ matrix[y][x], matrix[x][y] ]
    })
  })

  // handle direction
  if (dir > 0)
    matrix.forEach(row => row.reverse())
  else
    matrix.reverse()
}

// Arena helpers
function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((val, x) => {
      if (val) arena[y + player.pos.y][x + player.pos.x] = val
    })
  })
}

function collide(arena, player) {
  const { matrix: m, pos } = player
  for (let y = 0; y < m.length; y++) {
    const row = m[y]
    for (let x = 0; x < row.length; x++) {
      const isOpen = arena[y + pos.y] && arena[y + pos.y][x + pos.x] === 0
      if (row[x] !== 0 && !isOpen) {
        return true
      }
    }
  }
  return false
}

function clearFullRows() {
  let multiplier = 1;
  for (let i = CELL_ROWS-1; i >= 0; i--) {
    while (arena[i].every(val => val !== 0)) {
      // remove row and add a new row of zeros to the top
      const dropped = arena.splice(i, 1)[0]
      arena.unshift(dropped.fill(0))
      // add score for row
      const rowPoints = multiplier * 10;
      console.log("Player scored", rowPoints);
      updatePlayerScoreBy(rowPoints);
      multiplier *= 2
    }
    // reset multiplier
    if (multiplier > 1) {
      multiplier = 1
      if (dropInterval > MIN_DROP_INTERVAL)
        dropInterval -= 10
    }
  }
}

// Player helpers
function resetPlayer() {
  const pieces = 'IJLOSTZ'
  const newPiece = nextPiece || pieces[ Math.floor(pieces.length * Math.random()) ]
  nextPiece = pieces[ Math.floor(pieces.length * Math.random()) ]

  let shouldBlock = false

  if (difficulty === 0) {
    let triesForI = 2;
    while (triesForI-- && nextPiece !== 'I')
      nextPiece = pieces[ Math.floor(pieces.length * Math.random()) ]
  } else if (difficulty === 2 && nextPiece == 'I') {
    if (shouldBlock) {
      nextPiece = pieces[ Math.floor(pieces.length * Math.random()) ]
      shouldBlock = false
    } else {
      shouldBlock = true
    }
  }

  player.matrix = cloneMatrix( createTetromino(newPiece) )
  player.pos = {
    x: Math.floor(CELL_COLS/2) - Math.floor(player.matrix[0].length/2),
    y: 0
  }
  
  // handle end game
  if (collide(arena, player)) {
    arena.forEach(row => row.fill(0))
    player.score = 0
    IS_PAUSED = true
    const audio = document.getElementById('theme')
    audio.pause()
  }
}

function dropPlayer() {
  player.pos.y++

  // check for collision with existing piece or arena bottom
  if (collide(arena, player)) {
    // undo last player piece drop and merge into arena
    player.pos.y--
    merge(arena, player)

    resetPlayer()
    clearFullRows()
    displayScores()
  }
}

function movePlayer(dir) {
  player.pos.x += dir
  if (collide(arena, player)) {
    player.pos.x -= dir
  }
}

function rotatePlayer(dir) {
  rotate(player.matrix, dir)

  // handle intersection with arena wall by moving player left/right as needed
  const startingPos = player.pos.x
  let offset = 1
  while (collide(arena, player)) {
    player.pos.x += offset
    offset = -(offset + Math.sign(offset))
    // if offset gets too big, abort
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir)
      player.pos.x = startingPos
      return
    }
  }
}

// Score helpers
function updatePlayerScoreBy(score) {
  player.score += score
  if (player.score > highScore) {
    highScore = player.score
    localStorage.setItem(`tetris-game-high-score-${DIFFICULTIES[difficulty].toLowerCase()}`, highScore)
  }
}

function displayScores() {
  document.getElementById('score').innerText = "Player Score = " + player.score;
  document.getElementById('high-score').innerText = "High Score = " + highScore;
}

function displayMode() {
  document.getElementById('mode').innerText = `Difficulty: ${DIFFICULTIES[difficulty]}`;
}

// Drawing helpers
function clear() {
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
}

function draw() {
  clear()

  // arena
  drawMatrixTiles(arena)
  // current player piece
  drawMatrixTiles(player.matrix, player.pos)
  // next piece
  drawNextPiece()
}

function drawMatrixTiles(matrix, offset = { x: 0, y: 0 }) {
  matrix.forEach((row, y) => {
    row.forEach((val, x) => {
      if (val !== 0) {
        ctx.fillStyle = COLORS[val]
        ctx.fillRect(CELL_WIDTH * (x + offset.x), CELL_HEIGHT * (y + offset.y), CELL_WIDTH, CELL_HEIGHT)
        ctx.lineWidth = "3";
        ctx.strokeStyle = BG_COLOR
        ctx.strokeRect(CELL_WIDTH * (x + offset.x), CELL_HEIGHT * (y + offset.y), CELL_WIDTH, CELL_HEIGHT)
      }
    })
  })
}

function drawPausedIndicator() {
  ctx.fillStyle = "rgba(0,0,0,0.6)"
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.fillStyle = "#fff"
  ctx.font = "28px Helvetica"
  ctx.textAlign = "center"
  ctx.fillText("Press Space to Play", WIDTH/2, HEIGHT/2)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

function drawNextPiece() {
  const offset = 80
  const boxWidth = WIDTH - 2*offset
  // box
  ctx.fillStyle = "#000"
  ctx.strokeStyle = "#fff"
  ctx.strokeWidth = 6
  ctx.fillRect(WIDTH + offset, offset/2, boxWidth, boxWidth)
  ctx.strokeRect(WIDTH + offset, offset/2, boxWidth, boxWidth)
  // text
  ctx.fillStyle = "#fff"
  ctx.font = "20px Helvetica"
  ctx.translate(WIDTH + offset, offset/2)
  ctx.textAlign = "center"
  ctx.fillText("Next piece", boxWidth/2, offset/2)
  // shape
  if (nextPiece) {
    // console.log("nextPiece", nextPiece)
    const matrix = cloneMatrix( createTetromino(nextPiece) )
    ctx.scale(2/3, 2/3)
    // drawMatrixTiles(matrix, { x: 1.75, y: 1.5 })
    matrix.forEach((row, y) => {
      row.forEach((val, x) => {
        if (val !== 0) {
          ctx.fillStyle = COLORS[val]
          ctx.fillRect(CELL_WIDTH * x + boxWidth/2 + 10, CELL_HEIGHT * y + 120, CELL_WIDTH, CELL_HEIGHT)
          ctx.strokeWidth = "3"
          ctx.strokeStyle = BG_COLOR
          ctx.strokeRect(CELL_WIDTH * x + boxWidth/2 + 10, CELL_HEIGHT * y + 120, CELL_WIDTH, CELL_HEIGHT)
        }
      })
    })
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

/* Game update logic */

let dropInterval = DEFAULT_DROP_INTERVAL
let dropCounter = 0

let lastTime = 0

function update(t = 0) {
  const dt = t - lastTime
  lastTime = t

  if (IS_PAUSED) {
    draw()
    drawPausedIndicator()
  } else {
    dropCounter += dt
    if (dropCounter >= dropInterval) {
      dropPlayer()
      dropCounter = 0
    }

    draw()
  }
  
  requestAnimationFrame(update)
}


// setup event listeners
document.addEventListener('keydown', e => {
  if (IS_PAUSED && e.keyCode !== 32) return;
  switch (e.keyCode) {
    case 32:  // space
      e.preventDefault()  // prevent scrolling
      IS_PAUSED = !IS_PAUSED
      const audio = document.getElementById('theme')
      if (IS_PAUSED) {
        audio.pause()
      } else {
        audio.play()
      }
      break
    case 37:  // left
      movePlayer(-1)
      break
    case 39:  // right
      movePlayer(1)
      break
    case 38:  // up
      e.preventDefault()  // prevent scrolling
      break
    case 40:  // down
      e.preventDefault()  // prevent scrolling
      dropInterval = MIN_DROP_INTERVAL
      break
    case 81:  // q
      rotatePlayer(-1)
      break
    case 87:  // w
      rotatePlayer(1)
      break
    default:
      break
  }
})

document.addEventListener('keyup', e => {
  if (e.keyCode === 40) {
    dropInterval = 1000
  }
})

const modeIds = ['mode-easy', 'mode-normal', 'mode-hard'];
modeIds.forEach((id, i) => {
  document.getElementById(id).addEventListener('click', () => {
    difficulty = i;
    displayMode()
    highScore = localStorage.getItem(`tetris-game-high-score-${DIFFICULTIES[difficulty].toLowerCase()}`) || 0;
    displayScores()
  })
})

// init game
displayScores()
displayMode()
update()