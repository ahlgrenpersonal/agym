import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { ACTIVE_WORKOUT_TYPES } from "../lib/routine";
import { DEFAULT_EXERCISES, BALANCED_EXERCISE_SOURCES, workoutExercises } from "../lib/exercises";
import { ensureDefaults, WorkoutDatabase } from "../lib/db";
import { createBackup, restoreBackup, validateBackup } from "../lib/backup";
import { fillForwardWeight } from "../lib/weight-fill-forward";
import { EXERCISE_GUIDANCE } from "../lib/coaching";
import type { WorkoutSession, SetRecord, WorkoutExerciseState } from "../lib/models";

it("has the agreed 9/10/8 sets with only two or three consecutive sets and unchanged weekly muscle volume",()=>{
 const days=ACTIVE_WORKOUT_TYPES.map(day=>workoutExercises(DEFAULT_EXERCISES,day));
 expect(ACTIVE_WORKOUT_TYPES).toEqual(["day_a","day_b","day_c"]);
 expect(days.map(exercises=>exercises.map(e=>[e.name,e.targetSets,e.minReps,e.maxReps,e.restSeconds]))).toEqual([
  [["Leg Press",3,10,15,120],["Seated Leg Curl",3,10,15,90],["Ab Crunch",3,10,15,90]],
  [["Triceps Press",3,10,15,90],["Ab Crunch",3,10,15,90],["Inner Thighs · Knees Together",2,12,15,90],["Biceps Curl",2,10,15,90]],
  [["Leg Press",3,10,15,120],["Seated Leg Curl",3,10,15,90],["Outer Hips · Knees Apart",2,12,15,90]],
 ]);
 expect(days.map(exercises=>exercises.reduce((sum,e)=>sum+e.targetSets,0))).toEqual([9,10,8]);
 const totals:Record<string,number>={};
 for(const e of days.flat()) { totals[e.imageKey]=(totals[e.imageKey]??0)+e.targetSets;expect(EXERCISE_GUIDANCE[e.id]).toBeDefined(); }
 expect(totals).toEqual({leg_press:6,seated_leg_curl:6,abdominal_crunch_machine:6,triceps_press_machine:3,hip_adduction:2,biceps_curl_machine:2,hip_abduction:2});
});

it("seeds the new plan from existing weights once, preserving old sessions, settings, sets and independent days",async()=>{
 const db=new WorkoutDatabase("balanced-upgrade");
 try {
  await ensureDefaults(db);
  await db.exercises.bulkDelete(Object.keys(BALANCED_EXERCISE_SOURCES));
  await db.exercises.update("seated_leg_curl",{defaultWeightLb:60,restSeconds:105});
  const session:WorkoutSession={id:"old",workoutType:"friday",status:"active",startTimestamp:100,localDate:"2026-10-13",exerciseOrder:["friday_leg_press"],activeRestEndTimestamp:999,activeRestExerciseId:"friday_leg_press"};
  const state:WorkoutExerciseState={id:"state",sessionId:"old",exerciseId:"friday_leg_press",order:0,status:"current",exerciseName:"Leg Press",minReps:10,maxReps:15,targetSets:3,restSeconds:120,incrementLb:5,imageKey:"leg_press"};
  const set:SetRecord={id:"set",sessionId:"old",workoutType:"friday",exerciseId:"friday_leg_press",exerciseName:"Leg Press",setNumber:1,actualWeight:85,weightUnit:"lb",weightKg:38.55535145,actualReps:12,timestamp:110,localDateTime:"2026-10-13T10:00:00"};
  await db.sessions.add(session);await db.exerciseStates.add(state);await db.sets.add(set);
  const before=await createBackup(db);
  await ensureDefaults(db);
  for(const e of before.exercises)expect(await db.exercises.get(e.id)).toEqual(e);
  expect(await db.sessions.toArray()).toEqual(before.sessions);
  expect(await db.exerciseStates.toArray()).toEqual(before.exerciseStates);
  expect(await db.sets.toArray()).toEqual(before.sets);
  expect(await db.exercises.get("a_seated_leg_curl")).toMatchObject({targetSets:3,defaultWeightLb:60,restSeconds:105});
  expect(await db.exercises.get("c_leg_press")).toMatchObject({defaultWeightLb:85});
  await db.exercises.update("c_leg_press",{defaultWeightLb:90,targetSets:2});
  await db.exercises.update("a_leg_press",{defaultWeightLb:120});
  await ensureDefaults(db);
  expect(await db.exercises.get("c_leg_press")).toMatchObject({defaultWeightLb:90,targetSets:2});
  expect(await db.exercises.get("a_leg_press")).toMatchObject({defaultWeightLb:120,targetSets:3});
  // An older backup initializes the same new plan without changing the old records.
  await restoreBackup(db,before);await ensureDefaults(db);
  expect(await db.exercises.get("c_leg_press")).toMatchObject({defaultWeightLb:85});
 }finally {await db.delete();}
});

it("round-trips flexible workout days in backups and carries their actual loads forward",async()=>{
 const db=new WorkoutDatabase("balanced-backup");
 try {
  await ensureDefaults(db);
  const old:WorkoutSession={id:"abc",workoutType:"day_a",status:"completed",startTimestamp:100,localDate:"2026-10-14",exerciseOrder:["a_leg_press"]};
  const set:SetRecord={id:"abc-set",sessionId:old.id,workoutType:"day_a",exerciseId:"a_leg_press",exerciseName:"Leg Press",setNumber:1,actualWeight:80,weightUnit:"lb",weightKg:36.2873896,actualReps:12,timestamp:110,localDateTime:"2026-10-14T10:00:00"};
  await db.sessions.add(old);await db.sets.add(set);
  const backup=await createBackup(db);expect(()=>validateBackup(backup)).not.toThrow();
  await restoreBackup(db,backup);
  expect(await db.sessions.get(old.id)).toMatchObject(old);
  expect(await db.sets.get(set.id)).toEqual(set);
  const next:WorkoutSession={...old,id:"next",status:"active",startTimestamp:200};
  const args={sessions:[old,next],sets:[set],currentSessionId:next.id,displayUnit:"lb" as const,programWeightLb:100};
  expect(fillForwardWeight({...args,exerciseId:"a_leg_press"}).weight).toBe(80);
  expect(fillForwardWeight({...args,exerciseId:"c_leg_press"}).weight).toBe(100);
 }finally {await db.delete();}
});
