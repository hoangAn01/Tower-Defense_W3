# Tower Defense W3

A static HTML/CSS/JavaScript canvas game. Defend the base through 15 waves on Winding Valley or Switchback. No backend, application dependencies, API keys, or Unity Editor are required to play.

## Play locally

Requires Python 3:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open the local server in your own browser. Select a tower, then click/tap an empty tile away from the route. Click/tap a tower to upgrade or sell it. Escape cancels placement or closes upgrades. Building during waves is allowed.

- **Basic (50g):** rapid fire. **Sniper (100g):** long range. **Cannon (150g):** splash damage. **Frost (75g):** 50% slow for two seconds; repeated hits refresh the duration.
- **Meteor:** 60 damage to all active enemies, with a 30-second simulation cooldown.
- Start with 150g. Wave completion grants `20 + 2 × wave` gold. Scouts appear from wave four; bosses keep their original wave schedule.
- Pause freezes movement, spawns and skill cooldowns. An active wave pauses when the tab becomes hidden; resume manually.
- Map selection is available before building or starting a wave. Restart clears the current run on the same map, including pending spawns and overlays.
- Progress is saved automatically after each cleared wave. **Save checkpoint** also saves between waves, including placed towers and upgrades. **Load checkpoint** restores that preparation phase, not a partially played wave. Restart preserves the previous checkpoint until the next save. Victory removes the checkpoint and keeps the best cleared wave.
- Saves and best-wave records use localStorage on the current browser/origin; they are not cloud-synced. Unavailable storage does not stop gameplay. Sound effects are generated locally by Web Audio and are off until enabled.

## Development and validation

Requires Node.js 20+ and Python 3. Runtime gameplay still needs no npm packages.

```sh
npm ci
npx playwright install --with-deps chromium
npm run check
npm test
npm run build
```

In the prepared Codex environment, system Chromium is already installed:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm test
```

Playwright starts a Python static server when necessary. Tests cover placement, upgrades/refunds, full route blocking, wave counts, restart cancellation, victory, pause, slowing, damage rewards, Meteor cooldown, local saves, invalid/blocked storage, sound activation and mobile canvas coordinates. The 15-wave test advances the spawn schedule and defeats enemies deterministically; it verifies wave lifecycle, not human difficulty or a complete real-time playthrough.

The simulation runs at 60 fixed steps per second independently of monitor refresh rate. Static grid/path rendering is cached. `npm run build` stages only game files and assets in `dist/`, excluding tooling, tests and repository metadata.

## GitHub Pages

`.github/workflows/pages.yml` runs checks, browser tests and the static build on pull requests and pushes to `main`. Only successful `main` runs deploy to GitHub Pages.

1. Commit and push the update to GitHub.
2. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source.
3. Run **Test and deploy game** manually or push to `main`.
4. Use the site URL reported by the successful deployment job.

The workflow needs repository Pages permissions and an allowed `github-pages` environment. Pull requests only validate; they do not deploy. Preparing this workflow locally does not publish a live site.

## Visual assets

The Wildwood theme uses a generated forest clearing and a transparent nine-unit atlas for all four towers and five enemy types. Both are shipped locally as optimized WebP images (under 900 KB combined); no external asset CDN is required. Menu portraits and battlefield units share the same atlas. The route is rendered separately for each map, and terrain is cached once after load. Vector terrain/units remain available when images fail to load. See `assets/art/README.md` for provenance and atlas layout.

## Combat animation

Towers recoil when firing; Frost glows. Enemies bob/lean while moving, face their horizontal travel direction and briefly compress when hit. These are procedural animations of the existing sprites, rather than extra sprite-sheet poses. Four local SVG projectile assets provide green bolts, blue sniper streaks, cannon shells and ice shards. Muzzle flashes, hit rings, splash explosions, slowing rings, death sparks and Meteor trails are rendered on canvas. Visual effects share simulation timing, freeze on Pause, clear on Restart, and finish fading after game over. Particle/effect counts are capped at 160/64. The browser's reduced-motion preference suppresses recoil, bobbing, trails and particles while keeping simple impact feedback.
