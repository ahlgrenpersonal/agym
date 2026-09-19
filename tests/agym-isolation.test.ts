
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { WorkoutDatabase, DATABASE_NAME, ensureDefaults, resetAllData } from "../lib/db";
import { createBackup, restoreBackup, validateBackup } from "../lib/backup";
import { ACTIVE_WORKOUT_TYPES } from "../lib/routine";
import { DEFAULT_EXERCISES, workoutExercises } from "../lib/exercises";
import { defaultStartingWeight } from "../lib/starting-weight";

describe("AGym schedule and independence", () => {
 it("provides exactly the agreed routine with no inherited starting loads", () => {
  expect(ACTIVE_WORKOUT_TYPES).toEqual(["monday","wednesday","friday"]);
  expect(ACTIVE_WORKOUT_TYPES.map(day => workoutExercises(DEFAULT_EXERCISES,day).map(e=>[e.id,e.targetSets,e.minReps,e.maxReps,e.restSeconds]))).toEqual([
   [["leg_press",3,10,15,120]],
   [["seated_leg_curl",4,10,15,90]],
   [["abdominal_crunch_machine",4,10,15,90],["hip_abduction",2,12,15,90],["hip_adduction",2,12,15,90]]
  ]);
  expect(DEFAULT_EXERCISES.every(e=>e.defaultWeightLb === undefined)).toBe(true);
  expect(defaultStartingWeight("lb")).toBeUndefined();
  expect(defaultStartingWeight("kg")).toBeUndefined();
 });
 it("cannot import John's backups, and resetting AGym leaves another database untouched", async () => {
  const agym = new WorkoutDatabase("isolation-agym");
  const john = new WorkoutDatabase("isolation-john");
  try {
   await ensureDefaults(agym); await ensureDefaults(john);
   const session = {id:"keep",workoutType:"monday" as const,status:"active" as const,startTimestamp:100,exerciseOrder:["leg_press"]};
   await john.sessions.add(session);
   await agym.sessions.add({...session,id:"agym"});
   const backup=await createBackup(agym);
   expect(backup.format).toBe("agym-workout-backup");
   expect(DATABASE_NAME).toBe("agym-workout-tracker");
   expect(()=>validateBackup({...backup,format:"workout-backup"})).toThrow();
   await expect(restoreBackup(agym,{...backup,format:"workout-backup"})).rejects.toThrow();
   expect(await agym.sessions.get("agym")).toBeTruthy();
   await resetAllData(agym);
   expect(await agym.sessions.count()).toBe(0);
   expect(await john.sessions.get("keep")).toEqual(session);
  } finally {await agym.delete();await john.delete();}
 });
 it("has its own install URL, scope, purple identity, and real machine assets", () => {
  const m=JSON.parse(readFileSync("public/manifest.webmanifest","utf8"));
  expect(m.id).toBe("/agym/");
  expect(m.start_url).toBe("/agym/");
  expect(m.scope).toBe("/agym/");
  expect(m.short_name).toBe("AGym");
  expect(m.theme_color).toBe("#7c3aed");
  for(const f of ["machine-leg-press.jpg","machine-seated-leg-curl.jpg","machine-abdominal-crunch-machine.jpg","machine-hip-abduction-adduction.jpg","apple-touch-icon.png"]) {
   expect(readFileSync("public/"+f).length).toBeGreaterThan(1000);
  }
 });
 it("service-worker activation deletes only obsolete AGym caches and ignores John's URLs",async () => {
  const listeners: Record<string,(event:unknown)=>void> = {};
  const deleted: string[]=[];
  let pending: Promise<unknown> | undefined;
  let intercepted=false;
  runInNewContext(readFileSync("public/sw.js","utf8"),{
   URL,Response,
   self:{registration:{scope:"https://example.com/agym/"},location:{origin:"https://example.com"},addEventListener:(name:string,cb:(event:unknown)=>void)=>{listeners[name]=cb;},clients:{claim:async()=>{}},skipWaiting:()=>{}},
   caches:{keys:async()=>["workout-shell-v23","unrelated-cache","agym-workout-shell-v0","agym-workout-shell-v1"],delete:async(key:string)=>{deleted.push(key);return true;}}
  });
  listeners.activate({waitUntil:(promise:Promise<unknown>)=>{pending=promise;}});
  await pending;
  expect(deleted).toEqual(["agym-workout-shell-v0"]);
  listeners.fetch({request:{method:"GET",url:"https://example.com/gym/",mode:"navigate"},respondWith:()=>{intercepted=true;}});
  expect(intercepted).toBe(false);
 });
});
