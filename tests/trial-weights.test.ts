import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { ensureDefaults, WorkoutDatabase } from "../lib/db";
import { fillForwardWeight } from "../lib/weight-fill-forward";
import type { WorkoutSession, SetRecord } from "../lib/models";

it("backfills missing trial loads without replacing custom loads or workout snapshots", async () => {
 const db = new WorkoutDatabase("trial-migration");
 try {
  await ensureDefaults(db);
  await db.exercises.toCollection().modify(e => { delete e.defaultWeightLb; });
  await db.exercises.update("leg_press", { defaultWeightLb: 55, restSeconds: 150 });
  const session: WorkoutSession = { id:"active", workoutType:"monday", status:"active", startTimestamp:100, exerciseOrder:["leg_press"] };
  await db.sessions.add(session);
  await ensureDefaults(db);
  await ensureDefaults(db);
  expect(await db.exercises.get("leg_press")).toMatchObject({defaultWeightLb:55,restSeconds:150});
  expect(await db.exercises.get("seated_leg_curl")).toMatchObject({defaultWeightLb:20});
  expect(await db.exercises.get("abdominal_crunch_machine")).toMatchObject({defaultWeightLb:10});
  expect(await db.sessions.get("active")).toEqual(session);
 } finally { await db.delete(); }
});

it("uses trial loads only without history and carries actual loads forward in either unit", () => {
 const current: WorkoutSession = {id:"current",workoutType:"monday",status:"active",startTimestamp:200,exerciseOrder:["leg_press"]};
 const previous: WorkoutSession = {...current,id:"previous",status:"completed",startTimestamp:100};
 const record: SetRecord = {id:"set",sessionId:"previous",workoutType:"monday",exerciseId:"leg_press",exerciseName:"Leg Press",setNumber:1,actualWeight:25,weightUnit:"lb",weightKg:11.33980925,actualReps:13,timestamp:110};
 const args = {sessions:[previous,current],sets:[] as SetRecord[],currentSessionId:current.id,exerciseId:"leg_press",displayUnit:"lb" as const,programWeightLb:40};
 expect(fillForwardWeight(args)).toEqual({weight:40,source:"starting_weight"});
 expect(fillForwardWeight({...args,displayUnit:"kg"})).toEqual({weight:18,source:"starting_weight"});
 expect(fillForwardWeight({...args,sets:[record]})).toEqual({weight:25,source:"previous_workout"});
 expect(fillForwardWeight({...args,sets:[{...record,sessionId:current.id}]})).toEqual({weight:25,source:"previous_set"});
});
