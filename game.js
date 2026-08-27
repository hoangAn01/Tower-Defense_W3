// Tower Defense W3 - Main Game Logic

// Game Configuration
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    GRID_SIZE: 40,
    INITIAL_HEALTH: 100,
    INITIAL_GOLD: 100,
    INITIAL_LIVES: 3,
    WAVE_DELAY: 3000,
    ENEMY_SPAWN_INTERVAL: 1000,
    GAME_SPEED: 1
};

// Game State
const gameState = {
    health: CONFIG.INITIAL_HEALTH,
    gold: CONFIG.INITIAL_GOLD,
    lives: CONFIG.INITIAL_LIVES,
    wave: 0,
    isGameOver: false,
    isGameWon: false,
    isWaveActive: false,
    selectedTowerType: null,
    selectedTowerCost: 0,
    enemies: [],
    towers: [],
    bullets: [],
    path: [],
    spawnIndex: 0,
    enemiesKilled: 0,
    totalWaves: 15
};

// Canvas and Context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM Elements
const baseHealthEl = document.getElementById('baseHealth');
const goldEl = document.getElementById('gold');
const waveEl = document.getElementById('wave');
const livesEl = document.getElementById('lives');
const gameMessageEl = document.getElementById('gameMessage');
const selectedTowerNameEl = document.getElementById('selectedTowerName');
const cancelPlacementBtn = document.getElementById('cancelPlacement');
const startWaveBtn = document.getElementById('startWaveBtn');
const restartBtn = document.getElementById('restartBtn');
const towerOptions = document.querySelectorAll('.tower-option');


// Asset Configuration
const ASSETS = {
    towers: {
        basic: 'assets/towers/basic_tower.svg',
        sniper: 'assets/towers/sniper_tower.svg',
        cannon: 'assets/towers/cannon_tower.svg'
    },
    enemies: {
        normal: 'assets/enemies/normal_enemy.svg',
        fast: 'assets/enemies/fast_enemy.svg',
        tank: 'assets/enemies/tank_enemy.svg',
        boss: 'assets/enemies/boss_enemy.svg'
    },
    projectiles: {
        basic: 'assets/projectiles/basic_bullet.svg',
        sniper: 'assets/projectiles/sniper_bullet.svg',
        cannon: 'assets/projectiles/cannon_shell.svg'
    }
};

// Preloaded images
const loadedImages = {};

// Tower Types Configuration
const TOWER_TYPES = {
    basic: {
        name: 'Basic Tower',
        cost: 50,
        damage: 10,
        range: 150,
        cooldown: 30,
        color: '#4CAF50',
        secondaryColor: '#45a049',
        size: 30,
        projectileSpeed: 5,
        projectileSize: 6
    },
    sniper: {
        name: 'Sniper Tower',
        cost: 100,
        damage: 25,
        range: 250,
        cooldown: 60,
        color: '#2196F3',
        secondaryColor: '#1976D2',
        size: 25,
        projectileSpeed: 8,
        projectileSize: 4
    },
    cannon: {
        name: 'Cannon Tower',
        cost: 150,
        damage: 40,
        range: 120,
        cooldown: 90,
        color: '#FF9800',
        secondaryColor: '#F57C00',
        size: 35,
        projectileSpeed: 3,
        projectileSize: 10,
        splashRadius: 30
    }
};

// Enemy Types Configuration
const ENEMY_TYPES = {
    normal: {
        health: 50,
        speed: 1,
        reward: 20,
        damage: 10,
        color: '#666',
        secondaryColor: '#888',
        size: 20
    },
    fast: {
        health: 30,
        speed: 2,
        reward: 15,
        damage: 5,
        color: '#2196F3',
        secondaryColor: '#4CAF50',
        size: 18
    },
    tank: {
        health: 100,
        speed: 0.5,
        reward: 40,
        damage: 20,
        color: '#9C27B0',
        secondaryColor: '#FF9800',
        size: 28
    },
    boss: {
        health: 250,
        speed: 0.7,
        reward: 100,
        damage: 50,
        color: '#F44336',
        secondaryColor: '#FFEB3B',
        size: 35
    }
};

// Wave Configuration
const WAVES = [
    // Wave 0 is empty (starting wave)
    [],
    // Wave 1
    [
        { type: 'normal', count: 5, delay: 500 },
        { type: 'fast', count: 3, delay: 1000 }
    ],
    // Wave 2
    [
        { type: 'normal', count: 8, delay: 400 },
        { type: 'tank', count: 2, delay: 1500 }
    ],
    // Wave 3
    [
        { type: 'normal', count: 6, delay: 300 },
        { type: 'fast', count: 5, delay: 800 },
        { type: 'tank', count: 2, delay: 1200 }
    ],
    // Wave 4
    [
        { type: 'normal', count: 10, delay: 250 },
        { type: 'fast', count: 4, delay: 600 },
        { type: 'tank', count: 3, delay: 1500 }
    ],
    // Wave 5
    [
        { type: 'normal', count: 12, delay: 200 },
        { type: 'fast', count: 6, delay: 500 },
        { type: 'tank', count: 4, delay: 1000 },
        { type: 'boss', count: 1, delay: 2000 }
    ],
    // Wave 6
    [
        { type: 'normal', count: 15, delay: 200 },
        { type: 'fast', count: 8, delay: 400 },
        { type: 'tank', count: 5, delay: 800 }
    ],
    // Wave 7
    [
        { type: 'normal', count: 10, delay: 150 },
        { type: 'fast', count: 10, delay: 300 },
        { type: 'tank', count: 6, delay: 600 },
        { type: 'boss', count: 1, delay: 2000 }
    ],
    // Wave 8
    [
        { type: 'normal', count: 20, delay: 150 },
        { type: 'fast', count: 12, delay: 250 },
        { type: 'tank', count: 8, delay: 500 }
    ],
    // Wave 9
    [
        { type: 'normal', count: 15, delay: 100 },
        { type: 'fast', count: 15, delay: 200 },
        { type: 'tank', count: 10, delay: 400 },
        { type: 'boss', count: 2, delay: 2000 }
    ],
    // Wave 10
    [
        { type: 'normal', count: 25, delay: 100 },
        { type: 'fast', count: 20, delay: 150 },
        { type: 'tank', count: 12, delay: 200 },
        { type: 'boss', count: 3, delay: 3000 }
    ],
    // Wave 11
    [
        { type: 'normal', count: 30, delay: 100 },
        { type: 'fast', count: 25, delay: 120 },
        { type: 'tank', count: 8, delay: 300 },
        { type: 'boss', count: 2, delay: 2500 }
    ],
    // Wave 12
    [
        { type: 'fast', count: 30, delay: 80 },
        { type: 'tank', count: 15, delay: 200 },
        { type: 'boss', count: 2, delay: 2000 }
    ],
    // Wave 13
    [
        { type: 'normal', count: 20, delay: 80 },
        { type: 'fast', count: 20, delay: 100 },
        { type: 'tank', count: 12, delay: 150 },
        { type: 'boss', count: 3, delay: 2000 }
    ],
    // Wave 14
    [
        { type: 'tank', count: 20, delay: 150 },
        { type: 'boss', count: 4, delay: 2000 },
        { type: 'fast', count: 30, delay: 100 }
    ],
    // Wave 15 (True Final Wave)
    [
        { type: 'normal', count: 40, delay: 80 },
        { type: 'fast', count: 35, delay: 100 },
        { type: 'tank', count: 20, delay: 150 },
        { type: 'boss', count: 5, delay: 2500 }
    ]
];

// Path Definition (grid coordinates)
const PATH_GRID = [
    { x: 0, y: 5 },
    { x: 2, y: 5 },
    { x: 2, y: 10 },
    { x: 8, y: 10 },
    { x: 8, y: 3 },
    { x: 15, y: 3 },
    { x: 15, y: 8 },
    { x: 19, y: 8 }
];

// Utility Functions
function gridToPixel(gridX, gridY) {
    return {
        x: gridX * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
        y: gridY * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2
    };
}

function pixelToGrid(pixelX, pixelY) {
    return {
        x: Math.floor(pixelX / CONFIG.GRID_SIZE),
        y: Math.floor(pixelY / CONFIG.GRID_SIZE)
    };
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function normalize(x, y) {
    const len = Math.sqrt(x * x + y * y);
    return { x: x / len, y: y / len };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Initialize Path
function initPath() {
    gameState.path = PATH_GRID.map(point => gridToPixel(point.x, point.y));
}

// Tower Class
class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.config = TOWER_TYPES[type];
        this.cooldown = 0;
        this.target = null;
        this.gridX = Math.floor(x / CONFIG.GRID_SIZE);
        this.gridY = Math.floor(y / CONFIG.GRID_SIZE);
    }

    update() {
        if (this.cooldown > 0) {
            this.cooldown--;
            return;
        }

        // Find target
        this.findTarget();
        
        if (this.target && this.target.health > 0) {
            this.shoot();
        }
    }

    findTarget() {
        let closestEnemy = null;
        let closestDistance = Infinity;

        for (const enemy of gameState.enemies) {
            if (enemy.health <= 0) continue;
            
            const dist = distance(this.x, this.y, enemy.x, enemy.y);
            if (dist <= this.config.range && dist < closestDistance) {
                closestDistance = dist;
                closestEnemy = enemy;
            }
        }

        this.target = closestEnemy;
    }

    shoot() {
        if (this.cooldown > 0) return;

        const bullet = new Bullet(
            this.x, this.y, 
            this.target, 
            this.config
        );
        gameState.bullets.push(bullet);
        this.cooldown = this.config.cooldown;
    }

    draw() {
        // Draw tower base
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.config.size, 0, Math.PI * 2);
        ctx.fillStyle = this.config.color;
        ctx.fill();
        ctx.strokeStyle = this.config.secondaryColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw tower details
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.config.name.split(' ')[0], this.x, this.y + 3);

        // Draw cooldown indicator
        if (this.cooldown > 0) {
            const cooldownPercent = this.cooldown / this.config.cooldown;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.config.size + 5, 0, Math.PI * 2 * cooldownPercent);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw range when selected
        if (gameState.selectedTowerType === null && 
            this === getTowerAtPosition(this.x, this.y)) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.config.range, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(76, 175, 80, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}

// Bullet Class
class Bullet {
    constructor(x, y, target, towerConfig) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.speed = towerConfig.projectileSpeed;
        this.damage = towerConfig.damage;
        this.size = towerConfig.projectileSize;
        this.color = towerConfig.color;
        this.hasSplash = towerConfig.splashRadius !== undefined;
        this.splashRadius = towerConfig.splashRadius || 0;
        
        // Calculate direction
        const dx = target.x - x;
        const dy = target.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.direction = { x: dx / dist, y: dy / dist };
    }

    update() {
        this.x += this.direction.x * this.speed * CONFIG.GAME_SPEED;
        this.y += this.direction.y * this.speed * CONFIG.GAME_SPEED;

        // Check collision with target
        const distToTarget = distance(this.x, this.y, this.target.x, this.target.y);
        if (distToTarget < this.size + this.target.size) {
            this.hit();
            return true; // Remove bullet
        }

        // Check if bullet is out of bounds
        if (this.x < 0 || this.x > CONFIG.CANVAS_WIDTH || 
            this.y < 0 || this.y > CONFIG.CANVAS_HEIGHT) {
            return true; // Remove bullet
        }

        return false;
    }

    hit() {
        if (this.hasSplash) {
            // Splash damage
            for (const enemy of gameState.enemies) {
                if (enemy.health <= 0) continue;
                const dist = distance(this.x, this.y, enemy.x, enemy.y);
                if (dist <= this.splashRadius) {
                    enemy.takeDamage(this.damage * (1 - dist / this.splashRadius));
                }
            }
        } else {
            this.target.takeDamage(this.damage);
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// Enemy Class
class Enemy {
    constructor(type, pathIndex = 0) {
        this.type = type;
        this.config = ENEMY_TYPES[type];
        this.pathIndex = pathIndex;
        this.health = this.config.health;
        this.maxHealth = this.config.health;
        this.speed = this.config.speed;
        this.damage = this.config.damage;
        this.size = this.config.size;
        this.color = this.config.color;
        this.secondaryColor = this.config.secondaryColor;
        
        // Position on path
        const pathPoint = gameState.path[pathIndex];
        this.x = pathPoint.x;
        this.y = pathPoint.y;
        this.targetX = gameState.path[pathIndex + 1]?.x || this.x;
        this.targetY = gameState.path[pathIndex + 1]?.y || this.y;
        
        // Movement direction
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.direction = { x: dx / dist, y: dy / dist };
        this.progress = 0;
        this.totalProgress = dist;
    }

    update() {
        if (this.health <= 0) return;

        // Move along path
        this.progress += this.speed * CONFIG.GAME_SPEED;
        
        if (this.progress >= this.totalProgress) {
            this.pathIndex++;
            if (this.pathIndex >= gameState.path.length - 1) {
                // Reached the end - damage base
                gameState.health -= this.damage;
                updateUI();
                return true; // Remove enemy
            }
            
            // Move to next path segment
            const pathPoint = gameState.path[this.pathIndex];
            this.x = pathPoint.x;
            this.y = pathPoint.y;
            this.targetX = gameState.path[this.pathIndex + 1].x;
            this.targetY = gameState.path[this.pathIndex + 1].y;
            
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            this.direction = { x: dx / dist, y: dy / dist };
            this.progress = 0;
            this.totalProgress = dist;
        } else {
            this.x += this.direction.x * this.speed * CONFIG.GAME_SPEED;
            this.y += this.direction.y * this.speed * CONFIG.GAME_SPEED;
        }

        return false;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            gameState.gold += this.config.reward;
            gameState.enemiesKilled++;
            updateUI();
        }
    }

    draw() {
        // Draw enemy body
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = this.secondaryColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw health bar
        const healthPercent = this.health / this.maxHealth;
        const barWidth = this.size * 2;
        const barHeight = 4;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.size - 10, barWidth, barHeight);
        
        ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFC107' : '#F44336';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.size - 10, barWidth * healthPercent, barHeight);

        // Draw enemy type indicator
        ctx.fillStyle = '#fff';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.type.charAt(0).toUpperCase(), this.x, this.y + 3);
    }
}

// Game Functions
function initGame() {
    gameState.health = CONFIG.INITIAL_HEALTH;
    gameState.gold = CONFIG.INITIAL_GOLD;
    gameState.lives = CONFIG.INITIAL_LIVES;
    gameState.wave = 0;
    gameState.isGameOver = false;
    gameState.isGameWon = false;
    gameState.isWaveActive = false;
    gameState.selectedTowerType = null;
    gameState.selectedTowerCost = 0;
    gameState.enemies = [];
    gameState.towers = [];
    gameState.bullets = [];
    gameState.spawnIndex = 0;
    gameState.enemiesKilled = 0;
    
    initPath();
    updateUI();
    clearGameMessage();
    
    // Clear canvas
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    drawPath();
}

function startWave() {
    if (gameState.isWaveActive) return;
    if (gameState.wave >= WAVES.length - 1) {
        // All waves completed
        gameState.isGameWon = true;
        gameState.isGameOver = true;
        showGameOverModal(true);
        return;
    }

    gameState.wave++;
    gameState.isWaveActive = true;
    gameState.spawnIndex = 0;
    
    showWaveIndicator(gameState.wave);
    
    // Start spawning enemies
    setTimeout(() => {
        spawnEnemies();
    }, CONFIG.WAVE_DELAY);
}

function spawnEnemies() {
    const waveConfig = WAVES[gameState.wave];
    
    if (gameState.spawnIndex >= waveConfig.length) {
        // All enemy groups spawned, check if all enemies are dead
        if (gameState.enemies.length === 0) {
            gameState.isWaveActive = false;
            gameState.wave++;
            updateUI();
            showGameMessage(`Wave ${gameState.wave - 1} completed!`, 'success');
        }
        return;
    }

    const enemyGroup = waveConfig[gameState.spawnIndex];
    
    // Spawn enemy
    const enemy = new Enemy(enemyGroup.type);
    gameState.enemies.push(enemy);
    
    // Schedule next spawn
    gameState.spawnIndex++;
    
    if (gameState.spawnIndex < waveConfig.length) {
        setTimeout(spawnEnemies, enemyGroup.delay);
    } else {
        // All groups scheduled, check for completion
        setTimeout(() => {
            if (gameState.enemies.length === 0) {
                gameState.isWaveActive = false;
                updateUI();
                showGameMessage(`Wave ${gameState.wave} completed!`, 'success');
            }
        }, 1000);
    }
}

function updateGame() {
    if (gameState.isGameOver) return;

    // Update towers
    for (const tower of gameState.towers) {
        tower.update();
    }

    // Update bullets
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        const bullet = gameState.bullets[i];
        const shouldRemove = bullet.update();
        if (shouldRemove) {
            gameState.bullets.splice(i, 1);
        }
    }

    // Update enemies
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        const shouldRemove = enemy.update();
        if (shouldRemove || enemy.health <= 0) {
            gameState.enemies.splice(i, 1);
        }
    }

    // Check game over conditions
    if (gameState.health <= 0) {
        gameState.lives--;
        if (gameState.lives <= 0) {
            gameState.isGameOver = true;
            gameState.isGameWon = false;
            showGameOverModal(false);
        } else {
            gameState.health = CONFIG.INITIAL_HEALTH;
            updateUI();
            showGameMessage(`Life lost! ${gameState.lives} lives remaining.`, 'warning');
        }
    }

    // Check if all waves are completed
    if (gameState.wave >= WAVES.length - 1 && gameState.enemies.length === 0 && !gameState.isWaveActive) {
        gameState.isGameWon = true;
        gameState.isGameOver = true;
        showGameOverModal(true);
    }
}

function drawGame() {
    // Clear canvas
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Draw path
    drawPath();

    // Draw bullets
    for (const bullet of gameState.bullets) {
        bullet.draw();
    }

    // Draw enemies
    for (const enemy of gameState.enemies) {
        enemy.draw();
    }

    // Draw towers
    for (const tower of gameState.towers) {
        tower.draw();
    }

    // Draw tower placement preview
    if (gameState.selectedTowerType) {
        drawPlacementPreview();
    }
}

function drawPath() {
    if (gameState.path.length === 0) return;

    ctx.strokeStyle = '#444';
    ctx.lineWidth = CONFIG.GRID_SIZE - 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(gameState.path[0].x, gameState.path[0].y);
    
    for (let i = 1; i < gameState.path.length; i++) {
        ctx.lineTo(gameState.path[i].x, gameState.path[i].y);
    }
    
    ctx.stroke();

    // Draw start and end points
    ctx.beginPath();
    ctx.arc(gameState.path[0].x, gameState.path[0].y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#4CAF50';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(gameState.path[gameState.path.length - 1].x, gameState.path[gameState.path.length - 1].y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#F44336';
    ctx.fill();
}

function drawPlacementPreview() {
    const mousePos = getMousePosition();
    if (!mousePos) return;

    const gridPos = pixelToGrid(mousePos.x, mousePos.y);
    const pixelPos = gridToPixel(gridPos.x, gridPos.y);

    const towerConfig = TOWER_TYPES[gameState.selectedTowerType];
    
    // Check if position is valid
    const isValid = isValidTowerPosition(gridPos.x, gridPos.y);
    
    // Draw placement preview
    ctx.beginPath();
    ctx.arc(pixelPos.x, pixelPos.y, towerConfig.size, 0, Math.PI * 2);
    ctx.fillStyle = isValid ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)';
    ctx.fill();
    ctx.strokeStyle = isValid ? '#4CAF50' : '#F44336';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw range preview
    ctx.beginPath();
    ctx.arc(pixelPos.x, pixelPos.y, towerConfig.range, 0, Math.PI * 2);
    ctx.strokeStyle = isValid ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function isValidTowerPosition(gridX, gridY) {
    // Check if position is on the path
    for (const pathPoint of PATH_GRID) {
        if (pathPoint.x === gridX && pathPoint.y === gridY) {
            return false;
        }
    }

    // Check if position is already occupied by a tower
    for (const tower of gameState.towers) {
        if (tower.gridX === gridX && tower.gridY === gridY) {
            return false;
        }
    }

    // Check boundaries
    if (gridX < 0 || gridX >= Math.floor(CONFIG.CANVAS_WIDTH / CONFIG.GRID_SIZE)) return false;
    if (gridY < 0 || gridY >= Math.floor(CONFIG.CANVAS_HEIGHT / CONFIG.GRID_SIZE)) return false;

    return true;
}

function placeTower(gridX, gridY) {
    if (!gameState.selectedTowerType) return;
    if (!isValidTowerPosition(gridX, gridY)) return;

    const towerConfig = TOWER_TYPES[gameState.selectedTowerType];
    
    if (gameState.gold < towerConfig.cost) {
        showGameMessage('Not enough gold!', 'danger');
        return;
    }

    const pixelPos = gridToPixel(gridX, gridY);
    const tower = new Tower(pixelPos.x, pixelPos.y, gameState.selectedTowerType);
    gameState.towers.push(tower);
    gameState.gold -= towerConfig.cost;
    
    // Clear selection
    gameState.selectedTowerType = null;
    gameState.selectedTowerCost = 0;
    
    updateUI();
    showGameMessage(`Placed ${towerConfig.name}!`, 'success');
}

function getTowerAtPosition(x, y) {
    for (const tower of gameState.towers) {
        const dist = distance(tower.x, tower.y, x, y);
        if (dist <= tower.config.size) {
            return tower;
        }
    }
    return null;
}

function getMousePosition() {
    // This will be set by event listeners
    return gameState.mousePosition || null;
}

function updateUI() {
    baseHealthEl.textContent = gameState.health;
    goldEl.textContent = gameState.gold;
    waveEl.textContent = gameState.wave;
    livesEl.textContent = gameState.lives;

    // Update health color based on percentage
    const healthPercent = gameState.health / CONFIG.INITIAL_HEALTH;
    baseHealthEl.className = 'stat-value ' + 
        (healthPercent > 0.5 ? '' : healthPercent > 0.25 ? 'warning' : 'danger');

    // Update gold color
    goldEl.className = 'stat-value';

    // Update wave button
    startWaveBtn.disabled = gameState.isWaveActive || gameState.isGameOver;
    
    // Update tower options
    towerOptions.forEach(option => {
        const towerType = option.dataset.towerType;
        const towerCost = parseInt(option.dataset.cost);
        option.disabled = gameState.gold < towerCost || gameState.isWaveActive;
    });

    // Update selected tower info
    if (gameState.selectedTowerType) {
        selectedTowerNameEl.textContent = TOWER_TYPES[gameState.selectedTowerType].name;
        cancelPlacementBtn.style.display = 'inline-block';
    } else {
        selectedTowerNameEl.textContent = 'None';
        cancelPlacementBtn.style.display = 'none';
    }
}

function clearGameMessage() {
    gameMessageEl.textContent = '';
    gameMessageEl.className = 'game-message';
}

function showGameMessage(message, type = 'info') {
    gameMessageEl.textContent = message;
    gameMessageEl.className = `game-message ${type}`;
    
    setTimeout(clearGameMessage, 3000);
}

function showWaveIndicator(waveNumber) {
    const waveIndicator = document.createElement('div');
    waveIndicator.className = 'wave-indicator active';
    waveIndicator.innerHTML = `<div class="wave-text">Wave ${waveNumber}</div>`;
    document.body.appendChild(waveIndicator);

    setTimeout(() => {
        waveIndicator.remove();
    }, 2000);
}

function showGameOverModal(isWin) {
    // Remove any existing modal
    const existingModal = document.querySelector('.game-over-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'game-over-modal active';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const title = document.createElement('div');
    title.className = `modal-title ${isWin ? 'win' : ''}`;
    title.textContent = isWin ? 'Victory!' : 'Game Over';
    
    const text = document.createElement('div');
    text.className = 'modal-text';
    text.textContent = isWin ? 'You have defeated all waves!' : 'Your base has been destroyed!';
    
    const stats = document.createElement('div');
    stats.className = 'modal-stats';
    
    const wavesStat = document.createElement('div');
    wavesStat.className = 'modal-stat';
    wavesStat.innerHTML = `<span class="modal-stat-label">Waves Completed:</span>
                           <span class="modal-stat-value">${gameState.wave - 1}</span>`;
    
    const enemiesStat = document.createElement('div');
    enemiesStat.className = 'modal-stat';
    enemiesStat.innerHTML = `<span class="modal-stat-label">Enemies Killed:</span>
                             <span class="modal-stat-value">${gameState.enemiesKilled}</span>`;
    
    const goldStat = document.createElement('div');
    goldStat.className = 'modal-stat';
    goldStat.innerHTML = `<span class="modal-stat-label">Gold Earned:</span>
                         <span class="modal-stat-value">${gameState.gold}</span>`;
    
    stats.appendChild(wavesStat);
    stats.appendChild(enemiesStat);
    stats.appendChild(goldStat);
    
    const buttons = document.createElement('div');
    buttons.className = 'modal-buttons';
    
    const restartBtn = document.createElement('button');
    restartBtn.className = 'btn btn-primary';
    restartBtn.textContent = 'Play Again';
    restartBtn.addEventListener('click', () => {
        modal.remove();
        initGame();
    });
    
    buttons.appendChild(restartBtn);
    
    modalContent.appendChild(title);
    modalContent.appendChild(text);
    modalContent.appendChild(stats);
    modalContent.appendChild(buttons);
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}

// Event Listeners
canvas.addEventListener('click', (e) => {
    if (gameState.isGameOver) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    gameState.mousePosition = { x, y };
    
    if (gameState.selectedTowerType) {
        const gridPos = pixelToGrid(x, y);
        placeTower(gridPos.x, gridPos.y);
    } else {
        // Check if clicking on a tower to show info
        const tower = getTowerAtPosition(x, y);
        if (tower) {
            showGameMessage(`${tower.config.name} - Damage: ${tower.config.damage}, Range: ${tower.config.range}`, 'info');
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    gameState.mousePosition = { x, y };
});

towerOptions.forEach(option => {
    option.addEventListener('click', () => {
        if (gameState.isWaveActive || gameState.isGameOver) return;
        
        const towerType = option.dataset.towerType;
        const towerCost = parseInt(option.dataset.cost);
        
        if (gameState.gold < towerCost) {
            showGameMessage('Not enough gold!', 'danger');
            return;
        }
        
        // Select tower type
        gameState.selectedTowerType = towerType;
        gameState.selectedTowerCost = towerCost;
        
        // Update UI
        towerOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        updateUI();
    });
});

cancelPlacementBtn.addEventListener('click', () => {
    gameState.selectedTowerType = null;
    gameState.selectedTowerCost = 0;
    towerOptions.forEach(opt => opt.classList.remove('selected'));
    updateUI();
});

startWaveBtn.addEventListener('click', startWave);

restartBtn.addEventListener('click', () => {
    initGame();
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gameState.selectedTowerType) {
        gameState.selectedTowerType = null;
        gameState.selectedTowerCost = 0;
        towerOptions.forEach(opt => opt.classList.remove('selected'));
        updateUI();
    }
});

// Game Loop
function gameLoop() {
    updateGame();
    drawGame();
    requestAnimationFrame(gameLoop);
}

// Initialize and Start Game
initGame();
updateUI();
showGameMessage('Click "Start Wave" to begin!', 'info');
gameLoop();

// Make functions globally accessible for debugging
window.gameState = gameState;
window.CONFIG = CONFIG;
window.TOWER_TYPES = TOWER_TYPES;
window.ENEMY_TYPES = ENEMY_TYPES;
