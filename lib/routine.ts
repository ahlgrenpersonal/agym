
import type { WorkoutType } from "./models";
export type StationId = "leg_press" | "seated_leg_curl" | "abdominal_crunch_machine" | "hip_abduction_adduction" | "triceps_press_machine" | "biceps_curl_machine";
export interface RoutineEntry { exerciseId: string; station: StationId; targetSets?: number; }
export interface RoutineWorkout { description: string; entries: readonly RoutineEntry[]; }
export interface RoutinePreset {
 name: string; weeklySummary: string; workoutTypes: readonly WorkoutType[];
 workouts: Partial<Record<WorkoutType, RoutineWorkout>>;
}
export const ROUTINE_PRESETS: Record<string, RoutinePreset> = {
 balanced_abc: {
  name: "AGym's Balanced Three-Day Routine",
  weeklySummary: "DAY A · 9 SETS / DAY B · 10 SETS / DAY C · 8 SETS",
  workoutTypes: ["day_a", "day_b", "day_c"],
  workouts: {
   day_a: { description: "3 machines · legs + abs · 9 sets", entries: [
    {exerciseId:"a_leg_press",station:"leg_press"},
    {exerciseId:"a_seated_leg_curl",station:"seated_leg_curl"},
    {exerciseId:"a_ab_crunch",station:"abdominal_crunch_machine"}
   ] },
   day_b: { description: "4 machines · arms + abs + inner thighs · 10 sets", entries: [
    {exerciseId:"b_triceps_press",station:"triceps_press_machine"},
    {exerciseId:"b_ab_crunch",station:"abdominal_crunch_machine"},
    {exerciseId:"b_inner_thighs",station:"hip_abduction_adduction"},
    {exerciseId:"b_biceps_curl",station:"biceps_curl_machine"}
   ] },
   day_c: { description: "3 machines · legs + outer hips · 8 sets", entries: [
    {exerciseId:"c_leg_press",station:"leg_press"},
    {exerciseId:"c_seated_leg_curl",station:"seated_leg_curl"},
    {exerciseId:"c_outer_hips",station:"hip_abduction_adduction"}
   ] }
  }
 },
 agym_three_day: {
  name: "AGym's Three-Day Routine",
  weeklySummary: "MON · LEGS + ABS / THU · ABS + HIPS + CURLS / FRI · LEGS + ABS + ARMS",
  workoutTypes: ["monday", "thursday", "friday"],
  workouts: {
   monday: { description: "3 machines · legs + abs · 20–25 min", entries: [{exerciseId:"leg_press",station:"leg_press"}, {exerciseId:"seated_leg_curl",station:"seated_leg_curl"}, {exerciseId:"abdominal_crunch_machine",station:"abdominal_crunch_machine"}] },
   thursday: { description: "3 machines · abs + hips + back thighs · 20–25 min", entries: [
    {exerciseId:"abdominal_crunch_machine",station:"abdominal_crunch_machine"},
    {exerciseId:"hip_abduction",station:"hip_abduction_adduction"},
    {exerciseId:"hip_adduction",station:"hip_abduction_adduction"},
    {exerciseId:"seated_leg_curl",station:"seated_leg_curl"}
   ] },
   friday: { description: "5 machines · legs + abs + arms · 35–45 min", entries: [
    {exerciseId:"friday_leg_press",station:"leg_press"},
    {exerciseId:"friday_seated_leg_curl",station:"seated_leg_curl"},
    {exerciseId:"friday_abdominal_crunch_machine",station:"abdominal_crunch_machine"},
    {exerciseId:"triceps_press_machine",station:"triceps_press_machine"},
    {exerciseId:"biceps_curl_machine",station:"biceps_curl_machine"}
   ] }
  }
 }
};
export type RoutinePresetId = keyof typeof ROUTINE_PRESETS;
export const ACTIVE_ROUTINE_ID: RoutinePresetId = "balanced_abc";
export const ACTIVE_ROUTINE = ROUTINE_PRESETS[ACTIVE_ROUTINE_ID];
export const ACTIVE_WORKOUT_TYPES = ACTIVE_ROUTINE.workoutTypes;
export function routineWorkout(type: WorkoutType): RoutineWorkout | undefined { return ACTIVE_ROUTINE.workouts[type] ?? ROUTINE_PRESETS.agym_three_day.workouts[type]; }
export function routineEntry(type: WorkoutType, id: string): RoutineEntry | undefined {
 return routineWorkout(type)?.entries.find(entry => entry.exerciseId === id);
}
