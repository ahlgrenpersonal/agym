import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { ensureDefaults, WorkoutDatabase } from "../lib/db";
import { DEFAULT_EXERCISES } from "../lib/exercises";
import { fillForwardWeight } from "../lib/weight-fill-forward";
import { toKg } from "../lib/recommendation";
import type { WorkoutSession, SetRecord } from "../lib/models";

it.each([['leg_press',70,100],['seated_leg_curl',40,50],['hip_abduction',40,50],['hip_adduction',40,50]] as const)(
 'applies the %s load once after the previous workout, preserving logs and later choices',
 async (exerciseId, oldWeight, newWeight) => {
  const db = new WorkoutDatabase('program-load-'+exerciseId);
  try {
   await ensureDefaults(db);
   await db.exercises.update(exerciseId,{defaultWeightLb:oldWeight,defaultWeightEffectiveLocalDate:undefined});
   const workoutType = DEFAULT_EXERCISES.find(e=>e.id===exerciseId)!.workoutType;
   const previous: WorkoutSession = {id:'previous',workoutType,status:'completed',startTimestamp:100,localDate:'2026-09-21',exerciseOrder:[exerciseId]};
   const current: WorkoutSession = {...previous,id:'current',status:'active',startTimestamp:200,localDate:'2026-09-28'};
   const record: SetRecord = {id:'old-set',sessionId:previous.id,workoutType,exerciseId,exerciseName:exerciseId,setNumber:1,actualWeight:oldWeight,weightUnit:'lb',weightKg:toKg(oldWeight,'lb'),actualReps:12,timestamp:110};
   await db.sessions.add(previous);await db.sets.add(record);
   await ensureDefaults(db);await ensureDefaults(db);
   const definition=(await db.exercises.get(exerciseId))!;
   expect(definition).toMatchObject({defaultWeightLb:newWeight,defaultWeightEffectiveLocalDate:'2026-09-22'});
   expect(await db.sessions.get(previous.id)).toEqual(previous);
   expect(await db.sets.get(record.id)).toEqual(record);
   const args={sessions:[previous,current],sets:[record],currentSessionId:current.id,exerciseId,displayUnit:'lb' as const,programWeightLb:definition.defaultWeightLb,programWeightEffectiveLocalDate:definition.defaultWeightEffectiveLocalDate};
   expect(fillForwardWeight(args)).toEqual({weight:newWeight,source:'program_update'});
   // A manual adjustment takes precedence immediately, including after a restart.
   const adjusted={...record,id:'new-set',sessionId:current.id,actualWeight:newWeight-5,weightKg:toKg(newWeight-5,'lb'),timestamp:210};
   expect(fillForwardWeight({...args,sets:[record,adjusted]})).toEqual({weight:newWeight-5,source:'previous_set'});
   const next={...current,id:'next',startTimestamp:300,localDate:'2026-10-05'};
   expect(fillForwardWeight({...args,sessions:[previous,{...current,status:'completed'},next],sets:[record,adjusted],currentSessionId:next.id})).toEqual({weight:newWeight-5,source:'previous_workout'});
   await db.exercises.update(exerciseId,{defaultWeightLb:oldWeight});
   await ensureDefaults(db);
   expect((await db.exercises.get(exerciseId))?.defaultWeightLb).toBe(oldWeight);
   expect((await db.exercises.toArray()).filter(e=>e.id!==exerciseId)).toEqual(DEFAULT_EXERCISES.filter(e=>e.id!==exerciseId).sort((a,b)=>a.id.localeCompare(b.id)));
  } finally {await db.delete();}
 });
