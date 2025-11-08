import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.development.local' });

// PowerShell 환경에서 이스케이프된 플레이스홀더를 정규화하는 함수
function normalizePlaceholders(raw: string | undefined): string {
  const input = (raw || '').trim();
  if (!input) return '';
  let normalized = input.replace(/\\\$(\d+)/g, (_m, d) => `$${d}`);
  normalized = normalized.replace(/`(\$\d+)/g, (_m, g1) => g1);
  return normalized;
}

export async function POST(request: NextRequest) {
  try {
    const { studentId } = await request.json();
    
    if (!studentId) {
      return NextResponse.json({ error: '수강생 ID가 필요합니다.' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const now = new Date();
    const actualOutTime = now.toISOString();

    // 1. 해당 학생이 현재 어느 방에 있는지 확인 (모든 방 타입에서 검색)
    let allFoundRooms: any[] = [];
    
    // 연습실 확인
    const practiceRoomSqlRaw = process.env.FIND_STUDENT_IN_PRACTICE_ROOMS_SQL;
    const practiceRoomSql = normalizePlaceholders(practiceRoomSqlRaw);
    if (!practiceRoomSql) {
      throw new Error('FIND_STUDENT_IN_PRACTICE_ROOMS_SQL 환경변수가 설정되지 않았습니다.');
    }
    
    const practiceRooms = await sql.query(practiceRoomSql, [studentId]);
    practiceRooms.forEach(room => {
      allFoundRooms.push({
        ...room,
        roomType: 'practice',
        tableName: 'practice_rooms'
      });
    });

    // 유치부실 확인
    const kinderRoomSqlRaw = process.env.FIND_STUDENT_IN_KINDER_ROOMS_SQL;
    const kinderRoomSql = normalizePlaceholders(kinderRoomSqlRaw);
    if (!kinderRoomSql) {
      throw new Error('FIND_STUDENT_IN_KINDER_ROOMS_SQL 환경변수가 설정되지 않았습니다.');
    }
    
    const kinderRooms = await sql.query(kinderRoomSql, [studentId]);
    kinderRooms.forEach(room => {
      allFoundRooms.push({
        ...room,
        roomType: 'kinder',
        tableName: 'kinder_rooms'
      });
    });

    // 드럼실 확인
    const drumRoomSqlRaw = process.env.FIND_STUDENT_IN_DRUM_ROOMS_SQL;
    const drumRoomSql = normalizePlaceholders(drumRoomSqlRaw);
    if (!drumRoomSql) {
      throw new Error('FIND_STUDENT_IN_DRUM_ROOMS_SQL 환경변수가 설정되지 않았습니다.');
    }
    
    const drumRooms = await sql.query(drumRoomSql, [studentId]);
    drumRooms.forEach(room => {
      allFoundRooms.push({
        ...room,
        roomType: 'drum',
        tableName: 'drum_rooms'
      });
    });

    if (allFoundRooms.length === 0) {
      return new NextResponse(`수강생 ${studentId}번이 현재 입실한 방을 찾을 수 없습니다.`, { status: 404 });
    }

    // 중복 입실된 경우 처리
    if (allFoundRooms.length > 1) {
      console.log(`⚠️ 수강생 ${studentId}번이 ${allFoundRooms.length}개 방에 중복 입실되어 있습니다:`, allFoundRooms);
      
      // 가장 최근 입실한 방을 선택 (in_time 기준)
      allFoundRooms.sort((a, b) => new Date(b.in_time).getTime() - new Date(a.in_time).getTime());
      
      const duplicateMessage = `수강생 ${studentId}번이 ${allFoundRooms.length}개 방에 중복 입실되어 있습니다.\n가장 최근 입실한 ${allFoundRooms[0].roomType === 'practice' ? '연습실' : allFoundRooms[0].roomType === 'kinder' ? '유치부실' : '드럼실'} ${allFoundRooms[0].room_no}번에서 퇴실 처리합니다.`;
      
      console.log(duplicateMessage);
    }

    // 선택된 방 (중복인 경우 가장 최근, 단일인 경우 해당 방)
    const currentRoom = allFoundRooms[0];
    const roomType = currentRoom.roomType;
    const tableName = currentRoom.tableName;

    // 2. 수업 시간 계산 (예정 시간과 실제 시간 비교)
    const inTime = new Date(currentRoom.in_time);
    const expectedOutTime = new Date(currentRoom.out_time);
    const actualOutTimeDate = new Date(actualOutTime);

    const expectedDuration = Math.round((expectedOutTime.getTime() - inTime.getTime()) / (1000 * 60)); // 분 단위
    const actualDuration = Math.round((actualOutTimeDate.getTime() - inTime.getTime()) / (1000 * 60)); // 분 단위
    const timeDifference = actualDuration - expectedDuration;

    let message = `${currentRoom.student_name}님이 ${roomType === 'practice' ? '연습실' : roomType === 'kinder' ? '유치부실' : '드럼실'} ${currentRoom.room_no}번에서 퇴실하였습니다.\n`;
    message += `수업 시간: ${actualDuration}분`;
    
    if (timeDifference > 0) {
      message += ` (${timeDifference}분 연장)`;
    } else if (timeDifference < 0) {
      message += ` (${Math.abs(timeDifference)}분 단축)`;
    }

    // 3. 출석 기록 업데이트 (실제 퇴실 시간 기록)
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD 형식
    
    // 3-1. 기존 out_time 업데이트 (호환성 유지)
    const updateAttendanceSqlRaw = process.env.UPDATE_ATTENDANCE_OUT_TIME_SQL;
    const updateAttendanceSql = normalizePlaceholders(updateAttendanceSqlRaw);
    if (updateAttendanceSql) {
      await sql.query(updateAttendanceSql, [actualOutTime, studentId, today]);
      console.log('✅ 출석 기록 out_time 업데이트 완료');
    }
    
    // 3-2. actual_out_time 업데이트 (실제 퇴실 시간)
    try {
      // student_attendance 테이블에 actual_out_time 업데이트
      const updateActualOutTimeSql = `
        UPDATE student_attendance 
        SET actual_out_time = $1 
        WHERE student_id = $2 
          AND DATE(in_time) = $3 
          AND out_time IS NOT NULL 
          AND actual_out_time IS NULL
        ORDER BY in_time DESC 
        LIMIT 1
      `;
      
      const result = await sql.query(updateActualOutTimeSql, [actualOutTime, studentId, today]);
      console.log(`✅ 출석 기록 actual_out_time 업데이트 완료: ${actualOutTime}`);
      
      // 시간 차이 분석
      if (currentRoom.out_time) {
        const expectedTime = new Date(currentRoom.out_time);
        const actualTime = new Date(actualOutTime);
        const diffMinutes = Math.round((actualTime.getTime() - expectedTime.getTime()) / (1000 * 60));
        
        if (diffMinutes > 0) {
          console.log(`⏰ 연장 수업: ${diffMinutes}분 초과`);
        } else if (diffMinutes < 0) {
          console.log(`⏰ 조기 퇴실: ${Math.abs(diffMinutes)}분 일찍`);
        } else {
          console.log(`⏰ 정시 퇴실`);
        }
      }
      
    } catch (error) {
      console.error('❌ actual_out_time 업데이트 오류:', error);
      // 오류가 있어도 퇴실 처리는 계속 진행
    }

    // 4. 방 정보 초기화 (다음 학생을 위해)
    let clearRoomSqlRaw: string | undefined;
    if (tableName === 'practice_rooms') {
      clearRoomSqlRaw = process.env.CLEAR_PRACTICE_ROOM_SQL;
    } else if (tableName === 'kinder_rooms') {
      clearRoomSqlRaw = process.env.CLEAR_KINDER_ROOM_SQL;
    } else if (tableName === 'drum_rooms') {
      clearRoomSqlRaw = process.env.CLEAR_DRUM_ROOM_SQL;
    }
    
    const clearRoomSql = normalizePlaceholders(clearRoomSqlRaw);
    if (!clearRoomSql) {
      throw new Error(`CLEAR_${tableName.toUpperCase()}_SQL 환경변수가 설정되지 않았습니다.`);
    }
    
    await sql.query(clearRoomSql, [currentRoom.room_no]);

    // 6. 중복 입실된 다른 방들도 정리 (같은 student_id로 입실된 모든 방)
    if (allFoundRooms.length > 1) {
      console.log(`🧹 중복 입실된 다른 방들 정리 중...`);
      
      for (let i = 1; i < allFoundRooms.length; i++) {
        const duplicateRoom = allFoundRooms[i];
        
        try {
          let clearDuplicateRoomSqlRaw: string | undefined;
          if (duplicateRoom.tableName === 'practice_rooms') {
            clearDuplicateRoomSqlRaw = process.env.CLEAR_PRACTICE_ROOM_SQL;
          } else if (duplicateRoom.tableName === 'kinder_rooms') {
            clearDuplicateRoomSqlRaw = process.env.CLEAR_KINDER_ROOM_SQL;
          } else if (duplicateRoom.tableName === 'drum_rooms') {
            clearDuplicateRoomSqlRaw = process.env.CLEAR_DRUM_ROOM_SQL;
          }
          
          const clearDuplicateRoomSql = normalizePlaceholders(clearDuplicateRoomSqlRaw);
          if (clearDuplicateRoomSql) {
            await sql.query(clearDuplicateRoomSql, [duplicateRoom.room_no]);
            console.log(`✅ ${duplicateRoom.roomType === 'practice' ? '연습실' : duplicateRoom.roomType === 'kinder' ? '유치부실' : '드럼실'} ${duplicateRoom.room_no}번 중복 입실 정리 완료`);
          }
        } catch (error) {
          console.error(`❌ ${duplicateRoom.roomType} ${duplicateRoom.room_no}번 정리 오류:`, error);
        }
      }
      
      message += `\n\n⚠️ 중복 입실 정리: ${allFoundRooms.length - 1}개의 추가 방에서 해당 학생 정보를 정리했습니다.`;
    }

    return new NextResponse(message, { status: 200 });

  } catch (error) {
    console.error('퇴실 처리 오류:', error);
    return NextResponse.json({ error: '퇴실 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
