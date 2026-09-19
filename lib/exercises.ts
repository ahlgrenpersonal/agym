import type { AppSettings, ExerciseDefinition, ImageCrop, WorkoutType } from "./models";
import { routineWorkout } from "./routine";
export const INFOGRAPHIC_SIZE = {width:1368,height:1824} as const;
export const IMAGE_CROPS: Record<string,ImageCrop> = {
  "leg_press": {
    "key": "leg_press",
    "label": "Leg Press · photo of AGym’s gym machine",
    "x": 0,
    "y": 0,
    "width": 1368,
    "height": 1824,
    "asset": "machine-leg-press.jpg",
    "sourceWidth": 1368,
    "sourceHeight": 1824
  },
  "seated_leg_curl": {
    "key": "seated_leg_curl",
    "label": "Seated Leg Curl · photo of AGym’s gym machine",
    "x": 0,
    "y": 0,
    "width": 1368,
    "height": 1824,
    "asset": "machine-seated-leg-curl.jpg",
    "sourceWidth": 1368,
    "sourceHeight": 1824
  },
  "abdominal_crunch_machine": {
    "key": "abdominal_crunch_machine",
    "label": "Ab Crunch · photo of AGym’s gym machine",
    "x": 0,
    "y": 0,
    "width": 1368,
    "height": 1824,
    "asset": "machine-abdominal-crunch-machine.jpg",
    "sourceWidth": 1368,
    "sourceHeight": 1824
  },
  "hip_abduction": {
    "key": "hip_abduction",
    "label": "Outer Hips · Knees Apart · photo of AGym’s gym machine",
    "x": 0,
    "y": 0,
    "width": 1368,
    "height": 1824,
    "asset": "machine-hip-abduction-adduction.jpg",
    "sourceWidth": 1368,
    "sourceHeight": 1824
  },
  "hip_adduction": {
    "key": "hip_adduction",
    "label": "Inner Thighs · Knees Together · photo of AGym’s gym machine",
    "x": 0,
    "y": 0,
    "width": 1368,
    "height": 1824,
    "asset": "machine-hip-abduction-adduction.jpg",
    "sourceWidth": 1368,
    "sourceHeight": 1824
  }
};
export const RETIRED_EXERCISE_IDS: readonly string[] = [];
export const DEFAULT_EXERCISES: ExerciseDefinition[] = [
  {
    "id": "leg_press",
    "workoutType": "monday",
    "order": 0,
    "name": "Leg Press",
    "minReps": 10,
    "maxReps": 15,
    "targetSets": 3,
    "restSeconds": 120,
    "incrementLb": 5,
    "imageKey": "leg_press"
  },
  {
    "id": "seated_leg_curl",
    "workoutType": "monday",
    "order": 1,
    "name": "Seated Leg Curl",
    "minReps": 10,
    "maxReps": 15,
    "targetSets": 4,
    "restSeconds": 90,
    "incrementLb": 5,
    "imageKey": "seated_leg_curl"
  },
  {
    "id": "abdominal_crunch_machine",
    "workoutType": "thursday",
    "order": 0,
    "name": "Ab Crunch",
    "minReps": 10,
    "maxReps": 15,
    "targetSets": 4,
    "restSeconds": 90,
    "incrementLb": 5,
    "imageKey": "abdominal_crunch_machine"
  },
  {
    "id": "hip_abduction",
    "workoutType": "thursday",
    "order": 1,
    "name": "Outer Hips · Knees Apart",
    "minReps": 12,
    "maxReps": 15,
    "targetSets": 2,
    "restSeconds": 90,
    "incrementLb": 5,
    "imageKey": "hip_abduction"
  },
  {
    "id": "hip_adduction",
    "workoutType": "thursday",
    "order": 2,
    "name": "Inner Thighs · Knees Together",
    "minReps": 12,
    "maxReps": 15,
    "targetSets": 2,
    "restSeconds": 90,
    "incrementLb": 5,
    "imageKey": "hip_adduction"
  }
];
export function exerciseOrderForWorkout(
  exercise: ExerciseDefinition,
  workoutType: WorkoutType,
): number | undefined {
  const plannedOrder = routineWorkout(workoutType)?.entries.findIndex(
    (entry) => entry.exerciseId === exercise.id,
  );
  if (plannedOrder !== undefined && plannedOrder >= 0) return plannedOrder;
  return exercise.workoutType === workoutType
    ? exercise.order
    : exercise.additionalWorkoutOrders?.[workoutType];
}

export function workoutExercises(
  exercises: ExerciseDefinition[],
  workoutType: WorkoutType,
): ExerciseDefinition[] {
  const plannedWorkout = routineWorkout(workoutType);
  if (plannedWorkout) {
    return plannedWorkout.entries.flatMap((entry, order) => {
      const exercise = exercises.find((item) => item.id === entry.exerciseId);
      if (!exercise) return [];
      return [
        {
          ...exercise,
          order,
          targetSets: entry.targetSets ?? exercise.targetSets,
        },
      ];
    });
  }
  return exercises
    .filter(
      (exercise) =>
        exerciseOrderForWorkout(exercise, workoutType) !== undefined,
    )
    .sort(
      (a, b) =>
        exerciseOrderForWorkout(a, workoutType)! -
        exerciseOrderForWorkout(b, workoutType)!,
    );
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: "settings",
  weightUnit: "lb",
};
