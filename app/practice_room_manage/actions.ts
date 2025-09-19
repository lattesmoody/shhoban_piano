'use server';

import { revalidatePath } from 'next/cache';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';
import {
  activatePracticeStatus,
  deletePracticeStatus,
  deactivatePracticeStatus,
  setAllEmpty,
  setAllLecture,
} from '@/app/lib/sql/maps/practiceRoomQueries';

const roomSchema = z.number().int().min(1).max(9999);

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL 환경변수가 필요합니다.');
  return neon(url);
}

export async function deleteStatus(roomNo: number) {
  const parsed = roomSchema.safeParse(Number(roomNo));
  if (!parsed.success) throw new Error('잘못된 연습실 번호입니다.');
  const sql = getSql();
  await deletePracticeStatus(sql, parsed.data);
  revalidatePath('/practice_room_manage');
  return { ok: true } as const;
}

export async function activateStatus(roomNo: number) {
  const parsed = roomSchema.safeParse(Number(roomNo));
  if (!parsed.success) throw new Error('잘못된 연습실 번호입니다.');
  const sql = getSql();
  await activatePracticeStatus(sql, parsed.data);
  revalidatePath('/practice_room_manage');
  return { ok: true } as const;
}

export async function deactivateStatus(roomNo: number) {
  const parsed = roomSchema.safeParse(Number(roomNo));
  if (!parsed.success) throw new Error('잘못된 연습실 번호입니다.');
  const sql = getSql();
  await deactivatePracticeStatus(sql, parsed.data);
  revalidatePath('/practice_room_manage');
  return { ok: true } as const;
}

export async function makeAllEmpty() {
  const sql = getSql();
  await setAllEmpty(sql);
  revalidatePath('/practice_room_manage');
  return { ok: true } as const;
}

export async function makeAllLecture() {
  const sql = getSql();
  await setAllLecture(sql);
  revalidatePath('/practice_room_manage');
  return { ok: true } as const;
}


