import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { ensureDefaults, WorkoutDatabase } from "../lib/db";
import { DEFAULT_EXERCISES, FRIDAY_EXERCISE_COPIES, workoutExercises } from "../lib/exercises";
import { createBackup, restoreBackup } from "../lib/backup";
import { fillForwardWeight } from "../lib/weight-fill-forward";
import { EXERCISE_GUIDANCE } from "../lib/coaching";
import { reconcileActiveWorkoutPlans } from "../lib/session-repair";
import type { SetRecord, WorkoutSession, WorkoutExerciseState } from "../lib/models";

const now = new Date(2026, 9, 16, 10).getTime();
const monday: WorkoutSession = {id:"monday",workoutType:"monday",status:"completed",startTimestamp:now-4*86400000,localDate:"2026-10-12",exerciseOrder:["leg_press","seated_leg_curl","abdominal_crunch_machine"]};
const record = (exerciseId:string, weight:number, session:WorkoutSession): SetRecord => ({
 id:session.id+":"+exerciseId, sessionId:session.id, exerciseId, exerciseName:exerciseId,
 workoutType:session.workoutType,setNumber:1,actualWeight:weight,weightUnit:"lb",weightKg:weight*0.45359237,actualReps:12,timestamp:session.startTimestamp+1000,
});

it("copies Monday's saved settings and loads once, then keeps both days independent through reload and backup restore",async()=>{
 const db=new WorkoutDatabase("friday-copy-upgrade");
 try {
  await ensureDefaults(db);
  await db.exercises.bulkDelete(Object.keys(FRIDAY_EXERCISE_COPIES));
  await db.exercises.update("leg_press",{targetSets:4,minReps:11,maxReps:16,restSeconds:135,defaultWeightLb:110});
  await db.exercises.update("triceps_press_machine",{defaultWeightLb:35,targetSets:2});
  await db.sessions.add(monday);
  const logs=[record("leg_press",125,monday),record("seated_leg_curl",55,monday),record("abdominal_crunch_machine",45,monday)];
  await db.sets.bulkAdd(logs);
  const before=await createBackup(db);
  await ensureDefaults(db);
  expect(await db.exercises.get("friday_leg_press")).toMatchObject({targetSets:4,minReps:11,maxReps:16,restSeconds:135,defaultWeightLb:125});
  expect(await db.exercises.get("friday_seated_leg_curl")).toMatchObject({targetSets:2,defaultWeightLb:55});
  expect(await db.exercises.get("friday_abdominal_crunch_machine")).toMatchObject({targetSets:2,defaultWeightLb:45});
  for(const original of before.exercises) expect(await db.exercises.get(original.id)).toEqual(original);
  expect(await db.sessions.toArray()).toEqual(before.sessions);
  expect(await db.sets.toArray()).toEqual(before.sets);
  await db.exercises.update("friday_leg_press",{defaultWeightLb:95,targetSets:2});
  await db.exercises.update("leg_press",{defaultWeightLb:130,targetSets:5});
  await ensureDefaults(db);await ensureDefaults(db);
  expect(await db.exercises.get("friday_leg_press")).toMatchObject({defaultWeightLb:95,targetSets:2});
  expect(await db.exercises.get("leg_press")).toMatchObject({defaultWeightLb:130,targetSets:5});
  const backup=await createBackup(db);
  await restoreBackup(db,backup);await ensureDefaults(db);
  expect(await db.exercises.get("friday_leg_press")).toMatchObject({defaultWeightLb:95,targetSets:2});
 }finally {await db.delete();}
});

it.each(Object.entries(FRIDAY_EXERCISE_COPIES))("keeps %s logged weights separate from %s",(copyId,sourceId)=>{
 const friday:WorkoutSession={...monday,id:"friday",workoutType:"friday",startTimestamp:now,localDate:"2026-10-16"};
 const nextMonday:WorkoutSession={...monday,id:"next-monday",status:"active",startTimestamp:now+3*86400000,localDate:"2026-10-19"};
 const nextFriday:WorkoutSession={...friday,id:"next-friday",status:"active",startTimestamp:now+7*86400000,localDate:"2026-10-23"};
 const sessions=[monday,friday,nextMonday,nextFriday];
 const sets=[record(sourceId,75,monday),record(copyId,35,friday)];
 const args={sessions,sets,displayUnit:"lb" as const,programWeightLb:100};
 expect(fillForwardWeight({...args,exerciseId:sourceId,currentSessionId:nextMonday.id}).weight).toBe(75);
 expect(fillForwardWeight({...args,exerciseId:copyId,currentSessionId:nextFriday.id}).weight).toBe(35);
 expect(EXERCISE_GUIDANCE[copyId]).toEqual(EXERCISE_GUIDANCE[sourceId]);
});

it.each([false,true])("prepends copies to unfinished Friday (already started: %s), preserving logs, rest and finished history", async started=>{
 const db=new WorkoutDatabase("friday-queue-"+started);
 try {
  await ensureDefaults(db);
  const session:WorkoutSession={id:"active",workoutType:"friday",status:"active",startTimestamp:now-7*86400000,localDate:"2026-10-09",exerciseOrder:["triceps_press_machine","biceps_curl_machine"],...(started?{activeRestEndTimestamp:now+60000,activeRestExerciseId:"triceps_press_machine"}:{})};
  await db.sessions.add(session);
  const states:WorkoutExerciseState[]=session.exerciseOrder.map((id,order)=>{
   const e=DEFAULT_EXERCISES.find(e=>e.id===id)!;
   return {id:session.id+":"+id,sessionId:session.id,exerciseId:id,order,status:order===0?"current":"todo",exerciseName:e.name,minReps:10,maxReps:15,targetSets:2,restSeconds:105,incrementLb:5,imageKey:e.imageKey};
  });
  await db.exerciseStates.bulkAdd(states);
  if(started)await db.sets.add(record("triceps_press_machine",30,session));
  for(const status of ["completed","archived"] as const){
   await db.sessions.add({...session,id:status,status});
   await db.exerciseStates.bulkAdd(states.map(s=>({...s,id:status+":"+s.exerciseId,sessionId:status})));
  }
  const before=await createBackup(db);
  await reconcileActiveWorkoutPlans(db,now);
  const expectedIds=workoutExercises(DEFAULT_EXERCISES,"friday").map(e=>e.id);
  expect((await db.sessions.get("active"))?.exerciseOrder).toEqual(expectedIds);
  const repaired=(await db.exerciseStates.where("sessionId").equals("active").toArray()).sort((a,b)=>a.order-b.order);
  expect(repaired.map(s=>s.exerciseId)).toEqual(expectedIds);
  expect(repaired.find(s=>s.status==="current")?.exerciseId).toBe(started?"triceps_press_machine":"friday_leg_press");
  expect(repaired[3]).toMatchObject({targetSets:2,restSeconds:105});
  expect((await db.sessions.get("active"))?.activeRestEndTimestamp).toEqual(session.activeRestEndTimestamp);
  expect(await db.sets.toArray()).toEqual(before.sets);
  for(const status of ["completed","archived"]){
   expect(await db.sessions.get(status)).toEqual(before.sessions.find(s=>s.id===status));
   expect(await db.exerciseStates.where("sessionId").equals(status).toArray()).toEqual(before.exerciseStates.filter(s=>s.sessionId===status));
  }
  const once=await createBackup(db);
  await Promise.all([reconcileActiveWorkoutPlans(db,now),reconcileActiveWorkoutPlans(db,now)]);
  expect(await db.exerciseStates.toArray()).toEqual(once.exerciseStates);
 }finally {await db.delete();}
});
