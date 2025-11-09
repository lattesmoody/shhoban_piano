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
import {
  selectPracticeRoomForExit,
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
  if (!parsed.success) throw new Error('잘못된 연습실 번호입니다.');
  const sql = getSql();
  
  console.log(`\n🔄 연습실 ${parsed.data}번 퇴실 처리 시작...`);
  
  try {
    // 1. 현재 방 상태 조회
    const roomData = await selectPracticeRoomForExit(sql, parsed.data);
    
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
    await deletePracticeStatus(sql, parsed.data);
    console.log('✅ 연습실 초기화 완료');
    
    // 4. 대기열 확인 및 자동 입실 처리
    console.log('\n🔍 대기열 확인 중...');
    try {
      const pianoQueue = await selectWaitingQueue(sql, 'piano');
      
      if (pianoQueue && pianoQueue.length > 0) {
        // 대기열의 첫 번째 학생
        const firstInQueue = pianoQueue[0];
        console.log(`👤 대기열 첫 번째 학생: ${firstInQueue.student_name} (ID: ${firstInQueue.student_id})`);
        
        // 자동 입실 처리
        console.log('🚪 자동 입실 처리 중...');
        const entranceResult = await processEntrance(firstInQueue.student_id);
        console.log(`✅ 자동 입실 완료: ${entranceResult}`);
      } else {
        console.log('ℹ️ 대기열이 비어있습니다.');
      }
    } catch (queueError) {
      console.error('⚠️ 대기열 처리 중 오류 (계속 진행):', queueError);
      // 대기열 처리 실패해도 퇴실은 완료되었으므로 오류를 throw하지 않음
    }
    
  } catch (error) {
    console.error('❌ 퇴실 처리 오류:', error);
    throw error;
  }
  
  revalidatePath('/practice_room_manage');
  revalidatePath('/main'); // 메인 페이지도 새로고침
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
  
  console.log('\n🔄 전체 공실 처리 시작...');
  
  try {
    // 1. 모든 방 비우기 전에 입실 중인 학생들의 actual_out_time 업데이트
    const occupiedRooms = await selectPracticeRoomForExit(sql, 0); // 모든 방 조회용
    const allRooms = await sql`
      SELECT room_no, student_id, student_name 
      FROM practice_room_status 
      WHERE student_id IS NOT NULL
    `;
    
    console.log(`📊 현재 입실 중인 방: ${allRooms.length}개`);
    
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstTime = new Date(now.getTime() + kstOffset);
    const today = kstTime.toISOString().slice(0, 10);
    
    for (const room of allRooms) {
      if (room.student_id) {
        console.log(`  방 ${room.room_no}: ${room.student_name} - actual_out_time 업데이트`);
        await updateActualOutTime(sql, kstTime.toISOString(), room.student_id, today);
      }
    }
    
    // 2. 모든 방 비우기
    await setAllEmpty(sql);
    console.log('✅ 전체 공실 처리 완료');
    
    // 3. 대기열 확인 및 자동 입실 처리
    console.log('\n🔍 대기열 확인 중...');
    try {
      const pianoQueue = await selectWaitingQueue(sql, 'piano');
      
      if (pianoQueue && pianoQueue.length > 0) {
        console.log(`👥 피아노 대기열: ${pianoQueue.length}명`);
        
        // 대기열의 모든 학생을 순차적으로 입실 처리
        for (const student of pianoQueue) {
          console.log(`\n🚪 ${student.student_name} 자동 입실 시도...`);
          try {
            const entranceResult = await processEntrance(student.student_id);
            console.log(`✅ ${student.student_name}: ${entranceResult}`);
          } catch (error) {
            console.error(`⚠️ ${student.student_name} 입실 실패:`, error);
            // 한 명 실패해도 다음 학생 계속 처리
          }
        }
      } else {
        console.log('ℹ️ 대기열이 비어있습니다.');
      }
    } catch (queueError) {
      console.error('⚠️ 대기열 처리 중 오류 (계속 진행):', queueError);
    }
    
  } catch (error) {
    console.error('❌ 전체 공실 처리 오류:', error);
    throw error;
  }
  
  revalidatePath('/practice_room_manage');
  revalidatePath('/main');
  return { ok: true } as const;
}

export async function makeAllLecture() {
  const sql = getSql();
  await setAllLecture(sql);
  revalidatePath('/practice_room_manage');
  return { ok: true } as const;
}


