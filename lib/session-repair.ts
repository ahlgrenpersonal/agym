
import type { WorkoutDatabase } from "./db";
import { workoutExercises } from "./exercises";
import { localDateKey } from "./local-date";
import type { WorkoutExerciseState } from "./models";
import { jumpToExercise } from "./queue";
import { ACTIVE_WORKOUT_TYPES } from "./routine";

/**
 * Extend today's unfinished snapshots when the routine gains exercises.
 * Migrate split-set prescriptions once. Preserve recorded sets, custom settings, timers,
 * and completed/archived history. The transaction makes retries idempotent.
 */
export async function reconcileActiveWorkoutPlans(
  database: WorkoutDatabase,
  timestamp = Date.now(),
): Promise<void> {
  const today = localDateKey(timestamp);
  await database.transaction(
    "rw", database.exercises, database.sessions, database.exerciseStates, database.sets,
    async () => {
      const definitions = await database.exercises.toArray();
      const active = await database.sessions.where("status").equals("active").toArray();
      for (const session of active) {
        if ((session.localDate ?? localDateKey(session.startTimestamp)) !== today ||
            !ACTIVE_WORKOUT_TYPES.includes(session.workoutType)) continue;
        let existing = await database.exerciseStates.where("sessionId").equals(session.id).toArray();
        const present = new Set(existing.map(state => state.exerciseId));
        const missing = workoutExercises(definitions, session.workoutType)
          .filter(exercise => !present.has(exercise.id));

        const recorded = await database.sets.where("sessionId").equals(session.id).toArray();
        let revised = false;
        existing = existing.map(state => {
          const planned = definitions.find(e => e.id === state.exerciseId);
          if (!planned?.routineRevision || state.routineRevision === planned.routineRevision) return state;
          revised = true;
          const count = recorded.filter(set => set.exerciseId === state.exerciseId).length;
          return {
            ...state, targetSets: Math.max(planned.targetSets, count), routineRevision: planned.routineRevision,
            ...(count >= planned.targetSets ? {status: "complete" as const, queuedStatus: undefined} : {}),
          };
        });
        if (!missing.length && !revised) continue;
        let hasCurrent = existing.some(state => state.status === "current");
        let nextOrder = existing.length ? Math.max(...existing.map(state => state.order)) + 1 : 0;
        const additions: WorkoutExerciseState[] = missing.map(exercise => {
          const finished = recorded.filter(set => set.exerciseId === exercise.id).length >= exercise.targetSets;
          const status = finished ? "complete" : hasCurrent ? "todo" : "current";
          if (status === "current") hasCurrent = true;
          return {
            id: `${session.id}:${exercise.id}`,
            sessionId: session.id,
            exerciseId: exercise.id,
            order: nextOrder++,
            status,
            ...(status === "current" ? { queuedStatus: "todo" as const } : {}),
            exerciseName: exercise.name,
            minReps: exercise.minReps,
            maxReps: exercise.maxReps,
            targetSets: exercise.targetSets,
            routineRevision: exercise.routineRevision,
            restSeconds: exercise.restSeconds,
            incrementLb: exercise.incrementLb,
            imageKey: exercise.imageKey,
            defaultWeightLb: exercise.defaultWeightLb,
            defaultWeightEffectiveLocalDate: exercise.defaultWeightEffectiveLocalDate,
          };
        });
        await database.exerciseStates.bulkAdd(additions);
        let order = [...existing, ...additions].sort((a, b) => a.order - b.order);
        if (!order.some(state => state.status === "current")) {
          const next = order.find(state => state.status === "todo") ?? order.find(state => state.status === "deferred");
          if (next) order = jumpToExercise(order, next.id);
        }
        await database.exerciseStates.bulkPut(order);
        await database.sessions.update(session.id, {
          exerciseOrder: [...new Set(order.map(state => state.exerciseId))],
        });
      }
    },
  );
}
