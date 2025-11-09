'use server';

import { revalidatePath } from 'next/cache';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';
import {
  deleteTheoryStatus as deleteTheoryStatusQuery,
  setAllTheoryEmpty,
} from '@/app/lib/sql/maps/theoryRoomQueries';

const roomSchema = z.number().int().min(1).max(99999);

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL 환경변수가 필요합니다.');
  return neon(url);
}

// 이론실 특정 방 퇴실 처리
export async function deleteTheoryStatus(roomNo: number) {
  const parsed = roomSchema.safeParse(Number(roomNo));
  if (!parsed.success) throw new Error('잘못된 이론실 번호입니다.');
  const sql = getSql();
  await deleteTheoryStatusQuery(sql, parsed.data);
  revalidatePath('/theoryroom_manage');
  return { ok: true } as const;
}

// 이론실 전체 공실 처리
export async function makeAllTheoryEmpty() {
  const sql = getSql();
  await setAllTheoryEmpty(sql);
  revalidatePath('/theoryroom_manage');
  return { ok: true } as const;
}

