import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { WorkoutDatabase, ensureDefaults } from "../lib/db";
import { DEFAULT_EXERCISES, workoutExercises } from "../lib/exercises";
import { reconcileActiveWorkoutPlans } from "../lib/session-repair";
import { localDateKey } from "../lib/local-date";
import type { WorkoutExerciseState, WorkoutSession } from "../lib/models";

it('migrates the old four-set definitions once and preserves later customization', async () => {
 const db=new WorkoutDatabase('split-definitions');
 try {
  await ensureDefaults(db);
  for(const id of ['seated_leg_curl','abdominal_crunch_machine']) await db.exercises.update(id,{targetSets:4,routineRevision:undefined,additionalWorkoutOrders:undefined});
  await ensureDefaults(db);
  const definitions=await db.exercises.toArray();
  for(const id of ['seated_leg_curl','abdominal_crunch_machine']) {
   const weekly=['monday','thursday'].map(day=>workoutExercises(definitions,day as 'monday'|'thursday').find(e=>e.id===id)!.targetSets);
   expect(weekly).toEqual([2,2]);
  }
  await db.exercises.update('seated_leg_curl',{targetSets:1});
  await ensureDefaults(db);
  expect((await db.exercises.get('seated_leg_curl'))?.targetSets).toBe(1);
 } finally {await db.delete();}
});

it.each(['monday','thursday'] as const)('repairs an old %s queue, preserving logs and completed history', async day=>{
 const db=new WorkoutDatabase('split-session-'+day);
 const now=new Date(2026,8,24,10).getTime();
 try {
  await ensureDefaults(db);
  const exerciseId=day==='monday'?'seated_leg_curl':'abdominal_crunch_machine';
  const definition=DEFAULT_EXERCISES.find(e=>e.id===exerciseId)!;
  const session:WorkoutSession={id:'old',workoutType:day,status:'active',startTimestamp:now-1000,localDate:localDateKey(now),exerciseOrder:[exerciseId],activeRestEndTimestamp:now+90000};
  const state:WorkoutExerciseState={...definition,id:'old:'+exerciseId,sessionId:'old',exerciseId,exerciseName:definition.name,order:0,status:'current',targetSets:4,routineRevision:undefined};
  await db.sessions.add(session);await db.exerciseStates.add(state);
  const logs=[1,2].map(n=>({id:'set-'+n,sessionId:'old',workoutType:day,exerciseId,exerciseName:definition.name,setNumber:n,actualWeight:40,weightUnit:'lb' as const,weightKg:18.1436948,actualReps:12,timestamp:now-100+n}));
  await db.sets.bulkAdd(logs);
  await db.sessions.add({...session,id:'completed',status:'completed'});
  await db.exerciseStates.add({...state,id:'completed:'+exerciseId,sessionId:'completed',status:'complete'});
  await reconcileActiveWorkoutPlans(db,now);
  expect(await db.exerciseStates.get(state.id)).toMatchObject({targetSets:2,status:'complete'});
  const states=await db.exerciseStates.where('sessionId').equals('old').toArray();
  const shared=states.filter(s=>['seated_leg_curl','abdominal_crunch_machine'].includes(s.exerciseId));
  expect(shared).toHaveLength(2);expect(shared.every(s=>s.targetSets===2)).toBe(true);
  expect(states.filter(s=>s.status==='current')).toHaveLength(1);
  expect(await db.sets.toArray()).toEqual(logs);
  expect((await db.sessions.get('old'))?.activeRestEndTimestamp).toBe(session.activeRestEndTimestamp);
  expect(await db.exerciseStates.get('completed:'+exerciseId)).toMatchObject({targetSets:4,status:'complete',routineRevision:undefined});
  await reconcileActiveWorkoutPlans(db,now);
  expect(await db.exerciseStates.where('sessionId').equals('old').toArray()).toEqual(states);
 } finally {await db.delete();}
});
