# AGym · Gym Tracker

Independent copy of the Workout PWA. Source is self-contained in this folder; no imports or build steps refer to the parent app.

## Schedule
- Monday: leg press, 3 × 10–15 (rest 120 seconds), then seated leg curl, 4 × 10–15 (rest 90 seconds).
- Thursday: ab crunch, 4 × 10–15; hip abduction, 2 × 12–15; hip adduction, 2 × 12–15; rest 90 seconds.
- Both sessions use two physical machines and take about 20–25 minutes including warm-up and rests. Abduction and adduction share one machine.
- Start with 1–2 working sets per exercise in week one (editable in Settings before starting a workout). Warm up for 3–4 minutes. Work to the last good rep: stop before another full rep would require swinging, shortening the movement, or changing body position. There is no need to attempt a failed rep; stop for sharp or joint pain.
- Trial starting loads (machine stack labels): leg press 100 lb; seated leg curl 50 lb; ab crunch 40 lb; hip abduction and adduction 40 lb each. These are adjustable starting suggestions, not demographic strength averages; machines differ. Adjust the load so the last good rep falls around the prescribed range (10–15 on the first three, 12–15 on the hip exercises). Choose the nearest lighter available setting and adjust to actual performance. The revised Monday loads apply to the first workout from September 22, 2026 onward, overriding older workout suggestions once. Recorded history is unchanged; subsequent sets and workouts copy the actual loads used.
- The rest timer retains the original app's behavior, including rest after the final set, and can be extended, shortened, or skipped.

## Install on iPhone
URL after enabling GitHub Pages: https://ahlgrenpersonal.github.io/agym/
Local preview: http://127.0.0.1:4174/agym/
Open in Safari, then Share → Add to Home Screen. The purple A icon is named AGym.
Her app and the original /gym/ app are separate installations.

## Isolation
| Component | AGym |
| --- | --- |
| Repository / deployment | ahlgrenpersonal/agym |
| Manifest id / start URL / scope | /agym/ |
| Service worker scope | /agym/ |
| IndexedDB | agym-workout-tracker (schema 1) |
| Backup format | agym-workout-backup |
| Cache prefix | agym-workout-shell- |
| Local development port | 5174 |
| Production preview port | 4174 |

Backups from the original app are rejected, and vice versa. Reset affects only AGym's database. Service-worker cleanup deletes only AGym's obsolete caches. No original workout records, starting weights, or body measurements are included. Four supplied machine photos are stored locally for offline use.

Both GitHub Pages URLs share a browser origin: clearing all browser data for that domain can remove both apps' data. This is a browser-wide action, unlike the isolated in-app reset. Export backups regularly; data is local to the device and browser, with no cloud sync.

## Development
Requires Node.js 22.13+ and pnpm 11.19.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm preview
```

The copied UI retains set logging, deferral, history, adjustable persistent rest timers, kg/lb settings, JSON backup/restore, CSV export, and offline support. Routine and photo definitions live in lib/routine.ts and lib/exercises.ts.

Publishing is handled by this repository's own GitHub Pages workflow. Do not deploy these files to the original /gym/ app.

## Enable GitHub Pages
In repository Settings → Pages, select **GitHub Actions** as the source. Then open Actions → Deploy AGym PWA → Run workflow on main. Until Pages is enabled, pushes run checks and build without attempting deployment.
