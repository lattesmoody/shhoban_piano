'use server';

import { revalidatePath } from 'next/cache';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';
import {
  deleteTheoryStatus as deleteTheoryStatusQuery,
  setAllTheoryEmpty,
  selectTheoryStatus,
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
  
  console.log(`\n🔄 이론실 ${parsed.data}번 퇴실 처리 시작...`);
  
  try {
    // 1. 현재 방 상태 조회
    const theoryRows = await selectTheoryStatus(sql);
    const roomData = theoryRows.find(r => r.room_no === parsed.data);
    
    if (roomData && roomData.student_id) {
      console.log(`📊 방 정보: 학생ID=${roomData.student_id}, 이름=${roomData.student_name}`);
      
      // 2. student_attendance 테이블에 actual_out_time 업데이트
      const now = new Date();
      // KST 시간으로 변환 (UTC+9)
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstTime = new Date(now.getTime() + kstOffset);
      const today = kstTime.toISOString().slice(0, 10);
      
      console.log(`📅 날짜: ${today}`);
      console.log(`⏰ 퇴실 시간(KST): ${kstTime.toISOString()}`);
      
      // actual_out_time 업데이트 (서브쿼리 사용)
      await sql`
        UPDATE student_attendance 
        SET actual_out_time = ${kstTime.toISOString()}
        WHERE attendance_num = (
          SELECT attendance_num 
          FROM student_attendance 
          WHERE student_id = ${roomData.student_id} 
            AND attendance_date = ${today}
            AND actual_out_time IS NULL 
          ORDER BY attendance_num DESC 
          LIMIT 1
        )
      `;
      
      console.log('✅ actual_out_time 업데이트 완료');
    }
    
    // 3. 방 비우기
    await deleteTheoryStatusQuery(sql, parsed.data);
    console.log('✅ 이론실 퇴실 처리 완료\n');
    
  } catch (error) {
    console.error('❌ 이론실 퇴실 처리 오류:', error);
    throw error;
  }
  
  revalidatePath('/theoryroom_manage');
  return { ok: true } as const;
}

// 이론실 전체 공실 처리
export async function makeAllTheoryEmpty() {
  const sql = getSql();
  
  console.log('\n🔄 이론실 전체 공실 처리 시작...');
  
  try {
    // 1. 현재 입실 중인 모든 학생들의 actual_out_time 업데이트
    const theoryRows = await selectTheoryStatus(sql);
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstTime = new Date(now.getTime() + kstOffset);
    const today = kstTime.toISOString().slice(0, 10);
    
    console.log(`📅 날짜: ${today}`);
    console.log(`⏰ 퇴실 시간(KST): ${kstTime.toISOString()}`);
    
    for (const room of theoryRows) {
      if (room.student_id) {
        console.log(`📊 퇴실 처리: ${room.student_name} (${room.student_id})`);
        
        await sql`
          UPDATE student_attendance 
          SET actual_out_time = ${kstTime.toISOString()}
          WHERE attendance_num = (
            SELECT attendance_num 
            FROM student_attendance 
            WHERE student_id = ${room.student_id} 
              AND attendance_date = ${today}
              AND actual_out_time IS NULL 
            ORDER BY attendance_num DESC 
            LIMIT 1
          )
        `;
      }
    }
    
    console.log('✅ 모든 학생 actual_out_time 업데이트 완료');
    
    // 2. 모든 방 비우기
    await setAllTheoryEmpty(sql);
    console.log('✅ 이론실 전체 공실 처리 완료\n');
    
  } catch (error) {
    console.error('❌ 이론실 전체 공실 처리 오류:', error);
    throw error;
  }
  
  revalidatePath('/theoryroom_manage');
  return { ok: true } as const;
}

