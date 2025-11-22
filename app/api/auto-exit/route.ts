import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: './.env.development.local' });

function normalizePlaceholder(raw: string | undefined): string {
  const input = (raw || '').trim();
  if (!input) return '';
  let normalized = input.replace(/\\\$(\d+)/g, (_m, d) => `$${d}`);
  normalized = normalized.replace(/`(\$\d+)/g, (_m, g1) => g1);
  return normalized;
}

async function handleAutoExit() {
  const sql = neon(process.env.DATABASE_URL!);
  const now = new Date();
  let autoExitCount = 0;

    // 1. 연습실 체크
    const practiceRoomsSql = normalizePlaceholder(process.env.SELECT_PRACTICE_STATUS_SQL);
    if (practiceRoomsSql) {
      const practiceRooms: any = await (sql as any).query(practiceRoomsSql);
      const rooms = Array.isArray(practiceRooms) ? practiceRooms : (practiceRooms?.rows || []);
      
      for (const room of rooms) {
        if (room.student_id && room.out_time) {
          const outTime = new Date(room.out_time);
          if (now >= outTime) {
            // 자동 퇴실 처리
            await processAutoExit(sql, room.student_id, room.room_no, 'practice');
            autoExitCount++;
          }
        }
      }
    }

    // 2. 유치부실 체크
    const kinderRoomsSql = normalizePlaceholder(process.env.SELECT_KINDER_STATUS_SQL);
    if (kinderRoomsSql) {
      const kinderRooms: any = await (sql as any).query(kinderRoomsSql);
      const rooms = Array.isArray(kinderRooms) ? kinderRooms : (kinderRooms?.rows || []);
      
      for (const room of rooms) {
        if (room.student_id && room.out_time) {
          const outTime = new Date(room.out_time);
          if (now >= outTime) {
            // 자동 퇴실 처리
            await processAutoExit(sql, room.student_id, room.room_no, 'kinder');
            autoExitCount++;
          }
        }
      }
    }

    // 3. 드럼실 체크
    const drumRoomsSql = normalizePlaceholder(process.env.SELECT_DRUM_STATUS_SQL);
    if (drumRoomsSql) {
      const drumRooms: any = await (sql as any).query(drumRoomsSql);
      const rooms = Array.isArray(drumRooms) ? drumRooms : (drumRooms?.rows || []);
      
      for (const room of rooms) {
        if (room.student_id && room.out_time) {
          const outTime = new Date(room.out_time);
          if (now >= outTime) {
            // 자동 퇴실 처리
            await processAutoExit(sql, room.student_id, room.room_no, 'drum');
            autoExitCount++;
          }
        }
      }
    }

    // 4. 이론실 체크
    const theoryRoomsSql = normalizePlaceholder(process.env.SELECT_THEORY_STATUS_SQL);
    if (theoryRoomsSql) {
      const theoryRooms: any = await (sql as any).query(theoryRoomsSql);
      const rooms = Array.isArray(theoryRooms) ? theoryRooms : (theoryRooms?.rows || []);
      
      for (const room of rooms) {
        if (room.student_id && room.out_time) {
          const outTime = new Date(room.out_time);
          if (now >= outTime) {
            // 자동 퇴실 처리
            await processAutoExit(sql, room.student_id, room.room_no, 'theory');
            autoExitCount++;
          }
        }
      }
    }

  return { 
    success: true, 
    message: `자동 퇴실 처리 완료: ${autoExitCount}명`,
    count: autoExitCount 
  };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const userAgent = request.headers.get('user-agent') || '';
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = userAgent.toLowerCase().includes('vercel-cron');

  // Vercel Cron이면 인증 우회, 아니면 크론 시크릿으로 검증
  if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await handleAutoExit();
    // Vercel Cron 호출일 때는 간단한 OK 응답을 포함해서 반환
    if (isVercelCron) return NextResponse.json({ ok: true, ...result });
    return NextResponse.json(result);
  } catch (error) {
    console.error('자동 퇴실 처리 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // POST는 수동 호출용이므로 항상 인증 필요
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ 
      success: false, 
      error: 'Unauthorized' 
    }, { status: 401 });
  }
  
  try {
    const result = await handleAutoExit();
    return NextResponse.json(result);
  } catch (error) {
    console.error('자동 퇴실 처리 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '알 수 없는 오류' 
    }, { status: 500 });
  }
}

async function processAutoExit(
  sql: any, 
  studentId: string, 
  roomNo: number, 
  roomType: 'practice' | 'kinder' | 'drum' | 'theory'
) {
  const now = new Date();
  
  // 1. 출석 기록 업데이트 (actual_out_time 설정)
  const updateAttendanceSql = normalizePlaceholder(process.env.UPDATE_ATTENDANCE_ACTUAL_OUT_TIME_SQL);
  if (updateAttendanceSql) {
    const today = now.toISOString().slice(0, 10);
    await (sql as any).query(updateAttendanceSql, [now.toISOString(), studentId, today]);
  }

  // 2. 방 상태 초기화
  let clearRoomSql: string | undefined;
  switch (roomType) {
    case 'practice':
      clearRoomSql = normalizePlaceholder(process.env.CLEAR_PRACTICE_ROOM_SQL);
      break;
    case 'kinder':
      clearRoomSql = normalizePlaceholder(process.env.KINDER_CLEAR_ROOM_SQL);
      break;
    case 'drum':
      clearRoomSql = normalizePlaceholder(process.env.CLEAR_DRUM_ROOM_SQL);
      break;
    case 'theory':
      clearRoomSql = normalizePlaceholder(process.env.DELETE_THEORY_STATUS_SQL);
      break;
  }

  if (clearRoomSql) {
    await (sql as any).query(clearRoomSql, [roomNo]);
  }

  console.log(`✅ 자동 퇴실: ${studentId} (${roomType} ${roomNo}번)`);
}

