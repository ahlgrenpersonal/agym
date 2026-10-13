import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { ensureDefaults, WorkoutDatabase } from "../lib/db";
import { createBackup, restoreBackup } from "../lib/backup";
import { workoutExercises } from "../lib/exercises";
import { fillForwardWeight } from "../lib/weight-fill-forward";
import type { SetRecord, WorkoutSession } from "../lib/models";

it("adds Friday to an existing installation without changing existing definitions, sessions or sets", async () => {
 const db = new WorkoutDatabase("friday-upgrade");
 try {
  await ensureDefaults(db);
  await db.exercises.bulkDelete(["triceps_press_machine", "biceps_curl_machine"]);
  await db.exercises.update("leg_press", {defaultWeightLb:115, restSeconds:150});
  const session: WorkoutSession = {id:"old", workoutType:"monday", status:"completed", startTimestamp:100, exerciseOrder:["leg_press"]};
  const set: SetRecord = {id:"set", sessionId:"old", workoutType:"monday", exerciseId:"leg_press", exerciseName:"Leg Press", setNumber:1, actualWeight:115, weightUnit:"lb", weightKg:52.16312255, actualReps:12, timestamp:110, localDateTime:"1969-12-31T19:00:00.110"};
  await db.sessions.add(session); await db.sets.add(set);
  const before = await createBackup(db);
  await ensureDefaults(db); await ensureDefaults(db);
  expect(await db.sessions.toArray()).toEqual(before.sessions);
  expect(await db.sets.toArray()).toEqual(before.sets);
  expect(await db.exerciseStates.toArray()).toEqual(before.exerciseStates);
  for (const definition of before.exercises) expect(await db.exercises.get(definition.id)).toEqual(definition);
  expect(workoutExercises(await db.exercises.toArray(), "friday").map(e=>[e.id,e.targetSets,e.defaultWeightLb])).toEqual([
   ["triceps_press_machine",3,40], ["biceps_curl_machine",2,20]
  ]);
  // Restoring an older backup must also pick up Friday on initialization.
  await restoreBackup(db,before); await ensureDefaults(db);
  expect(workoutExercises(await db.exercises.toArray(),"friday")).toHaveLength(2);
  expect(await db.sets.toArray()).toEqual(before.sets);
 } finally { await db.delete(); }
});

it.each([["triceps_press_machine",40],["biceps_curl_machine",20]] as const)("prefills %s once, then preserves actual reduced weights after restart", (exerciseId, startingWeight) => {
 const previous: WorkoutSession = {id:"previous", workoutType:"friday", status:"completed", startTimestamp:100, exerciseOrder:[exerciseId]};
 const current: WorkoutSession = {...previous,id:"current",status:"active",startTimestamp:200};
 const args={sessions:[previous,current],sets:[] as SetRecord[],currentSessionId:"current",exerciseId,displayUnit:"lb" as const,programWeightLb:startingWeight};
 expect(fillForwardWeight(args)).toEqual({weight:startingWeight,source:"starting_weight"});
 const set: SetRecord={id:"set",sessionId:"previous",workoutType:"friday",exerciseId,exerciseName:exerciseId,setNumber:1,actualWeight:10,weightUnit:"lb",weightKg:4.5359237,actualReps:12,timestamp:110};
 expect(fillForwardWeight({...args,sets:[set]})).toEqual({weight:10,source:"previous_workout"});
 expect(fillForwardWeight({...args,sets:[{...set,sessionId:"current",timestamp:210}]})).toEqual({weight:10,source:"previous_set"});
});
