import type { AppSettings, ExerciseDefinition, ImageCrop, WorkoutType } from "./models";
import { routineWorkout } from "./routine";
export const INFOGRAPHIC_SIZE = {width:1368,height:1824} as const;
export const IMAGE_CROPS: Record<string,ImageCrop> = {
  triceps_press_machine: {
    key: "triceps_press_machine", label: "Triceps Press · gym machine photo",
    x: 65, y: 210, width: 490, height: 1000,
    asset: "machine-triceps-press.jpg", sourceWidth: 590, sourceHeight: 1280,
  },
  biceps_curl_machine: {
    key: "biceps_curl_machine", label: "Biceps Curl · gym machine photo",
    x: 130, y: 265, width: 340, height: 765,
    asset: "machine-biceps-curl.jpg", sourceWidth: 590, sourceHeight: 1280,
  },
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
// Distinct IDs keep Friday settings, suggestions, and records independent.
export const FRIDAY_EXERCISE_COPIES: Readonly<Record<string, string>> = {
  friday_leg_press: "leg_press",
  friday_seated_leg_curl: "seated_leg_curl",
  friday_abdominal_crunch_machine: "abdominal_crunch_machine",
};
const LEGACY_EXERCISES: ExerciseDefinition[] = [
  {
    "id": "leg_press",
    "defaultWeightLb": 100,
    "defaultWeightEffectiveLocalDate": "2026-09-22",
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
    "routineRevision": "split-curls-abs-v1",
    "additionalWorkoutOrders": { "thursday": 3 },
    "defaultWeightLb": 50,
    "defaultWeightEffectiveLocalDate": "2026-09-22",
    "workoutType": "monday",
    "order": 1,
    "name": "Seated Leg Curl",
    "minReps": 10,
    "maxReps": 15,
    "targetSets": 2,
    "restSeconds": 90,
    "incrementLb": 5,
    "imageKey": "seated_leg_curl"
  },
  {
    "id": "abdominal_crunch_machine",
    "routineRevision": "split-curls-abs-v1",
    "additionalWorkoutOrders": { "monday": 2 },
    "defaultWeightLb": 40,
    "workoutType": "thursday",
    "order": 0,
    "name": "Ab Crunch",
    "minReps": 10,
    "maxReps": 15,
    "targetSets": 2,
    "restSeconds": 90,
    "incrementLb": 5,
    "imageKey": "abdominal_crunch_machine"
  },
  {
    "id": "hip_abduction",
    "defaultWeightLb": 50,
    "defaultWeightEffectiveLocalDate": "2026-09-22",
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
    "defaultWeightLb": 50,
    "defaultWeightEffectiveLocalDate": "2026-09-22",
    "workoutType": "thursday",
    "order": 2,
    "name": "Inner Thighs · Knees Together",
    "minReps": 12,
    "maxReps": 15,
    "targetSets": 2,
    "restSeconds": 90,
    "incrementLb": 5,
    "imageKey": "hip_adduction"
  },
  {
    id: "triceps_press_machine", workoutType: "friday", order: 3,
    name: "Triceps Press", minReps: 10, maxReps: 15, targetSets: 3,
    restSeconds: 90, incrementLb: 5, imageKey: "triceps_press_machine",
    defaultWeightLb: 40,
  },
  {
    id: "biceps_curl_machine", workoutType: "friday", order: 4,
    name: "Biceps Curl", minReps: 10, maxReps: 15, targetSets: 2,
    restSeconds: 90, incrementLb: 5, imageKey: "biceps_curl_machine",
    defaultWeightLb: 20,
  },
  {
    id: "friday_leg_press", workoutType: "friday", order: 0,
    name: "Leg Press", minReps: 10, maxReps: 15, targetSets: 3,
    restSeconds: 120, incrementLb: 5, imageKey: "leg_press", defaultWeightLb: 100,
  },
  {
    id: "friday_seated_leg_curl", workoutType: "friday", order: 1,
    name: "Seated Leg Curl", minReps: 10, maxReps: 15, targetSets: 2,
    restSeconds: 90, incrementLb: 5, imageKey: "seated_leg_curl", defaultWeightLb: 50,
  },
  {
    id: "friday_abdominal_crunch_machine", workoutType: "friday", order: 2,
    name: "Ab Crunch", minReps: 10, maxReps: 15, targetSets: 2,
    restSeconds: 90, incrementLb: 5, imageKey: "abdominal_crunch_machine", defaultWeightLb: 40,
  }
];
// New plan IDs retain the old weekday snapshots and independent weight histories.
export const BALANCED_EXERCISE_SOURCES: Readonly<Record<string, string>> = {
 a_leg_press: "leg_press", a_seated_leg_curl: "seated_leg_curl",
 a_ab_crunch: "abdominal_crunch_machine", b_triceps_press: "triceps_press_machine",
 b_ab_crunch: "friday_abdominal_crunch_machine", b_inner_thighs: "hip_adduction",
 b_biceps_curl: "biceps_curl_machine", c_leg_press: "friday_leg_press",
 c_seated_leg_curl: "friday_seated_leg_curl", c_outer_hips: "hip_abduction",
};
const BALANCED_PLAN: readonly [string, WorkoutType, number, number][] = [
 ["a_leg_press", "day_a", 0, 3], ["a_seated_leg_curl", "day_a", 1, 3], ["a_ab_crunch", "day_a", 2, 3],
 ["b_triceps_press", "day_b", 0, 3], ["b_ab_crunch", "day_b", 1, 3],
 ["b_inner_thighs", "day_b", 2, 2], ["b_biceps_curl", "day_b", 3, 2],
 ["c_leg_press", "day_c", 0, 3], ["c_seated_leg_curl", "day_c", 1, 3], ["c_outer_hips", "day_c", 2, 2],
];
export const DEFAULT_EXERCISES: ExerciseDefinition[] = [
 ...LEGACY_EXERCISES,
 ...BALANCED_PLAN.map(([id,workoutType,order,targetSets]) => {
  const source=LEGACY_EXERCISES.find(e=>e.id===BALANCED_EXERCISE_SOURCES[id])!;
  return {id,workoutType,order,targetSets,name:source.name,minReps:source.minReps,maxReps:source.maxReps,
   restSeconds:source.restSeconds,incrementLb:source.incrementLb,imageKey:source.imageKey,defaultWeightLb:source.defaultWeightLb};
 }),
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
