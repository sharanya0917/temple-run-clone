const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const coinsEl = document.getElementById('coins');
const finalScoreEl = document.getElementById('finalScore');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');

const lanes = [-1, 0, 1];
const laneWidth = 92;

const state = {
  running: false,
  gameOver: false,
  lastTime: 0,
  score: 0,
  coins: 0,
  distance: 0,
  speed: 11,
  spawnTimer: 0.8,
  obstacles: [],
  collectibles: [],
};

const player = {
  lane: 1,
  jumpVelocity: 0,
  jumpHeight: 0,
  onGround: true,
  sliding: false,
  slideTimer: 0,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function resetPlayer() {
  player.lane = 1;
  player.jumpVelocity = 0;
  player.jumpHeight = 0;
  player.onGround = true;
  player.sliding = false;
  player.slideTimer = 0;
}

function resetGame() {
  state.running = false;
  state.gameOver = false;
  state.score = 0;
  state.coins = 0;
  state.distance = 0;
  state.speed = 11;
  state.spawnTimer = 0.8;
  state.obstacles = [];
  state.collectibles = [];
  resetPlayer();
  updateHud();
  hideOverlays();
}

function updateHud() {
  scoreEl.textContent = Math.floor(state.score);
  coinsEl.textContent = state.coins;
}

function hideOverlays() {
  startOverlay.classList.add('hidden');
  startOverlay.classList.remove('visible');
  gameOverOverlay.classList.add('hidden');
  gameOverOverlay.classList.remove('visible');
}

function showStartOverlay() {
  startOverlay.classList.remove('hidden');
  startOverlay.classList.add('visible');
  gameOverOverlay.classList.add('hidden');
  gameOverOverlay.classList.remove('visible');
}

function showGameOver() {
  state.running = false;
  state.gameOver = true;
  finalScoreEl.textContent = Math.floor(state.score);
  gameOverOverlay.classList.remove('hidden');
  gameOverOverlay.classList.add('visible');
}

function startGame() {
  if (state.running) return;
  state.running = true;
  state.gameOver = false;
  state.score = 0;
  state.coins = 0;
  state.distance = 0;
  state.speed = 11;
  state.spawnTimer = 0.7;
  state.obstacles = [];
  state.collectibles = [];
  resetPlayer();
  updateHud();
  hideOverlays();
}

function beginTurn() {
  if (!state.running) {
    startGame();
  }
}

function handleInput(action) {
  if (!state.running) {
    beginTurn();
    if (!state.running) return;
  }

  if (action === 'left') {
    player.lane = clamp(player.lane - 1, 0, 2);
  }

  if (action === 'right') {
    player.lane = clamp(player.lane + 1, 0, 2);
  }

  if (action === 'jump' && player.onGround) {
    player.jumpVelocity = 15.5;
    player.onGround = false;
    player.sliding = false;
    player.slideTimer = 0;
  }

  if (action === 'slide' && player.onGround) {
    player.sliding = true;
    player.slideTimer = 0.7;
  }
}

function laneX(lane) {
  return canvas.width / 2 + lanes[lane] * laneWidth;
}

function spawnPattern() {
  const openLane = Math.floor(Math.random() * 3);
  const otherLanes = [0, 1, 2].filter((lane) => lane !== openLane);
  const obstacleCount = Math.random() < 0.7 ? 1 : 2;

  const chosen = [];
  if (obstacleCount === 1) {
    chosen.push(otherLanes[Math.floor(Math.random() * otherLanes.length)]);
  } else {
    chosen.push(otherLanes[0], otherLanes[1]);
  }

  chosen.forEach((lane) => {
    const type = Math.random() < 0.55 ? 'wall' : 'barrier';
    state.obstacles.push({
      lane,
      type,
      progress: 1.2,
    });
  });

  if (Math.random() < 0.9) {
    const coinLane = openLane;
    const coinCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < coinCount; i += 1) {
      state.collectibles.push({
        lane: coinLane,
        progress: 1.05 + i * 0.18,
        collected: false,
      });
    }
  }

  if (Math.random() < 0.35) {
    const bonusLane = Math.floor(Math.random() * 3);
    state.collectibles.push({
      lane: bonusLane,
      progress: 1.1,
      collected: false,
      premium: true,
    });
  }
}

function updatePlayer(dt) {
  if (!player.onGround) {
    player.jumpVelocity -= 36 * dt;
    player.jumpHeight += player.jumpVelocity * dt;

    if (player.jumpHeight <= 0) {
      player.jumpHeight = 0;
      player.jumpVelocity = 0;
      player.onGround = true;
    }
  }

  if (player.sliding && player.onGround) {
    player.slideTimer -= dt;
    if (player.slideTimer <= 0) {
      player.sliding = false;
      player.slideTimer = 0;
    }
  }
}

function updateWorld(dt) {
  state.speed = Math.min(28, 11 + state.distance / 180);
  state.distance += state.speed * dt * 17;
  state.score += dt * (20 + state.speed * 4);
  state.spawnTimer -= dt;

  if (state.spawnTimer <= 0) {
    state.spawnTimer = clamp(0.9 - state.distance / 5000, 0.35, 0.9);
    spawnPattern();
  }

  for (const obstacle of state.obstacles) {
    obstacle.progress -= dt * (0.68 + state.speed * 0.035);
  }

  for (const coin of state.collectibles) {
    coin.progress -= dt * (0.7 + state.speed * 0.04);
  }

  state.obstacles = state.obstacles.filter((obstacle) => obstacle.progress > -0.2);
  state.collectibles = state.collectibles.filter((coin) => coin.progress > -0.2 && !coin.collected);
}

function checkCollisions() {
  const playerLane = player.lane;

  for (const obstacle of state.obstacles) {
    if (obstacle.lane !== playerLane) continue;
    if (obstacle.progress > 0.12 || obstacle.progress < -0.08) continue;

    if (obstacle.type === 'wall') {
      if (player.jumpHeight < 48) {
        showGameOver();
        return;
      }
    }

    if (obstacle.type === 'barrier') {
      if (!player.sliding) {
        showGameOver();
        return;
      }
    }
  }

  for (const coin of state.collectibles) {
    if (coin.lane !== playerLane) continue;
    if (coin.collected) continue;
    if (coin.progress > 0.12 || coin.progress < -0.05) continue;

    coin.collected = true;
    state.coins += coin.premium ? 5 : 1;
    state.score += coin.premium ? 120 : 35;
    updateHud();
  }
}

function gameLoop(timestamp) {
  if (!state.lastTime) state.lastTime = timestamp;
  const dt = Math.min(0.033, (timestamp - state.lastTime) / 1000);
  state.lastTime = timestamp;

  if (state.running) {
    updatePlayer(dt);
    updateWorld(dt);
    checkCollisions();
    updateHud();
  }

  draw();
  requestAnimationFrame(gameLoop);
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#9dd3ee');
  sky.addColorStop(0.3, '#b8d9c6');
  sky.addColorStop(0.6, '#d9c396');
  sky.addColorStop(1, '#b7874d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 8; i += 1) {
    const x = 30 + i * 52;
    const y = 90 + (i % 2) * 22;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTrack() {
  const roadTop = 140;
  const roadBottom = canvas.height;

  ctx.fillStyle = '#5f5c5f';
  ctx.beginPath();
  ctx.moveTo(70, roadBottom);
  ctx.lineTo(canvas.width - 70, roadBottom);
  ctx.lineTo(canvas.width * 0.72, roadTop);
  ctx.lineTo(canvas.width * 0.28, roadTop);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#4a4a4a';
  ctx.beginPath();
  ctx.moveTo(104, roadBottom);
  ctx.lineTo(canvas.width - 104, roadBottom);
  ctx.lineTo(canvas.width * 0.68, roadTop + 8);
  ctx.lineTo(canvas.width * 0.32, roadTop + 8);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 3;
  for (let i = 1; i <= 2; i += 1) {
    const x1 = canvas.width / 2 + (i - 1.5) * 90;
    const x2 = canvas.width / 2 + (i - 1.5) * 82;
    ctx.beginPath();
    ctx.moveTo(x1, roadTop + 25);
    ctx.lineTo(x2, roadBottom);
    ctx.stroke();
  }

  for (let i = 0; i < 10; i += 1) {
    const y = roadTop + 18 + i * 52;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.34, y);
    ctx.lineTo(canvas.width * 0.66, y);
    ctx.stroke();
  }
}

function drawObstacle(obstacle) {
  const x = canvas.width / 2 + (obstacle.lane - 1) * 90 * (0.72 + (1 - obstacle.progress) * 0.8);
  const scale = 0.55 + (1 - obstacle.progress) * 0.95;
  const y = 130 + (1 - obstacle.progress) * 490;

  if (obstacle.type === 'wall') {
    ctx.fillStyle = '#9d5a40';
    ctx.fillRect(x - 26 * scale, y - 46 * scale, 52 * scale, 60 * scale);
    ctx.fillStyle = '#7a4432';
    ctx.fillRect(x - 18 * scale, y - 65 * scale, 36 * scale, 18 * scale);
  } else {
    ctx.fillStyle = '#b55650';
    ctx.fillRect(x - 36 * scale, y + 16 * scale, 72 * scale, 16 * scale);
    ctx.fillStyle = '#8a3d38';
    ctx.fillRect(x - 30 * scale, y + 4 * scale, 60 * scale, 18 * scale);
  }
}

function drawCoin(coin) {
  const x = canvas.width / 2 + (coin.lane - 1) * 90 * (0.72 + (1 - coin.progress) * 0.8);
  const y = 140 + (1 - coin.progress) * 500;
  const radius = coin.premium ? 12 : 9;

  ctx.fillStyle = coin.premium ? '#ffdd7a' : '#f5c451';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(x - radius * 0.24, y - radius * 0.24, radius * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
  const x = canvas.width / 2 + (player.lane - 1) * laneWidth;
  const yBase = canvas.height - 120 - player.jumpHeight;
  const bodyHeight = player.sliding ? 26 : 52;
  const bodyWidth = player.sliding ? 48 : 36;

  ctx.fillStyle = '#ffb84d';
  ctx.fillRect(x - bodyWidth / 2, yBase - bodyHeight, bodyWidth, bodyHeight);

  ctx.fillStyle = '#f8d36b';
  ctx.beginPath();
  ctx.arc(x, yBase - bodyHeight - 14, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1f1c27';
  ctx.fillRect(x - 7, yBase - bodyHeight - 19, 3, 3);
  ctx.fillRect(x + 4, yBase - bodyHeight - 19, 3, 3);

  ctx.fillStyle = '#4f2d1c';
  ctx.fillRect(x - 12, yBase - bodyHeight + 8, 8, bodyHeight * 0.4);
  ctx.fillRect(x + 4, yBase - bodyHeight + 8, 8, bodyHeight * 0.4);

  ctx.fillStyle = '#422e24';
  ctx.fillRect(x - 18, yBase - bodyHeight + 12, 6, 18);
  ctx.fillRect(x + 12, yBase - bodyHeight + 12, 6, 18);
}

function draw() {
  drawBackground();
  drawTrack();

  state.collectibles.forEach(drawCoin);
  state.obstacles.forEach(drawObstacle);
  drawPlayer();

  if (!state.running && !state.gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function onKeyDown(event) {
  const key = event.key.toLowerCase();

  if (key === 'arrowleft' || key === 'a') handleInput('left');
  if (key === 'arrowright' || key === 'd') handleInput('right');
  if (key === 'arrowup' || key === 'w' || key === ' ') handleInput('jump');
  if (key === 'arrowdown' || key === 's') handleInput('slide');

  if (event.key === 'Enter' && !state.running) {
    startGame();
  }
}

function handlePointerStart(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  canvas.dataset.pointerX = String(x);
  canvas.dataset.pointerY = String(y);
}

function handlePointerEnd(event) {
  const rect = canvas.getBoundingClientRect();
  const endX = event.clientX - rect.left;
  const endY = event.clientY - rect.top;
  const startX = Number(canvas.dataset.pointerX || endX);
  const startY = Number(canvas.dataset.pointerY || endY);
  const dx = endX - startX;
  const dy = endY - startY;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 26) handleInput('right');
    if (dx < -26) handleInput('left');
  } else {
    if (dy < -26) handleInput('jump');
    if (dy > 26) handleInput('slide');
  }

  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
    handleInput('jump');
  }
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
document.addEventListener('keydown', onKeyDown);
canvas.addEventListener('pointerdown', handlePointerStart);
canvas.addEventListener('pointerup', handlePointerEnd);

showStartOverlay();
requestAnimationFrame(gameLoop);
