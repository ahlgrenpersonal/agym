
import type { WorkoutType } from "./models";
export type StationId = "leg_press" | "seated_leg_curl" | "abdominal_crunch_machine" | "hip_abduction_adduction";
export interface RoutineEntry { exerciseId: string; station: StationId; targetSets?: number; }
export interface RoutineWorkout { description: string; entries: readonly RoutineEntry[]; }
export interface RoutinePreset {
 name: string; weeklySummary: string; workoutTypes: readonly WorkoutType[];
 workouts: Partial<Record<WorkoutType, RoutineWorkout>>;
}
export const ROUTINE_PRESETS: Record<string, RoutinePreset> = {
 agym_two_day: {
  name: "AGym's Two-Day Routine",
  weeklySummary: "MON · LEGS / THU · ABS + HIPS",
  workoutTypes: ["monday", "thursday"],
  workouts: {
   monday: { description: "2 machines · front + back thighs · glutes · 20–25 min", entries: [{exerciseId:"leg_press",station:"leg_press"}, {exerciseId:"seated_leg_curl",station:"seated_leg_curl"}] },
   thursday: { description: "2 machines · abs + outer hips + inner thighs · 20–25 min", entries: [
    {exerciseId:"abdominal_crunch_machine",station:"abdominal_crunch_machine"},
    {exerciseId:"hip_abduction",station:"hip_abduction_adduction"},
    {exerciseId:"hip_adduction",station:"hip_abduction_adduction"}
   ] }
  }
 }
};
export type RoutinePresetId = keyof typeof ROUTINE_PRESETS;
export const ACTIVE_ROUTINE_ID: RoutinePresetId = "agym_two_day";
export const ACTIVE_ROUTINE = ROUTINE_PRESETS[ACTIVE_ROUTINE_ID];
export const ACTIVE_WORKOUT_TYPES = ACTIVE_ROUTINE.workoutTypes;
export function routineWorkout(type: WorkoutType): RoutineWorkout | undefined { return ACTIVE_ROUTINE.workouts[type]; }
export function routineEntry(type: WorkoutType, id: string): RoutineEntry | undefined {
 return routineWorkout(type)?.entries.find(entry => entry.exerciseId === id);
}
