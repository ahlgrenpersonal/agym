
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureDefaults, WorkoutDatabase } from "../lib/db";
import { localDateKey } from "../lib/local-date";
import { reconcileActiveWorkoutPlans } from "../lib/session-repair";
import { completeCurrentExercise } from "../lib/queue";
import type { WorkoutExerciseState, WorkoutSession, SetRecord } from "../lib/models";

let db: WorkoutDatabase;
const now = new Date(2026, 8, 21, 10).getTime();
const session: WorkoutSession = {
 id: "older-monday", workoutType: "monday", status: "active",
 startTimestamp: now - 1000, localDate: localDateKey(now),
 exerciseOrder: ["leg_press"],
 activeRestEndTimestamp: now + 110000, activeRestExerciseId: "leg_press",
};
const press: WorkoutExerciseState = {
 id: "older-monday:leg_press", sessionId: session.id, exerciseId: "leg_press",
 order: 0, status: "current", queuedStatus: "todo",
 exerciseName: "My Leg Press", minReps: 10, maxReps: 15, targetSets: 2,
 restSeconds: 150, incrementLb: 5, imageKey: "leg_press",
};
const set: SetRecord = {
 id: "existing-set", sessionId: session.id, workoutType: "monday",
 exerciseId: "leg_press", exerciseName: press.exerciseName, setNumber: 1,
 actualWeight: 10, weightUnit: "lb", weightKg: 4.5359237,
 actualReps: 12, timestamp: now - 500,
};

beforeEach(async () => {
 db = new WorkoutDatabase("repair-" + Math.random());
 await ensureDefaults(db);
 await db.sessions.add(session);
 await db.exerciseStates.add(press);
 await db.sets.add(set);
});
afterEach(async () => { await db.delete(); });

describe("resume a workout created before the two-day update", () => {
 it("adds the missing curl on restart and preserves sets, timer, and custom prescriptions", async () => {
  await db.exercises.update("seated_leg_curl", { targetSets: 2, restSeconds: 105 });
  await reconcileActiveWorkoutPlans(db, now);
  expect(await db.exerciseStates.get(press.id)).toEqual(press);
  expect(await db.sets.get(set.id)).toEqual(set);
  expect(await db.sessions.get(session.id)).toEqual({
    ...session, exerciseOrder: ["leg_press", "seated_leg_curl", "abdominal_crunch_machine"],
  });
  expect(await db.exerciseStates.get(session.id + ":seated_leg_curl")).toMatchObject({
    order: 1, status: "todo", targetSets: 2, restSeconds: 105,
  });
  // A second reload (and overlapping refresh requests) must not add it again.
  await Promise.all([reconcileActiveWorkoutPlans(db, now), reconcileActiveWorkoutPlans(db, now)]);
  expect(await db.exerciseStates.count()).toBe(3);
  const states = await db.exerciseStates.toArray();
  expect(completeCurrentExercise(states, press.id).find(s => s.status === "current")?.exerciseId)
    .toBe("seated_leg_curl");
 });

 it("does not rewrite completed, archived, or previous-day workout history", async () => {
  for (const status of ["completed", "archived", "active"] as const) {
    await db.sessions.put({ ...session, status, ...(status === "active" ? {localDate:"2026-09-20"} : {}) });
    const before = await db.sessions.get(session.id);
    await reconcileActiveWorkoutPlans(db, now);
    expect(await db.sessions.get(session.id)).toEqual(before);
    expect(await db.exerciseStates.count()).toBe(1);
  }
 });

 it("makes the added curl current if the existing press is complete but the session is unfinished", async () => {
  await db.exerciseStates.update(press.id, { status: "complete", queuedStatus: undefined });
  await reconcileActiveWorkoutPlans(db, now);
  expect(await db.exerciseStates.get(press.id)).toMatchObject({ status: "complete" });
  expect(await db.exerciseStates.get(session.id + ":seated_leg_curl")).toMatchObject({ status: "current" });
 });

 it("retains deferral and makes the missing exercise available", async () => {
  await db.exerciseStates.update(press.id, { status: "deferred", queuedStatus: undefined });
  await reconcileActiveWorkoutPlans(db, now);
  expect(await db.exerciseStates.get(press.id)).toMatchObject({ status: "deferred" });
  expect(await db.exerciseStates.get(session.id + ":seated_leg_curl")).toMatchObject({ status: "current" });
 });

 it("does not ask for sets again when recovering a missing state with completed logs", async () => {
  await db.exercises.update("seated_leg_curl", { targetSets: 1 });
  await db.sets.add({ ...set, id: "curl-set", exerciseId: "seated_leg_curl" });
  await reconcileActiveWorkoutPlans(db, now);
  expect(await db.exerciseStates.get(session.id + ":seated_leg_curl")).toMatchObject({ status: "complete" });
  expect(await db.sets.count()).toBe(2);
 });

 it("leaves new sessions that already have both exercises untouched", async () => {
  await reconcileActiveWorkoutPlans(db, now);
  const before = await db.exerciseStates.toArray();
  await reconcileActiveWorkoutPlans(db, now);
  expect(await db.exerciseStates.toArray()).toEqual(before);
 });
});
