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
import { selectTheoryStatus } from '@/app/lib/sql/maps/theoryRoomQueries';
import { processEntrance } from '@/app/main/actions';
import { normalizePlaceholderForEnv } from '@/app/lib/sql/utils';

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
    
    // 4. 대기열 및 이론실 확인하여 자동 입실 처리
    console.log('\n🔍 자동 입실 대상 확인 중...');
    try {
      // 4-1. 이론실에 있는 일반 학생 확인 (유치부 제외)
      const theoryRooms = await selectTheoryStatus(sql);
      let theoryStudent = null;
      
      for (const room of theoryRooms) {
        if (room.student_id && room.student_name) {
          // 학생 정보 조회
          const studentSql = normalizePlaceholderForEnv(process.env.SELECT_STUDENT_BY_ID_SQL);
          if (studentSql) {
            const studentRes: any = await (sql as any).query(studentSql, [room.student_id]);
            const student = Array.isArray(studentRes) ? studentRes[0] : (studentRes?.rows?.[0] ?? null);
            
            if (student && student.student_grade !== 1 && student.student_grade !== '1') {
              // 일반 학생 (유치부 아님)
              theoryStudent = {
                student_id: room.student_id,
                student_name: room.student_name,
                room_no: room.room_no
              };
              break; // 첫 번째 일반 학생만
            }
          }
        }
      }
      
      // 4-2. 이론실 학생이 있으면 우선 입실
      if (theoryStudent) {
        console.log(`👤 이론실 대기 학생: ${theoryStudent.student_name} (이론실 ${theoryStudent.room_no}번)`);
        
        // 이론실 먼저 비우기
        console.log('🔄 이론실 퇴실 처리 중...');
        await (sql as any)`
          UPDATE theory_room_status 
          SET student_id = NULL, 
              student_name = NULL, 
              in_time = NULL, 
              out_time = NULL,
              actual_out_time = NULL
          WHERE room_no = ${theoryStudent.room_no}
        `;
        console.log('✅ 이론실 퇴실 완료');
        
        // 연습실로 입실
        console.log('🚪 이론실 → 연습실 자동 입실 처리 중...');
        const entranceResult = await processEntrance(theoryStudent.student_id);
        console.log(`✅ 자동 입실 완료: ${entranceResult}`);
      } else {
        // 4-3. 이론실 학생이 없으면 대기열 확인
        const pianoQueue = await selectWaitingQueue(sql, 'piano');
        
        if (pianoQueue && pianoQueue.length > 0) {
          const firstInQueue = pianoQueue[0];
          console.log(`👤 대기열 첫 번째 학생: ${firstInQueue.student_name} (ID: ${firstInQueue.student_id})`);
          console.log('🚪 자동 입실 처리 중...');
          const entranceResult = await processEntrance(firstInQueue.student_id);
          console.log(`✅ 자동 입실 완료: ${entranceResult}`);
        } else {
          console.log('ℹ️ 대기열이 비어있습니다.');
        }
      }
    } catch (queueError) {
      console.error('⚠️ 자동 입실 처리 중 오류 (계속 진행):', queueError);
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
  
  console.log(`\n🔄 연습실 ${parsed.data}번 활성화 처리 시작...`);
  
  try {
    await activatePracticeStatus(sql, parsed.data);
    console.log('✅ 연습실 활성화 완료');
    
    // 이론실 및 대기열 확인하여 자동 입실 처리
    console.log('\n🔍 자동 입실 대상 확인 중...');
    try {
      // 1. 이론실에 있는 일반 학생 확인
      const theoryRooms = await selectTheoryStatus(sql);
      let theoryStudent = null;
      
      for (const room of theoryRooms) {
        if (room.student_id && room.student_name) {
          const studentSql = normalizePlaceholderForEnv(process.env.SELECT_STUDENT_BY_ID_SQL);
          if (studentSql) {
            const studentRes: any = await (sql as any).query(studentSql, [room.student_id]);
            const student = Array.isArray(studentRes) ? studentRes[0] : (studentRes?.rows?.[0] ?? null);
            
            if (student && student.student_grade !== 1 && student.student_grade !== '1') {
              theoryStudent = {
                student_id: room.student_id,
                student_name: room.student_name,
                room_no: room.room_no
              };
              break;
            }
          }
        }
      }
      
      // 2. 이론실 학생이 있으면 우선 입실
      if (theoryStudent) {
        console.log(`👤 이론실 대기 학생: ${theoryStudent.student_name} (이론실 ${theoryStudent.room_no}번)`);
        await (sql as any)`
          UPDATE theory_room_status 
          SET student_id = NULL, 
              student_name = NULL, 
              in_time = NULL, 
              out_time = NULL,
              actual_out_time = NULL
          WHERE room_no = ${theoryStudent.room_no}
        `;
        const entranceResult = await processEntrance(theoryStudent.student_id);
        console.log(`✅ 자동 입실 완료: ${entranceResult}`);
      } else {
        // 3. 대기열 확인
        const pianoQueue = await selectWaitingQueue(sql, 'piano');
        if (pianoQueue && pianoQueue.length > 0) {
          const firstInQueue = pianoQueue[0];
          console.log(`👤 대기열 첫 번째 학생: ${firstInQueue.student_name}`);
          const entranceResult = await processEntrance(firstInQueue.student_id);
          console.log(`✅ 자동 입실 완료: ${entranceResult}`);
        } else {
          console.log('ℹ️ 대기열이 비어있습니다.');
        }
      }
    } catch (queueError) {
      console.error('⚠️ 자동 입실 처리 중 오류 (계속 진행):', queueError);
    }
  } catch (error) {
    console.error('❌ 활성화 처리 오류:', error);
    throw error;
  }
  
  revalidatePath('/practice_room_manage');
  revalidatePath('/main');
  return { ok: true } as const;
}

export async function deactivateStatus(roomNo: number) {
  const parsed = roomSchema.safeParse(Number(roomNo));
  if (!parsed.success) throw new Error('잘못된 연습실 번호입니다.');
  const sql = getSql();
  
  console.log(`\n🔄 연습실 ${parsed.data}번 비활성화 처리 시작...`);
  
  try {
    // 1. 현재 방에 학생이 있는지 확인
    const roomData = await selectPracticeRoomForExit(sql, parsed.data);
    
    if (roomData && roomData.student_id) {
      console.log(`📊 방에 학생 있음: ${roomData.student_name} (ID: ${roomData.student_id})`);
      console.log('🚪 퇴실 처리 중...');
      
      // 2. actual_out_time 업데이트
      const now = new Date();
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstTime = new Date(now.getTime() + kstOffset);
      const today = kstTime.toISOString().slice(0, 10);
      
      await updateActualOutTime(sql, kstTime.toISOString(), roomData.student_id, today);
      console.log('✅ 출석 기록 업데이트 완료');
      
      // 3. 방 비우기
      await deletePracticeStatus(sql, parsed.data);
      console.log('✅ 방 비우기 완료');
    } else {
      console.log('ℹ️ 빈 방입니다.');
    }
    
    // 4. 방 비활성화
    await deactivatePracticeStatus(sql, parsed.data);
    console.log('✅ 연습실 비활성화 완료');
    
  } catch (error) {
    console.error('❌ 비활성화 처리 오류:', error);
    throw error;
  }
  
  revalidatePath('/practice_room_manage');
  revalidatePath('/main');
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
    
    // 3. 이론실 및 대기열 확인하여 자동 입실 처리
    console.log('\n🔍 자동 입실 대상 확인 중...');
    try {
      // 3-1. 이론실에 있는 일반 학생들 먼저 입실
      const theoryRooms = await selectTheoryStatus(sql);
      const theoryStudents = [];
      
      for (const room of theoryRooms) {
        if (room.student_id && room.student_name) {
          const studentSql = normalizePlaceholderForEnv(process.env.SELECT_STUDENT_BY_ID_SQL);
          if (studentSql) {
            const studentRes: any = await (sql as any).query(studentSql, [room.student_id]);
            const student = Array.isArray(studentRes) ? studentRes[0] : (studentRes?.rows?.[0] ?? null);
            
            if (student && student.student_grade !== 1 && student.student_grade !== '1') {
              theoryStudents.push({
                student_id: room.student_id,
                student_name: room.student_name,
                room_no: room.room_no
              });
            }
          }
        }
      }
      
      if (theoryStudents.length > 0) {
        console.log(`👥 이론실 일반 학생: ${theoryStudents.length}명`);
        
        for (const student of theoryStudents) {
          console.log(`\n🚪 ${student.student_name} (이론실 ${student.room_no}번) → 연습실 이동 시도...`);
          try {
            // 이론실 먼저 비우기
            await (sql as any)`
              UPDATE theory_room_status 
              SET student_id = NULL, 
                  student_name = NULL, 
                  in_time = NULL, 
                  out_time = NULL,
                  actual_out_time = NULL
              WHERE room_no = ${student.room_no}
            `;
            
            const entranceResult = await processEntrance(student.student_id);
            console.log(`✅ ${student.student_name}: ${entranceResult}`);
          } catch (error) {
            console.error(`⚠️ ${student.student_name} 입실 실패:`, error);
          }
        }
      }
      
      // 3-2. 대기열 학생들 입실
      const pianoQueue = await selectWaitingQueue(sql, 'piano');
      
      if (pianoQueue && pianoQueue.length > 0) {
        console.log(`👥 피아노 대기열: ${pianoQueue.length}명`);
        
        for (const student of pianoQueue) {
          console.log(`\n🚪 ${student.student_name} 자동 입실 시도...`);
          try {
            const entranceResult = await processEntrance(student.student_id);
            console.log(`✅ ${student.student_name}: ${entranceResult}`);
          } catch (error) {
            console.error(`⚠️ ${student.student_name} 입실 실패:`, error);
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


