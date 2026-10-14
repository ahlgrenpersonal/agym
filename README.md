# AGym · Gym Tracker

Independent copy of the Workout PWA. Source is self-contained in this folder; no imports or build steps refer to the parent app.

## Schedule
Rotate through Day A, Day B, and Day C; no calendar weekdays are assigned.
- Day A (9 sets): Leg Press 3 × 10–15; Seated Leg Curl 3 × 10–15; Ab Crunch 3 × 10–15.
- Day B (9 sets): Triceps Press 3 × 10–15; Ab Crunch 3 × 10–15; Inner Thighs 2 × 12–15; Biceps Curl 1 × 10–15.
- Day C (9 sets): Leg Press 3 × 10–15; Seated Leg Curl 3 × 10–15; Outer Hips 2 × 12–15; Biceps Curl 1 × 10–15.
- Rest 120 seconds for leg press and 90 seconds for other exercises. Warm up and do an easy practice set. Work to the last good rep, without swinging or shortening the movement; no failed rep is needed. Stop for sharp or joint pain.
- The weekly totals remain 27 sets: leg press, seated leg curl, and abs each 6; inner thighs and outer hips each 2; triceps 3; biceps 2.
- New plan entries copy existing weight suggestions once. Later settings and weights stay independent for each day. Fresh-install trial loads: leg press 100 lb, seated leg curl 50 lb, abs 40 lb, hips 50 lb, triceps press 40 lb, biceps curl 20 lb. These are adjustable trials, not strength estimates. Increase by the smallest available step once every set reaches 15 controlled reps.
- Old weekday workouts keep their names, results, and snapshots in History. Today's unfinished older workouts can still be resumed from the home screen. Existing logs are never rewritten to fit the new routine.
- The triceps press also involves chest and shoulders. Machine photos and technique cues are available in each exercise.
- The rest timer persists across reloads and can be extended, shortened, or skipped, including after the final set.

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

Backups from the original app are rejected, and vice versa. Reset affects only AGym's database. Service-worker cleanup deletes only AGym's obsolete caches. No original workout records, starting weights, or body measurements are included. Six supplied machine photos are stored locally for offline use.

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
