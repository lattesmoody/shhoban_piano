'use server';

import { revalidatePath } from 'next/cache';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';
import { deleteDrumStatus, setAllDrumEmpty } from '@/app/lib/sql/maps/drumRoomQueries';
import {
  selectDrumRoomForExit,
  updateActualOutTime,
} from '@/app/lib/sql/maps/exitQueries';

const roomSchema = z.number().int().min(1).max(9999);

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL 환경변수가 필요합니다.');
  return neon(url);
}

export async function deleteStatus(roomNo: number) {
  const parsed = roomSchema.safeParse(Number(roomNo));
  if (!parsed.success) throw new Error('잘못된 드럼실 번호입니다.');
  const sql = getSql();
  
  console.log(`\n🔄 드럼실 ${parsed.data}번 퇴실 처리 시작...`);
  
  try {
    // 1. 현재 방 상태 조회
    const roomData = await selectDrumRoomForExit(sql, parsed.data);
    
    if (roomData && roomData.student_id) {
      console.log(`📊 방 정보: 학생ID=${roomData.student_id}, 이름=${roomData.student_name}`);
      
      // 2. student_attendance 테이블에 actual_out_time 업데이트
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      
      console.log(`📝 출석 기록 업데이트: actual_out_time=${now.toISOString()}`);
      await updateActualOutTime(sql, now.toISOString(), roomData.student_id, today);
      console.log('✅ 출석 기록 actual_out_time 업데이트 완료');
    } else {
      console.log('ℹ️ 빈 방이므로 출석 기록 업데이트 불필요');
    }
    
    // 3. 방 초기화
    await deleteDrumStatus(sql, parsed.data);
    console.log('✅ 드럼실 초기화 완료');
    
  } catch (error) {
    console.error('❌ 퇴실 처리 오류:', error);
    throw error;
  }
  
  revalidatePath('/drumroom_manage');
  return { ok: true } as const;
}

export async function makeAllEmpty() {
  const sql = getSql();
  await setAllDrumEmpty(sql);
  revalidatePath('/drumroom_manage');
  return { ok: true } as const;
}


