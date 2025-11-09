'use server';

import { revalidatePath } from 'next/cache';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';
import {
  deleteKinderStatus,
  activateKinderStatus,
  deactivateKinderStatus,
  setAllKinderEmpty,
  setAllKinderLecture,
} from '@/app/lib/sql/maps/kinderRoomQueries';
import {
  selectKinderRoomForExit,
  updateActualOutTime,
} from '@/app/lib/sql/maps/exitQueries';
import {
  selectWaitingQueue,
  removeFromWaitingQueue,
  reorderWaitingQueue,
} from '@/app/lib/sql/maps/waitingQueueQueries';
import { processEntrance } from '@/app/main/actions';

const roomSchema = z.number().int().min(1).max(9999);

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL 환경변수가 필요합니다.');
  return neon(url);
}

export async function deleteStatus(roomNo: number) {
  const parsed = roomSchema.safeParse(Number(roomNo));
  if (!parsed.success) throw new Error('잘못된 유치부실 번호입니다.');
  const sql = getSql();
  
  console.log(`\n🔄 유치부실 ${parsed.data}번 퇴실 처리 시작...`);
  
  try {
    // 1. 현재 방 상태 조회
    const roomData = await selectKinderRoomForExit(sql, parsed.data);
    
    if (roomData && roomData.student_id) {
      console.log(`📊 방 정보: 학생ID=${roomData.student_id}, 이름=${roomData.student_name}`);
      
      // 2. student_attendance 테이블에 actual_out_time 업데이트
      const now = new Date();
      // KST 시간으로 변환 (UTC+9)
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstTime = new Date(now.getTime() + kstOffset);
      const today = kstTime.toISOString().slice(0, 10);
      
      console.log(`📝 출석 기록 업데이트: actual_out_time=${kstTime.toISOString()}`);
      await updateActualOutTime(sql, kstTime.toISOString(), roomData.student_id, today);
      console.log('✅ 출석 기록 actual_out_time 업데이트 완료');
    } else {
      console.log('ℹ️ 빈 방이므로 출석 기록 업데이트 불필요');
    }
    
    // 3. 방 초기화
    await deleteKinderStatus(sql, parsed.data);
    console.log('✅ 유치부실 초기화 완료');
    
    // 4. 대기열 확인 및 자동 입실 처리
    console.log('\n🔍 유치부 대기열 확인 중...');
    try {
      const kinderQueue = await selectWaitingQueue(sql, 'kinder');
      
      if (kinderQueue && kinderQueue.length > 0) {
        // 대기열의 첫 번째 학생
        const firstInQueue = kinderQueue[0];
        console.log(`👤 대기열 첫 번째 학생: ${firstInQueue.student_name} (ID: ${firstInQueue.student_id})`);
        
        // 자동 입실 처리
        console.log('🚪 자동 입실 처리 중...');
        const entranceResult = await processEntrance(firstInQueue.student_id);
        console.log(`✅ 자동 입실 완료: ${entranceResult}`);
      } else {
        console.log('ℹ️ 유치부 대기열이 비어있습니다.');
      }
    } catch (queueError) {
      console.error('⚠️ 대기열 처리 중 오류 (계속 진행):', queueError);
      // 대기열 처리 실패해도 퇴실은 완료되었으므로 오류를 throw하지 않음
    }
    
  } catch (error) {
    console.error('❌ 퇴실 처리 오류:', error);
    throw error;
  }
  
  revalidatePath('/kinderroom_manage');
  revalidatePath('/main'); // 메인 페이지도 새로고침
  return { ok: true } as const;
}

export async function activateStatus(roomNo: number) {
  const parsed = roomSchema.safeParse(Number(roomNo));
  if (!parsed.success) throw new Error('잘못된 유치부실 번호입니다.');
  const sql = getSql();
  await activateKinderStatus(sql, parsed.data);
  revalidatePath('/kinderroom_manage');
  return { ok: true } as const;
}

export async function deactivateStatus(roomNo: number) {
  const parsed = roomSchema.safeParse(Number(roomNo));
  if (!parsed.success) throw new Error('잘못된 유치부실 번호입니다.');
  const sql = getSql();
  await deactivateKinderStatus(sql, parsed.data);
  revalidatePath('/kinderroom_manage');
  return { ok: true } as const;
}

export async function makeAllEmpty() {
  const sql = getSql();
  await setAllKinderEmpty(sql);
  revalidatePath('/kinderroom_manage');
  return { ok: true } as const;
}

export async function makeAllLecture() {
  const sql = getSql();
  await setAllKinderLecture(sql);
  revalidatePath('/kinderroom_manage');
  return { ok: true } as const;
}


