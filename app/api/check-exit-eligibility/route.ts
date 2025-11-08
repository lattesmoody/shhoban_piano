import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.development.local' });

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

    // 1. 해당 학생이 현재 어느 방에 있는지 확인 (모든 방 타입에서 검색)
    let allFoundRooms: any[] = [];
    
    // Practice room check
    const practiceRoomSqlRaw = process.env.FIND_STUDENT_IN_PRACTICE_ROOMS_SQL;
    const practiceRoomSql = normalizePlaceholders(practiceRoomSqlRaw);
    if (practiceRoomSql) {
      const practiceRooms = await sql.query(practiceRoomSql, [studentId]);
      practiceRooms.forEach((room: any) => {
        if (room) allFoundRooms.push({ ...room, roomType: 'practice' });
      });
    }

    // Kinder room check
    const kinderRoomSqlRaw = process.env.FIND_STUDENT_IN_KINDER_ROOMS_SQL;
    const kinderRoomSql = normalizePlaceholders(kinderRoomSqlRaw);
    if (kinderRoomSql) {
      const kinderRooms = await sql.query(kinderRoomSql, [studentId]);
      kinderRooms.forEach((room: any) => {
        if (room) allFoundRooms.push({ ...room, roomType: 'kinder' });
      });
    }

    // Drum room check
    const drumRoomSqlRaw = process.env.FIND_STUDENT_IN_DRUM_ROOMS_SQL;
    const drumRoomSql = normalizePlaceholders(drumRoomSqlRaw);
    if (drumRoomSql) {
      const drumRooms = await sql.query(drumRoomSql, [studentId]);
      drumRooms.forEach((room: any) => {
        if (room) allFoundRooms.push({ ...room, roomType: 'drum' });
      });
    }

    // 2. 입실 여부 확인
    if (allFoundRooms.length === 0) {
      return NextResponse.json({
        status: 'not_entered',
        message: '입실 상태가 아닙니다.'
      });
    }

    // 3. 가장 최근 입실한 방 선택 (중복 입실인 경우)
    if (allFoundRooms.length > 1) {
      allFoundRooms.sort((a, b) => new Date(b.in_time).getTime() - new Date(a.in_time).getTime());
    }

    const currentRoom = allFoundRooms[0];
    
    // 4. 수강 시간 도달 여부 판단
    const inTime = new Date(currentRoom.in_time);
    const expectedOutTime = new Date(currentRoom.out_time);
    
    const elapsedMinutes = Math.floor((now.getTime() - inTime.getTime()) / (1000 * 60));
    const expectedMinutes = Math.floor((expectedOutTime.getTime() - inTime.getTime()) / (1000 * 60));
    
    if (elapsedMinutes >= expectedMinutes) {
      // 수강 시간 충족 - 퇴실 가능
      return NextResponse.json({
        status: 'can_exit',
        message: 'O',
        roomInfo: {
          roomType: currentRoom.roomType,
          roomNo: currentRoom.room_no,
          studentName: currentRoom.student_name,
          inTime: currentRoom.in_time,
          expectedOutTime: currentRoom.out_time,
          elapsedMinutes,
          expectedMinutes
        }
      });
    } else {
      // 수강 시간 부족 - 퇴실 불가
      const remainingMinutes = expectedMinutes - elapsedMinutes;
      const roomTypeKorean = currentRoom.roomType === 'practice' ? '연습실' : 
                           currentRoom.roomType === 'kinder' ? '유치부실' : '드럼실';
      
      return NextResponse.json({
        status: 'time_insufficient',
        message: `${roomTypeKorean} ${currentRoom.room_no}번 / ${remainingMinutes}분 남음`,
        remainingMinutes,
        roomInfo: {
          roomType: currentRoom.roomType,
          roomNo: currentRoom.room_no,
          studentName: currentRoom.student_name,
          inTime: currentRoom.in_time,
          expectedOutTime: currentRoom.out_time,
          elapsedMinutes,
          expectedMinutes
        }
      });
    }

  } catch (error) {
    console.error('퇴실 가능 여부 확인 오류:', error);
    return NextResponse.json({ error: '퇴실 가능 여부 확인 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
