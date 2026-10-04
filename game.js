// Tower Defense W3 - Main Game Logic

// Game Configuration
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    GRID_SIZE: 40,
    INITIAL_HEALTH: 100,
    INITIAL_GOLD: 150,
    INITIAL_LIVES: 3,
    WAVE_DELAY: 3000,
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
    totalEnemiesInWave: 0,
    enemiesKilled: 0,
    totalWaves: 15,
    completedWaves: 0,
    spawnQueue: [],
    waveElapsed: 0,
    isPaused: false,
    meteorCooldown: 0,
    effects: [],
    selectedTowerForUpgrade: null
};

// Upgrade Costs
const UPGRADE_COSTS = {
    damage: 30,
    fireRate: 40,
    range: 50
};

// Upgrade Values
const UPGRADE_VALUES = {
    damage: 5,
    fireRate: 5,
    range: 20
};

// Canvas and Context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM Elements
const baseHealthEl = document.getElementById('baseHealth');
const goldEl = document.getElementById('gold');
const waveEl = document.getElementById('wave');
const livesEl = document.getElementById('lives');
const enemyCountEl = document.getElementById('enemyCount');
const waveTimeEl = document.getElementById('waveTime');
const gameMessageEl = document.getElementById('gameMessage');
const selectedTowerNameEl = document.getElementById('selectedTowerName');
const cancelPlacementBtn = document.getElementById('cancelPlacement');
const startWaveBtn = document.getElementById('startWaveBtn');
const restartBtn = document.getElementById('restartBtn');
const towerOptions = document.querySelectorAll('.tower-option');

// Upgrade Modal Elements
const upgradeModal = document.getElementById('upgradeModal');
const closeUpgradeModalBtn = document.getElementById('closeUpgradeModal');
const upgradeTowerNameEl = document.getElementById('upgradeTowerName');
const upgradeLevelEl = document.getElementById('upgradeLevel');
const upgradeDamageEl = document.getElementById('upgradeDamage');
const upgradeFireRateEl = document.getElementById('upgradeFireRate');
const upgradeRangeEl = document.getElementById('upgradeRange');
const upgradeDamageBtn = document.getElementById('upgradeDamageBtn');
const upgradeFireRateBtn = document.getElementById('upgradeFireRateBtn');
const upgradeRangeBtn = document.getElementById('upgradeRangeBtn');
const sellTowerBtn = document.getElementById('sellTowerBtn');
const sellRefundEl = document.getElementById('sellRefund');


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

// One atlas is shared by menu portraits and battlefield units.
const loadedImages = {};
const SPRITE_CELLS = {basic:0, sniper:1, cannon:2, frost:3, normal:4, fast:5, tank:6, boss:7, scout:8};
function drawSprite(type, x, y, size, opacity = 1) {
    const atlas = loadedImages.units;
    if (!atlas || !Object.hasOwn(SPRITE_CELLS, type)) return false;
    const cell = SPRITE_CELLS[type];
    const width = atlas.naturalWidth / 3;
    const height = atlas.naturalHeight / 3;
    ctx.save();
    ctx.globalAlpha = opacity;
    const inset = type === 'cannon' ? 16 : 0;
    ctx.drawImage(atlas, cell % 3 * width + inset, Math.floor(cell / 3) * height,
        width - inset, height, x - size / 2 + size * inset / width, y - size / 2,
        size * (1 - inset / width), size);
    ctx.restore();
    return true;
}
function loadArt() {
    return Promise.all(Object.entries({terrain:'assets/art/forest.webp', units:'assets/art/units.webp'}).map(([key, source]) =>
        new Promise(resolve => {
            const image = new Image();
            image.onload = () => { loadedImages[key] = image; resolve(); };
            image.onerror = () => resolve(); // Vector fallbacks keep the game playable.
            image.src = source;
        })
    )).then(() => { cacheBattlefield(); drawGame(); });
}

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
    frost: {
        name: 'Frost Tower', cost: 75, damage: 4, range: 140, cooldown: 45,
        color: '#7dd3fc', secondaryColor: '#38bdf8', size: 22,
        projectileSpeed: 6, projectileSize: 5, slowFactor: 0.5, slowDuration: 120
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
    scout: {
        health: 40, speed: 2.6, reward: 18, damage: 8,
        color: '#facc15', secondaryColor: '#fde68a', size: 15
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

// Scouts join the later waves; the immutable wave templates are never consumed.
for (let wave = 4; wave < WAVES.length; wave += 2) {
    WAVES[wave].push({ type: 'scout', count: Math.min(12, wave), delay: 350 });
}
WAVES.forEach(groups => { groups.forEach(Object.freeze); Object.freeze(groups); });
Object.freeze(WAVES);

// Path Definition (grid coordinates)
const MAPS = {
    winding: [
    { x: 0, y: 5 },
    { x: 2, y: 5 },
    { x: 2, y: 10 },
    { x: 8, y: 10 },
    { x: 8, y: 3 },
    { x: 15, y: 3 },
    { x: 15, y: 8 },
    { x: 19, y: 8 }
    ],
    switchback: [
        { x: 0, y: 2 }, { x: 17, y: 2 }, { x: 17, y: 7 },
        { x: 3, y: 7 }, { x: 3, y: 12 }, { x: 19, y: 12 }
    ]
};
let currentMap = 'winding';
let PATH_GRID = MAPS[currentMap];
const pathCells = new Set();
const backgroundCanvas = document.createElement('canvas');
backgroundCanvas.width = CONFIG.CANVAS_WIDTH;
backgroundCanvas.height = CONFIG.CANVAS_HEIGHT;
const backgroundContext = backgroundCanvas.getContext('2d');
const SAVE_KEY = 'tower-defense-w3-save-v1';
const RECORD_KEY = 'tower-defense-w3-record-v1';
let bestWave = 0;
try { bestWave = Math.max(0, Math.min(15, Number(localStorage.getItem(RECORD_KEY)) || 0)); } catch {}
let soundEnabled = false;
let audioContext;
function playSound(frequency = 440) {
    if (!soundEnabled) return;
    try {
        audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
        void audioContext.resume().catch(() => {});
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.06, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);
        oscillator.connect(gain); gain.connect(audioContext.destination);
        oscillator.start(); oscillator.stop(audioContext.currentTime + 0.12);
    } catch { /* Audio is optional when a browser cannot provide it. */ }
}
function recordProgress() {
    bestWave = Math.max(bestWave, gameState.completedWaves);
    try { localStorage.setItem(RECORD_KEY, String(bestWave)); } catch {}
}
function saveCheckpoint() {
    recordProgress();
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            version: 1, map: currentMap, wave: gameState.completedWaves,
            health: gameState.health, lives: gameState.lives, gold: gameState.gold,
            kills: gameState.enemiesKilled,
            towers: gameState.towers.map(t => ({x: t.gridX, y: t.gridY, type: t.type, upgrades: t.upgrades}))
        }));
        document.getElementById('resumeBtn').disabled = false;
    } catch { showGameMessage('Storage unavailable: progress cannot be saved.', 'warning'); }
}
function resumeCheckpoint() {
    try {
        const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
        const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
        if (!saved || saved.version !== 1 || !Object.hasOwn(MAPS, saved.map) ||
            !integer(saved.wave, 0, 14) || !integer(saved.health, 1, 100) ||
            !integer(saved.lives, 1, 3) || !integer(saved.gold, 0, 1000000) ||
            !integer(saved.kills, 0, 100000) || !Array.isArray(saved.towers) || saved.towers.length > 300) throw Error('Invalid save');
        const occupied = new Set();
        for (const tower of saved.towers) {
            if (!Object.hasOwn(TOWER_TYPES, tower.type) || !integer(tower.x, 0, 19) || !integer(tower.y, 0, 14) ||
                occupied.has(`${tower.x},${tower.y}`) || !tower.upgrades ||
                !['damage', 'fireRate', 'range'].every(k => integer(tower.upgrades[k], 0, 100))) throw Error('Invalid tower');
            occupied.add(`${tower.x},${tower.y}`);
            const path = MAPS[saved.map];
            for (let i = 1; i < path.length; i++) {
                const a = path[i - 1], b = path[i];
                if ((a.x === b.x && tower.x === a.x && tower.y >= Math.min(a.y,b.y) && tower.y <= Math.max(a.y,b.y)) ||
                    (a.y === b.y && tower.y === a.y && tower.x >= Math.min(a.x,b.x) && tower.x <= Math.max(a.x,b.x))) throw Error('Tower on path');
            }
        }
        currentMap = saved.map; PATH_GRID = MAPS[currentMap];
        document.getElementById('mapSelect').value = currentMap;
        initGame();
        Object.assign(gameState, {wave: saved.wave, completedWaves: saved.wave, health: saved.health,
            lives: saved.lives, gold: saved.gold, enemiesKilled: saved.kills});
        gameState.towers = saved.towers.map(data => {
            const pos = gridToPixel(data.x, data.y);
            const tower = new Tower(pos.x, pos.y, data.type);
            tower.upgrades = {...data.upgrades};
            tower.config.damage += data.upgrades.damage * UPGRADE_VALUES.damage;
            tower.config.range += data.upgrades.range * UPGRADE_VALUES.range;
            tower.config.cooldown = Math.max(5, tower.config.cooldown - data.upgrades.fireRate * UPGRADE_VALUES.fireRate);
            tower.level += Object.values(data.upgrades).reduce((sum,n) => sum + n, 0);
            return tower;
        });
        updateUI(); showGameMessage('Checkpoint restored. Ready for the next wave!', 'success');
    } catch { showGameMessage('No valid checkpoint found.', 'warning'); }
}


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
    return len ? { x: x / len, y: y / len } : { x: 0, y: 0 };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Initialize Path
function initPath() {
    gameState.path = PATH_GRID.map(point => gridToPixel(point.x, point.y));
    pathCells.clear();
    for (let i = 1; i < PATH_GRID.length; i++) {
        const a = PATH_GRID[i - 1], b = PATH_GRID[i];
        const steps = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
        for (let step = 0; step <= steps; step++) {
            pathCells.add(`${a.x + Math.sign(b.x-a.x)*step},${a.y + Math.sign(b.y-a.y)*step}`);
        }
    }
    cacheBattlefield();
}

// Tower Class
class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.baseConfig = { ...TOWER_TYPES[type] };
        this.config = { ...TOWER_TYPES[type] };
        this.cooldown = 0;
        this.target = null;
        this.gridX = Math.floor(x / CONFIG.GRID_SIZE);
        this.gridY = Math.floor(y / CONFIG.GRID_SIZE);
        this.level = 1;
        this.upgrades = {
            damage: 0,
            fireRate: 0,
            range: 0
        };
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

    getSellValue() {
        // Refund 50% of original cost plus 50% of upgrade costs
        const baseRefund = Math.floor(this.baseConfig.cost * 0.5);
        const upgradeCosts = 
            (this.upgrades.damage * UPGRADE_COSTS.damage * 0.5) +
            (this.upgrades.fireRate * UPGRADE_COSTS.fireRate * 0.5) +
            (this.upgrades.range * UPGRADE_COSTS.range * 0.5);
        return baseRefund + Math.floor(upgradeCosts);
    }

    upgrade(type) {
        if (gameState.isGameOver || gameState.isPaused || !Object.hasOwn(UPGRADE_COSTS, type) ||
            (type === 'fireRate' && this.config.cooldown <= 5)) return false;
        const cost = UPGRADE_COSTS[type];
        const value = UPGRADE_VALUES[type];
        
        if (gameState.gold < cost) {
            showGameMessage('Not enough gold for upgrade!', 'danger');
            return false;
        }

        switch (type) {
            case 'damage':
                this.config.damage += value;
                this.upgrades.damage++;
                break;
            case 'fireRate':
                this.config.cooldown = Math.max(5, this.config.cooldown - value);
                this.upgrades.fireRate++;
                break;
            case 'range':
                this.config.range += value;
                this.upgrades.range++;
                break;
        }

        playSound(660);
        this.level++;
        gameState.gold -= cost;
        updateUI();
        return true;
    }

    draw() {
        ctx.fillStyle = 'rgba(4, 19, 12, 0.4)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 19, 24, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        if (!drawSprite(this.type, this.x, this.y - 5, 72)) {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.config.size, 0, Math.PI * 2);
            ctx.fillStyle = this.config.color; ctx.fill();
        }
        if (this.level > 1) {
            ctx.fillStyle = '#10231b';
            ctx.beginPath(); ctx.arc(this.x + 21, this.y + 20, 9, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f7d87c'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(this.level, this.x + 21, this.y + 23);
        }

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
        if (this === gameState.selectedTowerForUpgrade) {
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
        this.slowFactor = towerConfig.slowFactor;
        this.slowDuration = towerConfig.slowDuration;
        
        // Calculate direction
        const dx = target.x - x;
        const dy = target.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.direction = normalize(dx, dy);
    }

    update() {
        if (this.target.health <= 0 || this.target.escaped) return true;
        this.direction = normalize(this.target.x - this.x, this.target.y - this.y);
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
            if (this.slowFactor && this.target.health > 0) {
                this.target.slowTicks = this.slowDuration;
                this.target.slowFactor = this.slowFactor;
            }
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
        this.slowTicks = 0;
        this.slowFactor = 1;
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
        this.direction = normalize(dx, dy);
        this.progress = 0;
        this.totalProgress = dist;
    }

    update() {
        if (this.health <= 0) return;

        // Move along path
        const movement = this.speed * (this.slowTicks > 0 ? this.slowFactor : 1) * CONFIG.GAME_SPEED;
        if (this.slowTicks > 0) this.slowTicks--;
        this.progress += movement;
        
        if (this.progress >= this.totalProgress) {
            this.pathIndex++;
            if (this.pathIndex >= gameState.path.length - 1) {
                // Reached the end - damage base
                this.escaped = true;
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
            this.direction = normalize(dx, dy);
            this.progress = 0;
            this.totalProgress = dist;
        } else {
            this.x += this.direction.x * movement;
            this.y += this.direction.y * movement;
        }

        return false;
    }

    takeDamage(amount) {
        if (this.health <= 0 || !Number.isFinite(amount) || amount <= 0) return;
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) {
            gameState.gold += this.config.reward;
            gameState.enemiesKilled++;
            updateUI();
        }
    }

    draw() {
        ctx.fillStyle = 'rgba(4, 19, 12, 0.35)';
        ctx.beginPath(); ctx.ellipse(this.x, this.y + this.size * 0.65, this.size * 0.8, this.size * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        if (!drawSprite(this.type, this.x, this.y - 5, this.size * 2.6)) {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color; ctx.fill();
        }
        if (this.slowTicks > 0) {
            ctx.strokeStyle = '#a5f3fc'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(this.x, this.y + this.size * 0.65, this.size, this.size * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
        }

        // Draw health bar
        const healthPercent = this.health / this.maxHealth;
        const barWidth = this.size * 2;
        const barHeight = 4;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.size - 10, barWidth, barHeight);
        
        ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFC107' : '#F44336';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.size - 10, barWidth * healthPercent, barHeight);


    }
}

// Game Functions
function initGame() {
    document.querySelectorAll('.game-over-modal, .wave-indicator').forEach(el => el.remove());
    clearTimeout(messageTimer);
    gameState.completedWaves = 0;
    gameState.spawnQueue = [];
    gameState.waveElapsed = 0;
    gameState.isPaused = false;
    gameState.meteorCooldown = 0;
    gameState.effects = [];
    gameState.mousePosition = null;
    towerOptions.forEach(opt => opt.classList.remove('selected'));
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
    gameState.enemiesKilled = 0;
    gameState.totalEnemiesInWave = 0;
    gameState.selectedTowerForUpgrade = null;
    
    initPath();
    updateUI();
    clearGameMessage();
    closeUpgradeModal();
    
    // Clear canvas
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    ctx.drawImage(backgroundCanvas, 0, 0);
}

function startWave() {
    if (gameState.isWaveActive || gameState.isGameOver || gameState.isPaused || gameState.wave >= WAVES.length - 1) return;
    gameState.wave++;
    gameState.waveElapsed = 0;
    gameState.isWaveActive = true;
    gameState.selectedTowerType = null;
    towerOptions.forEach(opt => opt.classList.remove('selected'));
    gameState.spawnQueue = [];
    let due = CONFIG.WAVE_DELAY;
    for (const group of WAVES[gameState.wave]) {
        for (let count = 0; count < group.count; count++) {
            gameState.spawnQueue.push({type: group.type, due});
            due += group.delay;
        }
    }
    gameState.totalEnemiesInWave = gameState.spawnQueue.length;
    showWaveIndicator(gameState.wave);
    playSound(520);
    updateUI();
}

function spawnEnemies() {
    while (gameState.spawnQueue.length && gameState.spawnQueue[0].due <= gameState.waveElapsed) {
        gameState.enemies.push(new Enemy(gameState.spawnQueue.shift().type));
    }
}

function finishWave() {
    gameState.isWaveActive = false;
    gameState.completedWaves = gameState.wave;
    gameState.gold += 20 + gameState.wave * 2;
    gameState.bullets = [];
    playSound(880);
    if (gameState.wave === WAVES.length - 1) {
        gameState.isGameWon = true;
        gameState.isGameOver = true;
        recordProgress();
        try { localStorage.removeItem(SAVE_KEY); } catch {}
        document.getElementById('resumeBtn').disabled = true;
        showGameOverModal(true);
    } else {
        saveCheckpoint();
        showGameMessage(`Wave ${gameState.wave} cleared! Bonus: ${20 + gameState.wave * 2}g`, 'success');
    }
    updateUI();
}

function castMeteor() {
    if (!gameState.isWaveActive || gameState.isGameOver || gameState.isPaused || gameState.meteorCooldown > 0) return;
    gameState.meteorCooldown = 30000;
    for (const enemy of gameState.enemies) enemy.takeDamage(60);
    gameState.effects.push({ticks: 30});
    playSound(150);
    showGameMessage('Meteor: 60 damage to all enemies!', 'success');
    updateUI();
}

function updateGame() {
    if (gameState.isGameOver || gameState.isPaused) return;
    gameState.meteorCooldown = Math.max(0, gameState.meteorCooldown - 1000 / 60);
    if (gameState.isWaveActive) {
        gameState.waveElapsed += 1000 / 60;
        spawnEnemies();
    }
    for (const effect of gameState.effects) effect.ticks--;
    gameState.effects = gameState.effects.filter(effect => effect.ticks > 0);

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
            gameState.isWaveActive = false;
            gameState.spawnQueue = [];
            gameState.isGameWon = false;
            recordProgress();
            showGameOverModal(false);
        } else {
            gameState.health = CONFIG.INITIAL_HEALTH;
            updateUI();
            showGameMessage(`Life lost! ${gameState.lives} lives remaining.`, 'warning');
        }
    }

    if (!gameState.isGameOver && gameState.isWaveActive && gameState.spawnQueue.length === 0 && gameState.enemies.length === 0) {
        finishWave();
    }

}

function drawGame() {
    // Clear canvas
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    ctx.drawImage(backgroundCanvas, 0, 0);
    if (gameState.selectedTowerType) drawGrid(ctx);
    if (gameState.effects.length) {
        ctx.fillStyle = `rgba(251, 146, 60, ${gameState.effects[0].ticks / 100})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

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

    // Draw selected tower range
    if (gameState.selectedTowerForUpgrade) {
        const tower = gameState.selectedTowerForUpgrade;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, tower.config.range, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(244, 67, 54, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawGrid(ctx = backgroundContext) {
    ctx.strokeStyle = 'rgba(218, 235, 183, 0.13)';
    ctx.lineWidth = 0.5;
    
    // Draw vertical lines
    for (let x = 0; x <= CONFIG.CANVAS_WIDTH; x += CONFIG.GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CONFIG.CANVAS_HEIGHT);
        ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= CONFIG.CANVAS_HEIGHT; y += CONFIG.GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CONFIG.CANVAS_WIDTH, y);
        ctx.stroke();
    }
}


function cacheBattlefield() {
    const ctx = backgroundContext;
    ctx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
    if (loadedImages.terrain) {
        ctx.drawImage(loadedImages.terrain, 0, 0, backgroundCanvas.width, backgroundCanvas.height);
    } else {
        ctx.fillStyle = '#28513b'; ctx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
    }
    drawPath(ctx);
}

function drawPath(ctx = backgroundContext) {
    if (!gameState.path.length) return;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const trace = () => {
        ctx.beginPath(); ctx.moveTo(gameState.path[0].x, gameState.path[0].y);
        for (const point of gameState.path.slice(1)) ctx.lineTo(point.x, point.y);
    };
    trace(); ctx.strokeStyle = '#263c25'; ctx.lineWidth = 40; ctx.stroke();
    trace(); ctx.strokeStyle = '#93815a'; ctx.lineWidth = 34; ctx.stroke();
    trace(); ctx.strokeStyle = '#b7a071'; ctx.lineWidth = 26; ctx.stroke();
    // Deterministic pebbles add texture without work in the animation loop.
    for (let i = 1; i < gameState.path.length; i++) {
        const a = gameState.path[i - 1], b = gameState.path[i];
        const length = distance(a.x, a.y, b.x, b.y);
        for (let step = 14; step < length; step += 22) {
            const ratio = step / length;
            const jitter = Math.sin(step * 3 + i) * 7;
            const x = a.x + (b.x - a.x) * ratio + (a.y !== b.y ? jitter : 0);
            const y = a.y + (b.y - a.y) * ratio + (a.x !== b.x ? jitter : 0);
            ctx.fillStyle = step % 3 ? '#9d895e' : '#cab488';
            ctx.beginPath(); ctx.ellipse(x, y, 3, 1.8, 0.3, 0, Math.PI * 2); ctx.fill();
        }
    }
    const entrance = gameState.path[0], base = gameState.path.at(-1);
    ctx.fillStyle = '#253b29'; ctx.strokeStyle = '#a6dc72'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(entrance.x, entrance.y, 15, 21, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9be075'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('›', entrance.x, entrance.y + 6);
    // Stone gate at the defended end of the route.
    ctx.fillStyle = '#404f44'; ctx.fillRect(base.x - 17, base.y - 14, 34, 32);
    ctx.fillStyle = '#c5c1a3'; ctx.fillRect(base.x - 15, base.y - 19, 9, 38); ctx.fillRect(base.x + 6, base.y - 19, 9, 38);
    ctx.fillStyle = '#e4d9b6';
    for (const offset of [-15, 6]) { ctx.fillRect(base.x + offset - 2, base.y - 23, 13, 9); }
    ctx.fillStyle = '#20362c'; ctx.fillRect(base.x - 5, base.y + 1, 10, 18);
    ctx.fillStyle = '#f5b54b'; ctx.fillRect(base.x - 3, base.y - 25, 3, 18);
    ctx.beginPath(); ctx.moveTo(base.x, base.y - 25); ctx.lineTo(base.x + 13, base.y - 20); ctx.lineTo(base.x, base.y - 15); ctx.fill();
    ctx.restore();
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

    drawSprite(gameState.selectedTowerType, pixelPos.x, pixelPos.y - 5, 72, 0.65);

    // Draw range preview
    ctx.beginPath();
    ctx.arc(pixelPos.x, pixelPos.y, towerConfig.range, 0, Math.PI * 2);
    ctx.strokeStyle = isValid ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function isValidTowerPosition(gridX, gridY) {
    if (pathCells.has(`${gridX},${gridY}`)) return false;

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
    if (!gameState.selectedTowerType || gameState.isGameOver || gameState.isPaused) return;
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
    playSound(440);
    
    towerOptions.forEach(opt => opt.classList.remove('selected'));
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
    document.getElementById('bestWave').textContent = bestWave;
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.textContent = gameState.isPaused ? 'Resume' : 'Pause';
    pauseBtn.setAttribute('aria-pressed', String(gameState.isPaused));
    pauseBtn.disabled = gameState.isGameOver;
    const meteorBtn = document.getElementById('meteorBtn');
    meteorBtn.disabled = !gameState.isWaveActive || gameState.isPaused || gameState.isGameOver || gameState.meteorCooldown > 0;
    meteorBtn.textContent = gameState.meteorCooldown > 0 ? `Meteor (${Math.ceil(gameState.meteorCooldown/1000)}s)` : 'Meteor';
    document.getElementById('mapSelect').disabled = gameState.wave > 0 || gameState.towers.length > 0;
    baseHealthEl.textContent = Math.max(0, gameState.health);
    goldEl.textContent = gameState.gold;
    waveEl.textContent = gameState.wave;
    // Show total enemies in wave when wave is active
    if (gameState.isWaveActive) {
        enemyCountEl.textContent = gameState.enemies.length + "/" + gameState.totalEnemiesInWave;
    } else {
        enemyCountEl.textContent = gameState.enemies.length;
    }
    
    // Update wave time
    if (gameState.isWaveActive) {
        const elapsed = Math.floor(gameState.waveElapsed / 1000);
        waveTimeEl.textContent = formatTime(elapsed);
    } else {
        waveTimeEl.textContent = "0s";
    }
    livesEl.textContent = gameState.lives;

    // Update health color based on percentage
    const healthPercent = gameState.health / CONFIG.INITIAL_HEALTH;
    baseHealthEl.className = 'stat-value ' + 
        (healthPercent > 0.5 ? '' : healthPercent > 0.25 ? 'warning' : 'danger');

    // Update gold color
    goldEl.className = 'stat-value';

    // Update wave button
    startWaveBtn.disabled = gameState.isWaveActive || gameState.isGameOver || gameState.isPaused;
    
    // Update tower options
    towerOptions.forEach(option => {
        const towerType = option.dataset.towerType;
        const towerCost = parseInt(option.dataset.cost);
        option.disabled = gameState.gold < towerCost || gameState.isPaused || gameState.isGameOver;
    });

    // Update selected tower info
    if (gameState.selectedTowerType) {
        selectedTowerNameEl.textContent = TOWER_TYPES[gameState.selectedTowerType].name;
        cancelPlacementBtn.style.display = 'inline-block';
    } else {
        selectedTowerNameEl.textContent = 'None';
        cancelPlacementBtn.style.display = 'none';
    }

    // Update wave button
    startWaveBtn.disabled = gameState.isWaveActive || gameState.isGameOver || gameState.isPaused;
}

let messageTimer;
function clearGameMessage() {
    gameMessageEl.textContent = '';
    gameMessageEl.className = 'game-message';
}

function showGameMessage(message, type = 'info') {
    gameMessageEl.textContent = message;
    gameMessageEl.className = `game-message ${type}`;
    
    clearTimeout(messageTimer);
    messageTimer = setTimeout(clearGameMessage, 4000);
}

// Helper function to format time
function formatTime(seconds) {
    if (seconds < 60) {
        return seconds + "s";
    } else {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return minutes + "m " + secs + "s";
    }
}

function showWaveIndicator(waveNumber) {
    const waveIndicator = document.createElement('div');
    waveIndicator.className = 'wave-indicator active';
    waveIndicator.innerHTML = `<div class="wave-text">Wave ${waveNumber}</div>`;
    document.querySelectorAll('.wave-indicator').forEach(el => el.remove());
    document.querySelector('.game-area').appendChild(waveIndicator);

    waveIndicator.addEventListener('animationend', () => waveIndicator.remove(), {once: true});
}

function showUpgradeModal(tower) {
    gameState.selectedTowerForUpgrade = tower;
    
    upgradeTowerNameEl.textContent = `${tower.config.name} (Lvl ${tower.level})`;
    upgradeLevelEl.textContent = tower.level;
    upgradeDamageEl.textContent = tower.config.damage;
    upgradeFireRateEl.textContent = tower.config.cooldown;
    upgradeRangeEl.textContent = tower.config.range;
    sellRefundEl.textContent = `${tower.getSellValue()}g`;
    
    // Update upgrade button costs
    upgradeDamageBtn.innerHTML = `Upgrade Damage<br><span class="upgrade-cost">+${UPGRADE_VALUES.damage} dmg | ${UPGRADE_COSTS.damage}g</span>`;
    upgradeFireRateBtn.innerHTML = `Upgrade Fire Rate<br><span class="upgrade-cost">-${UPGRADE_VALUES.fireRate} cooldown | ${UPGRADE_COSTS.fireRate}g</span>`;
    upgradeRangeBtn.innerHTML = `Upgrade Range<br><span class="upgrade-cost">+${UPGRADE_VALUES.range} range | ${UPGRADE_COSTS.range}g</span>`;
    
    upgradeDamageBtn.disabled = gameState.gold < UPGRADE_COSTS.damage;
    upgradeFireRateBtn.disabled = gameState.gold < UPGRADE_COSTS.fireRate || tower.config.cooldown <= 5;
    upgradeRangeBtn.disabled = gameState.gold < UPGRADE_COSTS.range;
    upgradeModal.classList.add('active');
}

function closeUpgradeModal() {
    gameState.selectedTowerForUpgrade = null;
    upgradeModal.classList.remove('active');
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
                           <span class="modal-stat-value">${gameState.completedWaves}</span>`;
    
    const enemiesStat = document.createElement('div');
    enemiesStat.className = 'modal-stat';
    enemiesStat.innerHTML = `<span class="modal-stat-label">Enemies Killed:</span>
                             <span class="modal-stat-value">${gameState.enemiesKilled}</span>`;
    
    const goldStat = document.createElement('div');
    goldStat.className = 'modal-stat';
    goldStat.innerHTML = `<span class="modal-stat-label">Gold Remaining:</span>
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

function canvasPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left - canvas.clientLeft) * canvas.width / canvas.clientWidth,
        y: (event.clientY - rect.top - canvas.clientTop) * canvas.height / canvas.clientHeight
    };
}

// Event Listeners
canvas.addEventListener('click', (e) => {
    if (gameState.isGameOver || gameState.isPaused) return;

    const {x, y} = canvasPosition(e);
    
    gameState.mousePosition = { x, y };
    
    if (gameState.selectedTowerType) {
        const gridPos = pixelToGrid(x, y);
        placeTower(gridPos.x, gridPos.y);
    } else {
        // Check if clicking on a tower to show upgrade menu
        const tower = getTowerAtPosition(x, y);
        if (tower) {
            showUpgradeModal(tower);
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    const {x, y} = canvasPosition(e);
    
    gameState.mousePosition = { x, y };
});

towerOptions.forEach(option => {
    option.addEventListener('click', () => {
        if (gameState.isPaused || gameState.isGameOver) return;
        
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
    if (e.key === 'Escape') {
        if (gameState.selectedTowerForUpgrade) {
            closeUpgradeModal();
        } else if (gameState.selectedTowerType) {
            gameState.selectedTowerType = null;
            gameState.selectedTowerCost = 0;
            towerOptions.forEach(opt => opt.classList.remove('selected'));
            updateUI();
        }
    }
});

// Upgrade Modal Event Listeners
closeUpgradeModalBtn.addEventListener('click', closeUpgradeModal);

upgradeDamageBtn.addEventListener('click', () => {
    if (gameState.selectedTowerForUpgrade) {
        const success = gameState.selectedTowerForUpgrade.upgrade('damage');
        if (success) {
            showUpgradeModal(gameState.selectedTowerForUpgrade);
            showGameMessage('Damage upgraded!', 'success');
        }
    }
});

upgradeFireRateBtn.addEventListener('click', () => {
    if (gameState.selectedTowerForUpgrade) {
        const success = gameState.selectedTowerForUpgrade.upgrade('fireRate');
        if (success) {
            showUpgradeModal(gameState.selectedTowerForUpgrade);
            showGameMessage('Fire rate upgraded!', 'success');
        }
    }
});

upgradeRangeBtn.addEventListener('click', () => {
    if (gameState.selectedTowerForUpgrade) {
        const success = gameState.selectedTowerForUpgrade.upgrade('range');
        if (success) {
            showUpgradeModal(gameState.selectedTowerForUpgrade);
            showGameMessage('Range upgraded!', 'success');
        }
    }
});

sellTowerBtn.addEventListener('click', () => {
    if (gameState.selectedTowerForUpgrade && !gameState.isGameOver && !gameState.isPaused) {
        const tower = gameState.selectedTowerForUpgrade;
        const refund = tower.getSellValue();
        gameState.gold += refund;
        
        playSound(320);
        // Remove tower from array
        const index = gameState.towers.indexOf(tower);
        if (index > -1) {
            gameState.towers.splice(index, 1);
        }
        
        closeUpgradeModal();
        updateUI();
        showGameMessage(`Tower sold! Refunded ${refund}g`, 'success');
    }
});

// Close modal when clicking outside
upgradeModal.addEventListener('click', (e) => {
    if (e.target === upgradeModal) {
        closeUpgradeModal();
    }
});

document.getElementById('meteorBtn').addEventListener('click', castMeteor);
document.getElementById('pauseBtn').addEventListener('click', () => {
    gameState.isPaused = !gameState.isPaused;
    updateUI();
});
document.getElementById('soundBtn').addEventListener('click', (event) => {
    soundEnabled = !soundEnabled;
    event.currentTarget.textContent = soundEnabled ? 'Sound: On' : 'Sound: Off';
    event.currentTarget.setAttribute('aria-pressed', String(soundEnabled));
    playSound();
});
document.getElementById('resumeBtn').addEventListener('click', resumeCheckpoint);
document.getElementById('saveBtn').addEventListener('click', () => {
    if (gameState.isWaveActive || gameState.isGameOver) {
        showGameMessage('Save between waves; the last cleared wave is saved automatically.', 'warning');
        return;
    }
    saveCheckpoint(); updateUI();
});
document.getElementById('mapSelect').addEventListener('change', event => {
    if (gameState.wave > 0 || gameState.towers.length) return;
    currentMap = event.target.value; PATH_GRID = MAPS[currentMap]; initGame();
});
canvas.addEventListener('mouseleave', () => { gameState.mousePosition = null; });

// Fixed 60 Hz simulation: high-refresh displays do not make enemies faster.
let lastFrame;
let accumulator = 0;
let uiElapsed = 0;
function gameLoop(timestamp) {
    if (lastFrame === undefined) lastFrame = timestamp;
    accumulator += Math.min(100, timestamp - lastFrame);
    lastFrame = timestamp;
    while (accumulator >= 1000 / 60) {
        updateGame();
        accumulator -= 1000 / 60;
        uiElapsed += 1000 / 60;
    }
    if (uiElapsed >= 100) { updateUI(); uiElapsed = 0; }
    drawGame();
    requestAnimationFrame(gameLoop);
}
document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState.isWaveActive) { gameState.isPaused = true; updateUI(); }
    lastFrame = undefined; accumulator = 0;
});

initGame();
try { document.getElementById('resumeBtn').disabled = !localStorage.getItem(SAVE_KEY); } catch {}
showGameMessage('Choose a tower, then tap an empty tile to build.', 'info');
window.artReady = loadArt();
requestAnimationFrame(gameLoop);

// Make functions globally accessible for debugging
window.gameState = gameState;
window.CONFIG = CONFIG;
window.TOWER_TYPES = TOWER_TYPES;
window.ENEMY_TYPES = ENEMY_TYPES;
