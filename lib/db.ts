
import Dexie, { type Table } from "dexie";
import { DEFAULT_EXERCISES, FRIDAY_EXERCISE_COPIES, DEFAULT_SETTINGS, RETIRED_EXERCISE_IDS } from "./exercises";
import type { AppSettings, ExerciseDefinition, SetRecord, WorkoutExerciseState, WorkoutSession } from "./models";
import { fillForwardWeight } from "./weight-fill-forward";
export const DATABASE_NAME = "agym-workout-tracker";
export const DATABASE_VERSION = 1;
export class WorkoutDatabase extends Dexie {
 exercises!: Table<ExerciseDefinition,string>;
 sessions!: Table<WorkoutSession,string>;
 exerciseStates!: Table<WorkoutExerciseState,string>;
 sets!: Table<SetRecord,string>;
 settings!: Table<AppSettings,string>;
 constructor(name = DATABASE_NAME) {
  super(name);
  this.version(1).stores({
   exercises:"&id, workoutType, order",
   sessions:"&id, status, workoutType, startTimestamp, localDate, [localDate+status], [workoutType+status]",
   exerciseStates:"&id, sessionId, exerciseId, [sessionId+exerciseId], status, order",
   sets:"&id, sessionId, exerciseId, setNumber, timestamp, [exerciseId+setNumber]",
   settings:"&id"
  });
  this.on("populate",async()=>{
   await this.exercises.bulkAdd(DEFAULT_EXERCISES.map(item=>({...item})));
   await this.settings.add({...DEFAULT_SETTINGS});
  });
 }
}
export const db = new WorkoutDatabase();

// Superseded trial loads; upgrade these defaults while retaining other custom values.
const PREVIOUS_TRIAL_WEIGHTS: Record<string, number> = {
  leg_press: 40, seated_leg_curl: 20, abdominal_crunch_machine: 10,
  hip_abduction: 20, hip_adduction: 20,
};

export async function ensureDefaults(database: WorkoutDatabase = db): Promise<void> {
  await database.open();
  await database.transaction(
    "rw",
    database.exercises,
    database.settings,
    database.sessions,
    database.sets,
    async () => {
      await database.exercises.bulkDelete([...RETIRED_EXERCISE_IDS]);
      const existingIds = new Set((await database.exercises.toArray()).map((item) => item.id));
      const missing = DEFAULT_EXERCISES.filter((item) => !existingIds.has(item.id) && !FRIDAY_EXERCISE_COPIES[item.id]);
      if (missing.length) {
        await database.exercises.bulkAdd(missing.map((item) => ({ ...item })));
      }
      // Apply new program loads once; preserve later customizations and all historical sessions.
      for (const planned of DEFAULT_EXERCISES) {
        const current = await database.exercises.get(planned.id);
        if (current && planned.routineRevision && current.routineRevision !== planned.routineRevision) {
          await database.exercises.update(planned.id, {
            targetSets: planned.targetSets,
            additionalWorkoutOrders: planned.additionalWorkoutOrders,
            routineRevision: planned.routineRevision,
          });
        }
        const hasNewProgramLoad = planned.defaultWeightEffectiveLocalDate !== undefined &&
          (!current?.defaultWeightEffectiveLocalDate || current.defaultWeightEffectiveLocalDate < planned.defaultWeightEffectiveLocalDate);
        if (current && planned.defaultWeightLb !== undefined &&
            (hasNewProgramLoad || current.defaultWeightLb === undefined ||
             (!current.defaultWeightEffectiveLocalDate && current.defaultWeightLb === PREVIOUS_TRIAL_WEIGHTS[planned.id]))) {
          await database.exercises.update(planned.id, {
            defaultWeightLb: planned.defaultWeightLb,
            ...(planned.defaultWeightEffectiveLocalDate ? { defaultWeightEffectiveLocalDate: planned.defaultWeightEffectiveLocalDate } : {}),
          });
        }
        if (current && (current.workoutType !== planned.workoutType || current.order !== planned.order)) {
          await database.exercises.update(planned.id, { workoutType: planned.workoutType, order: planned.order });
        }
      }
      // One-time creation, not a live link: copy the saved Monday prescription
      // and its suggested load. Read history only; never rewrite logged records.
      for (const [copyId, sourceId] of Object.entries(FRIDAY_EXERCISE_COPIES)) {
        if (await database.exercises.get(copyId)) continue;
        const planned = DEFAULT_EXERCISES.find(item => item.id === copyId)!;
        const source = await database.exercises.get(sourceId);
        if (!source) { await database.exercises.add({ ...planned }); continue; }
        const sessions = await database.sessions.where("workoutType").equals("monday").toArray();
        const mondayIds = new Set(sessions.map(session => session.id));
        const sets = (await database.sets.where("exerciseId").equals(sourceId).toArray())
          .filter(set => mondayIds.has(set.sessionId));
        const seedSession: WorkoutSession = {
          id: "friday-copy-seed", workoutType: "monday", status: "active",
          startTimestamp: Date.now(), exerciseOrder: [],
        };
        const suggestion = fillForwardWeight({
          sessions: [...sessions, seedSession], sets, currentSessionId: seedSession.id,
          exerciseId: sourceId, displayUnit: "lb", programWeightLb: source.defaultWeightLb,
          programWeightEffectiveLocalDate: source.defaultWeightEffectiveLocalDate,
        });
        await database.exercises.add({
          ...planned, name: source.name, imageKey: source.imageKey,
          minReps: source.minReps, maxReps: source.maxReps, targetSets: source.targetSets,
          restSeconds: source.restSeconds, incrementLb: source.incrementLb,
          defaultWeightLb: suggestion.weight ?? planned.defaultWeightLb,
        });
      }
      if (!(await database.settings.get("settings"))) {
        await database.settings.add({ ...DEFAULT_SETTINGS });
      }
    },
  );
}

export async function deleteWorkoutSession(
  sessionId: string,
  database: WorkoutDatabase = db,
): Promise<void> {
  await database.transaction(
    "rw",
    database.sessions,
    database.exerciseStates,
    database.sets,
    async () => {
      await database.sets.where("sessionId").equals(sessionId).delete();
      await database.exerciseStates.where("sessionId").equals(sessionId).delete();
      await database.sessions.delete(sessionId);
    },
  );
}

export async function resetAllData(database: WorkoutDatabase = db): Promise<void> {
  await database.transaction(
    "rw",
    database.exercises,
    database.sessions,
    database.exerciseStates,
    database.sets,
    database.settings,
    async () => {
      await Promise.all([
        database.exercises.clear(),
        database.sessions.clear(),
        database.exerciseStates.clear(),
        database.sets.clear(),
        database.settings.clear(),
      ]);
      await database.exercises.bulkAdd(DEFAULT_EXERCISES.map((item) => ({ ...item })));
      await database.settings.add({ ...DEFAULT_SETTINGS });
    },
  );
}
