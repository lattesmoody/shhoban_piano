'use server';

import { revalidatePath } from 'next/cache';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';
import { deleteDrumStatus, setAllDrumEmpty } from '@/app/lib/sql/maps/drumRoomQueries';
import {
  selectDrumRoomForExit,
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
  if (!parsed.success) throw new Error('잘못된 드럼실 번호입니다.');
  const sql = getSql();
  
  //console.log(`\n🔄 드럼실 ${parsed.data}번 퇴실 처리 시작...`);
  
  try {
    // 1. 현재 방 상태 조회
    const roomData = await selectDrumRoomForExit(sql, parsed.data);
    
    if (roomData && roomData.student_id) {
      //console.log(`📊 방 정보: 학생ID=${roomData.student_id}, 이름=${roomData.student_name}`);
      
      // 2. student_attendance 테이블에 actual_out_time 업데이트
      const now = new Date();
      // KST 시간으로 변환 (UTC+9)
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstTime = new Date(now.getTime() + kstOffset);
      const today = kstTime.toISOString().slice(0, 10);
      
      //console.log(`📝 출석 기록 업데이트: actual_out_time=${kstTime.toISOString()}`);
      await updateActualOutTime(sql, kstTime.toISOString(), roomData.student_id, today);
      //console.log('✅ 출석 기록 actual_out_time 업데이트 완료');
    } else {
      //console.log('ℹ️ 빈 방이므로 출석 기록 업데이트 불필요');
    }
    
    // 3. 방 초기화
    await deleteDrumStatus(sql, parsed.data);
    //console.log('✅ 드럼실 초기화 완료');
    
    // 4. 대기열 확인 및 자동 입실 처리
    //console.log('\n🔍 드럼 대기열 확인 중...');
    try {
      const drumQueue = await selectWaitingQueue(sql, 'drum');
      
      if (drumQueue && drumQueue.length > 0) {
        // 대기열의 첫 번째 학생
        const firstInQueue = drumQueue[0];
        //console.log(`👤 대기열 첫 번째 학생: ${firstInQueue.student_name} (ID: ${firstInQueue.student_id})`);
        
        // 자동 입실 처리
        //console.log('🚪 자동 입실 처리 중...');
        const entranceResult = await processEntrance(firstInQueue.student_id);
        //console.log(`✅ 자동 입실 완료: ${entranceResult}`);
      } else {
        //console.log('ℹ️ 드럼 대기열이 비어있습니다.');
      }
    } catch (queueError) {
      console.error('⚠️ 대기열 처리 중 오류 (계속 진행):', queueError);
      // 대기열 처리 실패해도 퇴실은 완료되었으므로 오류를 throw하지 않음
    }
    
  } catch (error) {
    console.error('❌ 퇴실 처리 오류:', error);
    throw error;
  }
  
  revalidatePath('/drumroom_manage');
  revalidatePath('/main'); // 메인 페이지도 새로고침
  return { ok: true } as const;
}

export async function makeAllEmpty() {
  const sql = getSql();
  
  //console.log('\n🔄 드럼실 전체 공실 처리 시작...');
  
  try {
    // 1. 모든 방 비우기 전에 입실 중인 학생들의 actual_out_time 업데이트
    const allRooms = await sql`
      SELECT room_no, student_id, student_name 
      FROM drum_room_status 
      WHERE student_id IS NOT NULL
    `;
    
    //console.log(`📊 현재 입실 중인 드럼실: ${allRooms.length}개`);
    
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstTime = new Date(now.getTime() + kstOffset);
    const today = kstTime.toISOString().slice(0, 10);
    
    for (const room of allRooms) {
      if (room.student_id) {
        //console.log(`  방 ${room.room_no}: ${room.student_name} - actual_out_time 업데이트`);
        await updateActualOutTime(sql, kstTime.toISOString(), room.student_id, today);
      }
    }
    
    // 2. 모든 방 비우기
    await setAllDrumEmpty(sql);
    //console.log('✅ 드럼실 전체 공실 처리 완료');
    
    // 3. 대기열 확인 및 자동 입실 처리
    //console.log('\n🔍 드럼 대기열 확인 중...');
    try {
      const drumQueue = await selectWaitingQueue(sql, 'drum');
      
      if (drumQueue && drumQueue.length > 0) {
        //console.log(`👥 드럼 대기열: ${drumQueue.length}명`);
        
        for (const student of drumQueue) {
          //console.log(`\n🚪 ${student.student_name} 자동 입실 시도...`);
          try {
            const entranceResult = await processEntrance(student.student_id);
            //console.log(`✅ ${student.student_name}: ${entranceResult}`);
          } catch (error) {
            console.error(`⚠️ ${student.student_name} 입실 실패:`, error);
          }
        }
      } else {
        //console.log('ℹ️ 드럼 대기열이 비어있습니다.');
      }
    } catch (queueError) {
      console.error('⚠️ 대기열 처리 중 오류 (계속 진행):', queueError);
    }
    
  } catch (error) {
    console.error('❌ 전체 공실 처리 오류:', error);
    throw error;
  }
  
  revalidatePath('/drumroom_manage');
  revalidatePath('/main');
  return { ok: true } as const;
}


