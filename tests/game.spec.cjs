const {test, expect} = require('@playwright/test');
const errors = new WeakMap();
test.beforeEach(async ({page}) => {
  errors.set(page, []);
  page.on('pageerror', error => errors.get(page).push(error.message));
  await page.clock.install({time: new Date('2026-10-04T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-10-04T00:00:01Z'));
  await page.goto('/');
  await expect(page.locator('#gold')).toHaveText('150');
});
test.afterEach(async ({page}) => expect(errors.get(page)).toEqual([]));

async function build(page, type='basic', grid={x:4,y:4}) {
  await page.locator(`[data-tower-type="${type}"]`).click();
  const box = await page.locator('#gameCanvas').boundingBox();
  await page.locator('#gameCanvas').click({position:{x:(grid.x*40+20)*box.width/800, y:(grid.y*40+20)*box.height/600}});
}

test('assets, placement, upgrades, selling and invalid upgrades', async ({page}) => {
  const paths = await page.evaluate(()=>Object.values(ASSETS).flatMap(Object.values));
  for (const path of paths) expect((await page.request.get(path)).status()).toBe(200);
  await build(page);
  expect(await page.evaluate(()=>gameState.towers.length)).toBe(1);
  await expect(page.locator('#gold')).toHaveText('100');
  const box=await page.locator('#gameCanvas').boundingBox();
  await page.locator('#gameCanvas').click({position:{x:180*box.width/800,y:180*box.height/600}});
  await page.locator('#upgradeDamageBtn').click();
  await expect(page.locator('#upgradeDamage')).toHaveText('15');
  expect(await page.evaluate(()=>gameState.towers[0].upgrade('invalid'))).toBe(false);
  await expect(page.locator('#gold')).toHaveText('70');
  await page.locator('#sellTowerBtn').click();
  await expect(page.locator('#gold')).toHaveText('110');
  expect(await page.evaluate(()=>gameState.towers.length)).toBe(0);
});

test('all path segments block placement on both maps', async ({page}) => {
  for (const map of ['winding','switchback']) {
    await page.locator('#mapSelect').selectOption(map);
    expect(await page.evaluate(()=>{
      for(let i=1;i<PATH_GRID.length;i++) {
        const a=PATH_GRID[i-1],b=PATH_GRID[i];
        const n=Math.abs(b.x-a.x)+Math.abs(b.y-a.y);
        for(let j=0;j<=n;j++) if(isValidTowerPosition(a.x+Math.sign(b.x-a.x)*j,a.y+Math.sign(b.y-a.y)*j)) return false;
      }
      return true;
    })).toBe(true);
  }
});

test('restart cancels pending spawn and a fresh wave still has eight enemies', async ({page}) => {
  await page.locator('#startWaveBtn').click();
  expect(await page.evaluate(()=>gameState.totalEnemiesInWave)).toBe(8);
  await page.locator('#restartBtn').click();
  await page.clock.runFor(6000);
  expect(await page.evaluate(()=>[gameState.enemies.length,gameState.wave,gameState.spawnQueue.length])).toEqual([0,0,0]);
  await page.locator('#startWaveBtn').click();
  await page.clock.runFor(3200);
  expect(await page.evaluate(()=>gameState.enemies.length)).toBe(1);
  expect(await page.evaluate(()=>gameState.totalEnemiesInWave)).toBe(8);
});

test('all 15 waves spawn exact counts, finish and grant victory without mutating templates', async ({page}) => {
  const result=await page.evaluate(()=>{
    const original=JSON.stringify(WAVES);
    let spawned=0;
    for(let wave=1;wave<WAVES.length;wave++) {
      startWave();
      if(!gameState.isWaveActive || gameState.wave!==wave) throw Error(`Wave ${wave} did not start`);
      const expected=WAVES[wave].reduce((sum,g)=>sum+g.count,0);
      if(gameState.totalEnemiesInWave!==expected) throw Error('Wrong total');
      gameState.waveElapsed=gameState.spawnQueue.at(-1).due;
      updateGame();
      if(gameState.enemies.length!==expected) throw Error('Wrong spawned count');
      spawned+=expected;
      for(const enemy of gameState.enemies) enemy.takeDamage(1000000);
      updateGame();
      if(gameState.isWaveActive || gameState.completedWaves!==wave) throw Error('Wave did not finish');
    }
    return {spawned,kills:gameState.enemiesKilled,won:gameState.isGameWon,over:gameState.isGameOver,unchanged:original===JSON.stringify(WAVES),best:bestWave};
  });
  expect(result.spawned).toBeGreaterThan(500);
  expect(result.kills).toBe(result.spawned);
  expect(result).toMatchObject({won:true,over:true,unchanged:true,best:15});
  await expect(page.locator('.modal-title')).toHaveText('Victory!');
  await expect(page.locator('.modal-stat-value').first()).toHaveText('15');
  await page.locator('.game-over-modal button').click();
  expect(await page.evaluate(()=>gameState.wave)).toBe(0);
  await expect(page.locator('.game-over-modal')).toHaveCount(0);
});

test('pause freezes simulation, including spawns and Meteor cooldown', async ({page}) => {
  await page.locator('#startWaveBtn').click();
  await page.clock.runFor(3200);
  await page.locator('#meteorBtn').click();
  await page.locator('#pauseBtn').click();
  const before=await page.evaluate(()=>JSON.stringify({elapsed:gameState.waveElapsed,queue:gameState.spawnQueue,enemies:gameState.enemies.map(e=>[e.x,e.y,e.health]),cooldown:gameState.meteorCooldown}));
  await page.clock.runFor(5000);
  expect(await page.evaluate(()=>JSON.stringify({elapsed:gameState.waveElapsed,queue:gameState.spawnQueue,enemies:gameState.enemies.map(e=>[e.x,e.y,e.health]),cooldown:gameState.meteorCooldown}))).toBe(before);
  await page.locator('#pauseBtn').click();
  await page.clock.runFor(1000);
  expect(await page.evaluate(()=>gameState.waveElapsed)).toBeGreaterThan(4000);
});

test('Frost slows enemies; deaths award gold once; Meteor cannot bypass cooldown', async ({page}) => {
  expect(await page.evaluate(()=>{
    const enemy=new Enemy('scout'); gameState.enemies.push(enemy);
    const bullet=new Bullet(enemy.x,enemy.y,enemy,TOWER_TYPES.frost);
    bullet.hit(); const before=enemy.x; enemy.update();
    const slowMovement=enemy.x-before;
    enemy.takeDamage(1000); const gold=gameState.gold; enemy.takeDamage(1000);
    gameState.isWaveActive=true; gameState.meteorCooldown=0;
    castMeteor(); const cooldown=gameState.meteorCooldown; castMeteor();
    return {slowMovement,goldOnce:gameState.gold===gold,cooldown:gameState.meteorCooldown===cooldown,finite:Number.isFinite(bullet.direction.x)};
  })).toEqual({slowMovement:1.3000000000000007,goldOnce:true,cooldown:true,finite:true});
});

test('saved map, upgrades and gold survive reload; corrupt saves are rejected', async ({page}) => {
  await page.locator('#mapSelect').selectOption('switchback');
  await build(page,'frost');
  await page.evaluate(()=>{gameState.towers[0].upgrade('damage');saveCheckpoint();});
  await page.reload();
  await page.locator('#resumeBtn').click();
  expect(await page.evaluate(()=>({map:currentMap,gold:gameState.gold,damage:gameState.towers[0].config.damage}))).toEqual({map:'switchback',gold:45,damage:9});
  await page.evaluate(()=>localStorage.setItem(SAVE_KEY,'{"version":1,"map":"__proto__"}'));
  await page.locator('#resumeBtn').click();
  await expect(page.locator('#gameMessage')).toHaveText('No valid checkpoint found.');
  expect(await page.evaluate(()=>gameState.towers.length)).toBe(1);
});

test('mobile scaled canvas places and selects the intended grid cell', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await build(page,'frost',{x:12,y:6});
  expect(await page.evaluate(()=>gameState.towers.map(t=>[t.gridX,t.gridY]))).toEqual([[12,6]]);
  const box=await page.locator('#gameCanvas').boundingBox();
  await page.locator('#gameCanvas').click({position:{x:500*box.width/800,y:260*box.height/600}});
  await expect(page.locator('#upgradeModal')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const modal=await page.locator('.upgrade-content').boundingBox();
  expect(modal.x).toBeGreaterThanOrEqual(0);
  expect(modal.x+modal.width).toBeLessThanOrEqual(390);
});

test('storage denial does not prevent play; audio is user activated', async ({page}) => {
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('denied');};});
  await page.locator('#saveBtn').click();
  await expect(page.locator('#gameMessage')).toContainText('Storage unavailable');
  await page.locator('#soundBtn').click();
  await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed','true');
  await page.locator('#startWaveBtn').click();
  await page.clock.runFor(3200);
  expect(await page.evaluate(()=>gameState.enemies.length)).toBe(1);
});

test('natural combat clears the first two waves without changing enemy health or funds', async ({page}) => {
  const outcome=await page.evaluate(()=>{
    for(const grid of [{x:3,y:6},{x:4,y:9},{x:7,y:9}]) {
      gameState.selectedTowerType='basic'; placeTower(grid.x,grid.y);
    }
    for(let wave=1;wave<=2;wave++) {
      startWave();
      for(let tick=0;tick<18000 && gameState.isWaveActive && !gameState.isGameOver;tick++) updateGame();
      if(gameState.isWaveActive) throw Error('Natural combat stalled');
    }
    return {completed:gameState.completedWaves,kills:gameState.enemiesKilled,gold:gameState.gold,over:gameState.isGameOver};
  });
  expect(outcome.completed).toBe(2);
  expect(outcome.kills).toBeGreaterThan(0);
  expect(outcome.gold).toBeGreaterThan(46);
  expect(outcome.over).toBe(false);
});

test('defeat stops scheduled spawns and restart removes the overlay', async ({page}) => {
  await page.locator('#startWaveBtn').click();
  await page.evaluate(()=>{gameState.health=0;gameState.lives=1;updateGame();});
  await expect(page.locator('.modal-title')).toHaveText('Game Over');
  await page.clock.runFor(10000);
  expect(await page.evaluate(()=>[gameState.spawnQueue.length,gameState.enemies.length])).toEqual([0,0]);
  await page.locator('.game-over-modal button').click();
  await expect(page.locator('.game-over-modal')).toHaveCount(0);
  await expect(page.locator('#lives')).toHaveText('3');
  await expect(page.locator('#startWaveBtn')).toBeEnabled();
});

test('fire-rate cap and affordability never charge for invalid purchases', async ({page}) => {
  await build(page);
  expect(await page.evaluate(()=>{
    const tower=gameState.towers[0]; tower.config.cooldown=5;
    const gold=gameState.gold;
    const upgrade=tower.upgrade('fireRate');
    gameState.selectedTowerType='cannon'; placeTower(5,4);
    return {upgrade,goldUnchanged:gameState.gold===gold,towers:gameState.towers.length};
  })).toEqual({upgrade:false,goldUnchanged:true,towers:1});
});
