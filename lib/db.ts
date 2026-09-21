
import Dexie, { type Table } from "dexie";
import { DEFAULT_EXERCISES, DEFAULT_SETTINGS, RETIRED_EXERCISE_IDS } from "./exercises";
import type { AppSettings, ExerciseDefinition, SetRecord, WorkoutExerciseState, WorkoutSession } from "./models";
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
    async () => {
      await database.exercises.bulkDelete([...RETIRED_EXERCISE_IDS]);
      const existingIds = new Set((await database.exercises.toArray()).map((item) => item.id));
      const missing = DEFAULT_EXERCISES.filter((item) => !existingIds.has(item.id));
      if (missing.length) {
        await database.exercises.bulkAdd(missing.map((item) => ({ ...item })));
      }
      // Apply new program loads once; preserve later customizations and all historical sessions.
      for (const planned of DEFAULT_EXERCISES) {
        const current = await database.exercises.get(planned.id);
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
