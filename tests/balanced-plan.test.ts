import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { ACTIVE_WORKOUT_TYPES } from "../lib/routine";
import { DEFAULT_EXERCISES, BALANCED_EXERCISE_SOURCES, workoutExercises } from "../lib/exercises";
import { ensureDefaults, WorkoutDatabase } from "../lib/db";
import { createBackup, restoreBackup, validateBackup } from "../lib/backup";
import { fillForwardWeight } from "../lib/weight-fill-forward";
import { reconcileActiveWorkoutPlans } from "../lib/session-repair";
import { EXERCISE_GUIDANCE } from "../lib/coaching";
import type { WorkoutSession, SetRecord, WorkoutExerciseState } from "../lib/models";

it("has the agreed 9/9/9 sets with biceps split across B and C and unchanged weekly muscle volume",()=>{
 const days=ACTIVE_WORKOUT_TYPES.map(day=>workoutExercises(DEFAULT_EXERCISES,day));
 expect(ACTIVE_WORKOUT_TYPES).toEqual(["day_a","day_b","day_c"]);
 expect(days.map(exercises=>exercises.map(e=>[e.name,e.targetSets,e.minReps,e.maxReps,e.restSeconds]))).toEqual([
  [["Leg Press",3,10,15,120],["Seated Leg Curl",3,10,15,90],["Ab Crunch",3,10,15,90]],
  [["Triceps Press",3,10,15,90],["Ab Crunch",3,10,15,90],["Inner Thighs · Knees Together",2,12,15,90],["Biceps Curl",1,10,15,90]],
  [["Leg Press",3,10,15,120],["Seated Leg Curl",3,10,15,90],["Outer Hips · Knees Apart",2,12,15,90],["Biceps Curl",1,10,15,90]],
 ]);
 expect(days.map(exercises=>exercises.reduce((sum,e)=>sum+e.targetSets,0))).toEqual([9,9,9]);
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

it.each([0,1,2])("upgrades the biceps split with %i logged B sets without losing records or changing completed history",async(logged)=>{
 const db=new WorkoutDatabase("biceps-split-"+logged);
 const now=new Date(2026,9,14,12).getTime();
 try {
  await ensureDefaults(db);
  await db.exercises.delete("c_biceps_curl");
  await db.exercises.update("b_biceps_curl",{targetSets:2,routineRevision:undefined,defaultWeightLb:25});
  const session:WorkoutSession={id:"b-active",workoutType:"day_b",status:"active",startTimestamp:now-10000,localDate:"2026-10-14",exerciseOrder:["b_biceps_curl"],activeRestEndTimestamp:now+60000,activeRestExerciseId:"b_biceps_curl"};
  const state:WorkoutExerciseState={id:"b-state",sessionId:session.id,exerciseId:"b_biceps_curl",order:0,status:"current",exerciseName:"Biceps Curl",minReps:10,maxReps:15,targetSets:2,restSeconds:90,incrementLb:5,imageKey:"biceps_curl_machine"};
  const sets:SetRecord[]=Array.from({length:logged},(_,i)=>({id:"b-set-"+i,sessionId:session.id,workoutType:"day_b",exerciseId:"b_biceps_curl",exerciseName:"Biceps Curl",setNumber:i+1,actualWeight:30,weightUnit:"lb",weightKg:13.6077711,actualReps:12,timestamp:now-5000+i,localDateTime:"2026-10-14T11:59:55"}));
  const completed={...session,id:"completed",status:"completed" as const};
  const completedState={...state,id:"completed-state",sessionId:completed.id,status:"complete" as const};
  const c:WorkoutSession={id:"c-active",workoutType:"day_c",status:"active",startTimestamp:now,localDate:"2026-10-14",exerciseOrder:[]};
  await db.sessions.bulkAdd([session,completed,c]);await db.exerciseStates.bulkAdd([state,completedState]);await db.sets.bulkAdd(sets);
  await ensureDefaults(db);await reconcileActiveWorkoutPlans(db,now);
  expect(await db.exercises.get("b_biceps_curl")).toMatchObject({targetSets:1,defaultWeightLb:25,routineRevision:"split-biceps-b-c-v1"});
  expect(await db.exercises.get("c_biceps_curl")).toMatchObject({targetSets:1,defaultWeightLb:logged?30:25});
  expect(await db.exerciseStates.get(state.id)).toMatchObject({targetSets:Math.max(1,logged),status:logged?"complete":"current"});
  expect(await db.exerciseStates.where("sessionId").equals(c.id).toArray()).toEqual(expect.arrayContaining([expect.objectContaining({exerciseId:"c_biceps_curl",targetSets:1,order:3})]));
  expect(await db.sets.toArray()).toEqual(sets);
  expect(await db.sessions.get(completed.id)).toEqual(completed);
  expect(await db.exerciseStates.get(completedState.id)).toEqual(completedState);
  expect(await db.sessions.get(session.id)).toMatchObject({activeRestEndTimestamp:now+60000,activeRestExerciseId:"b_biceps_curl"});
  await db.exercises.update("c_biceps_curl",{defaultWeightLb:15});
  const before=await createBackup(db);
  await ensureDefaults(db);await reconcileActiveWorkoutPlans(db,now);
  const after=await createBackup(db);
  expect(after.exercises).toEqual(before.exercises);
  expect(after.exerciseStates).toEqual(before.exerciseStates);
  expect(after.sets).toEqual(before.sets);
 }finally {await db.delete();}
});
