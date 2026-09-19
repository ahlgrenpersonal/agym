
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
 it("moves saved exercise definitions to the new days without changing custom settings or history", async () => {
  const database = new WorkoutDatabase("schedule-update");
  try {
   await ensureDefaults(database);
   await database.exercises.update("seated_leg_curl", { workoutType: "wednesday", targetSets: 2, restSeconds: 105 });
   await database.exercises.update("hip_adduction", { workoutType: "friday", targetSets: 1 });
   const session = { id: "old-session", workoutType: "wednesday" as const, status: "completed" as const, startTimestamp: 100, exerciseOrder: ["seated_leg_curl"] };
   await database.sessions.add(session);
   await ensureDefaults(database);
   expect(await database.exercises.get("seated_leg_curl")).toMatchObject({ workoutType: "monday", order: 1, targetSets: 2, restSeconds: 105 });
   expect(await database.exercises.get("hip_adduction")).toMatchObject({ workoutType: "thursday", targetSets: 1 });
   expect(await database.sessions.get("old-session")).toEqual(session);
  } finally { await database.delete(); }
 });

 it("provides exactly the agreed routine with no inherited starting loads", () => {
  expect(ACTIVE_WORKOUT_TYPES).toEqual(["monday","thursday"]);
  expect(ACTIVE_WORKOUT_TYPES.map(day => workoutExercises(DEFAULT_EXERCISES,day).map(e=>[e.id,e.targetSets,e.minReps,e.maxReps,e.restSeconds]))).toEqual([
   [["leg_press",3,10,15,120],["seated_leg_curl",4,10,15,90]],
   [["abdominal_crunch_machine",4,10,15,90],["hip_abduction",2,12,15,90],["hip_adduction",2,12,15,90]]
  ]);
  expect(DEFAULT_EXERCISES.map(e=>e.defaultWeightLb)).toEqual([70,40,40,40,40]);
  expect(defaultStartingWeight("lb")).toBeUndefined();
  expect(defaultStartingWeight("kg")).toBeUndefined();
 });
 it("cannot import the original app's backups, and resetting AGym leaves another database untouched", async () => {
  const agym = new WorkoutDatabase("isolation-agym");
  const original = new WorkoutDatabase("isolation-original");
  try {
   await ensureDefaults(agym); await ensureDefaults(original);
   const session = {id:"keep",workoutType:"monday" as const,status:"active" as const,startTimestamp:100,exerciseOrder:["leg_press"]};
   await original.sessions.add(session);
   await agym.sessions.add({...session,id:"agym"});
   const backup=await createBackup(agym);
   expect(backup.format).toBe("agym-workout-backup");
   expect(DATABASE_NAME).toBe("agym-workout-tracker");
   expect(()=>validateBackup({...backup,format:"workout-backup"})).toThrow();
   await expect(restoreBackup(agym,{...backup,format:"workout-backup"})).rejects.toThrow();
   expect(await agym.sessions.get("agym")).toBeTruthy();
   await resetAllData(agym);
   expect(await agym.sessions.count()).toBe(0);
   expect(await original.sessions.get("keep")).toEqual(session);
  } finally {await agym.delete();await original.delete();}
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
 it("service-worker activation deletes only obsolete AGym caches and ignores the original app's URLs",async () => {
  const listeners: Record<string,(event:unknown)=>void> = {};
  const deleted: string[]=[];
  let pending: Promise<unknown> | undefined;
  let intercepted=false;
  runInNewContext(readFileSync("public/sw.js","utf8"),{
   URL,Response,
   self:{registration:{scope:"https://example.com/agym/"},location:{origin:"https://example.com"},addEventListener:(name:string,cb:(event:unknown)=>void)=>{listeners[name]=cb;},clients:{claim:async()=>{}},skipWaiting:()=>{}},
   caches:{keys:async()=>["workout-shell-v23","unrelated-cache","agym-workout-shell-v0","agym-workout-shell-v5"],delete:async(key:string)=>{deleted.push(key);return true;}}
  });
  listeners.activate({waitUntil:(promise:Promise<unknown>)=>{pending=promise;}});
  await pending;
  expect(deleted).toEqual(["agym-workout-shell-v0"]);
  listeners.fetch({request:{method:"GET",url:"https://example.com/gym/",mode:"navigate"},respondWith:()=>{intercepted=true;}});
  expect(intercepted).toBe(false);
 });
});
