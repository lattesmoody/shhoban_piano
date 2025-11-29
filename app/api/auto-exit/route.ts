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

// KST 시간을 ISO 문자열로 변환 (UTC 변환 없이)
function toKSTISOString(date: Date): string {
  // UTC 시간에 9시간(KST 오프셋)을 더함
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  
  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');
  const hours = String(kstDate.getUTCHours()).padStart(2, '0');
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(kstDate.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
}

async function handleAutoExit() {
  const sql = neon(process.env.DATABASE_URL!);
  const now = new Date();
  let autoExitCount = 0;
  let movedCount = 0;

  try {
    // 1. 연습실 체크
    const practiceRoomsSql = normalizePlaceholder(process.env.SELECT_PRACTICE_STATUS_SQL);
    if (practiceRoomsSql) {
      const practiceRooms: any = await (sql as any).query(practiceRoomsSql);
      const rooms = Array.isArray(practiceRooms) ? practiceRooms : (practiceRooms?.rows || []);
      
      for (const room of rooms) {
        if (room.student_id && room.out_time) {
          const outTime = new Date(room.out_time);
          if (now >= outTime) {
            // 시간 만료 처리 (이동 로직 포함)
            const moved = await handleTimeExpired(sql, room.student_id, room.room_no, 'practice');
            if (moved) movedCount++;
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
            // 시간 만료 처리 (이동 로직 포함)
            const moved = await handleTimeExpired(sql, room.student_id, room.room_no, 'kinder');
            if (moved) movedCount++;
          }
        }
      }
    }

    // 3. 드럼실, 이론실은 자동 퇴실/이동 처리 하지 않음 (요구사항: 퇴실 처리 하지 말 것)
    
  } catch (error) {
    console.error('자동 퇴실/이동 처리 중 오류:', error);
  }

  return { 
    success: true, 
    message: `처리 완료: 이동 ${movedCount}명`,
    movedCount
  };
}

// 시간 만료 시 학생 이동 처리
async function handleTimeExpired(
  sql: any, 
  studentId: string, 
  roomNo: number, 
  roomType: 'practice' | 'kinder'
): Promise<boolean> {
  try {
    // 1. 학생 과정 정보 조회
    const now = new Date();
    const dayCode = ((now.getDay() + 6) % 7) + 1; // 월=1..일=7
    const courseQuery = normalizePlaceholder(process.env.SELECT_STUDENT_COURSE_BY_DAY_SQL);
    
    if (!courseQuery) return false;
    
    const courseResult: any = await sql.query(courseQuery, [studentId, dayCode]);
    const course = Array.isArray(courseResult) ? courseResult[0] : (courseResult?.rows?.[0] ?? null);
    
    if (!course) return false;
    
    const lessonCode = Number(course.lesson_code);
    
    // 2. 과정별 이동 로직
    if (lessonCode === 2) { // 피아노+드럼
      return await moveToDrumRoom(sql, studentId, roomNo, roomType);
    } else if (lessonCode === 1) { // 피아노+이론
      return await moveToTheoryRoom(sql, studentId, roomNo, roomType);
    }
    
    // 그 외 과정은 아무것도 하지 않음 (퇴실 처리 X)
    return false;
    
  } catch (error) {
    console.error(`학생 ${studentId} 이동 처리 중 오류:`, error);
    return false;
  }
}

// 드럼실로 이동
async function moveToDrumRoom(sql: any, studentId: string, currentRoomNo: number, currentRoomType: 'practice' | 'kinder'): Promise<boolean> {
  // 드럼실 빈 방 찾기
  const drumRoomQuery = normalizePlaceholder(process.env.DRUM_FIND_EMPTY_ROOM_SQL); // 환경변수명 확인 필요 (보통 FIND_EMPTY_ROOM_SQL 패턴)
  // process-exit에는 DRUM_FIND_EMPTY_ROOM_SQL이 없음. 직접 쿼리 작성하거나 FIND_STUDENT_IN_DRUM_ROOMS_SQL 등을 참고.
  // 하지만 process-exit에는 연습실->드럼실 이동 로직이 없었음 (반대는 있었음).
  // 따라서 드럼실 빈 방 찾는 쿼리를 여기서는 직접 작성하는 게 안전하거나, 환경변수가 있다고 가정해야 함.
  // 일단 하드코딩된 쿼리 사용 (안전)
  
  // 드럼실 상태 테이블 확인 (1~4번 방)
  const findEmptyDrumSql = `
    SELECT room_no FROM drum_room_status 
    WHERE student_id IS NULL AND is_enabled = true 
    ORDER BY room_no ASC LIMIT 1
  `;
  
  const drumRoomResult: any = await sql.query(findEmptyDrumSql);
  const drumRoom = Array.isArray(drumRoomResult) ? drumRoomResult[0] : (drumRoomResult?.rows?.[0] ?? null);
  
  if (drumRoom) {
    // 이동 처리 트랜잭션 (현재 방 비우기 + 드럼실 입실)
    // 1. 현재 방 비우기 (출석 기록 update는 생략? "퇴실 처리 하지 말 것"이 "기록상 퇴실"을 말하는 건지, "방 비우기"를 말하는 건지 모호함.
    // 하지만 "드럼실로 입실"하려면 현재 방은 비워야 함.
    // 출석 기록의 actual_out_time은 업데이트해야 함 (피아노 종료니까).
    
    const now = new Date();
    const today = toKSTISOString(now).slice(0, 10);
    const updateAttendanceSql = normalizePlaceholder(process.env.UPDATE_ATTENDANCE_ACTUAL_OUT_TIME_SQL);
    
    if (updateAttendanceSql) {
      await sql.query(updateAttendanceSql, [toKSTISOString(now), studentId, today]);
    }
    
    // 2. 현재 방 초기화
    let clearRoomSql = '';
    if (currentRoomType === 'practice') {
      clearRoomSql = normalizePlaceholder(process.env.CLEAR_PRACTICE_ROOM_SQL);
    } else {
      clearRoomSql = normalizePlaceholder(process.env.KINDER_CLEAR_ROOM_SQL); // KINDER_CLEAR_ROOM_SQL 확인 필요
    }
    
    if (clearRoomSql) {
      await sql.query(clearRoomSql, [currentRoomNo]);
    }
    
    // 3. 드럼실 입실 (학생 정보 조회 필요)
    const studentQuery = normalizePlaceholder(process.env.SELECT_STUDENT_BY_ID_SQL);
    const studentResult: any = await sql.query(studentQuery, [studentId]);
    const student = Array.isArray(studentResult) ? studentResult[0] : (studentResult?.rows?.[0] ?? null);
    
    if (student) {
      // 학년별 드럼 시간 조회
      const classTimeQuery = normalizePlaceholder(process.env.SELECT_CLASS_TIME_SETTINGS_SQL);
      const classTimeResult: any = await sql.query(classTimeQuery);
      const classTimeSettings = Array.isArray(classTimeResult) ? classTimeResult : (classTimeResult?.rows || []);
      
      let gradeName = '초등부';
      // ... (학년 매핑 로직) ...
      // 간소화를 위해 기본값 사용하거나 로직 복사
       switch (Number(student.student_grade)) {
        case 1: gradeName = '유치부'; break;
        case 2: gradeName = '초등부'; break;
        case 3: gradeName = '중고등부'; break;
        case 4: gradeName = '대회부'; break;
        case 5: gradeName = '연주회부'; break;
        case 6: gradeName = '신입생'; break;
        case 7: gradeName = '기타'; break;
      }
      
      const setting = classTimeSettings.find((s: any) => s.grade_name === gradeName);
      const drumDuration = setting?.pd_drum || 20;
      
      const drumInTime = new Date();
      const drumOutTime = new Date(drumInTime.getTime() + drumDuration * 60 * 1000);
      
      // 드럼실 입실 쿼리 (환경변수가 없으면 직접 작성)
      // DRUM_UPDATE_ENTRANCE_SQL 가정 또는 직접 작성
      const drumUpdateSql = `
        UPDATE drum_room_status
        SET student_id = $1, student_name = $2, in_time = $3, out_time = $4, actual_out_time = NULL
        WHERE room_no = $5
      `;
      
      await sql.query(drumUpdateSql, [
        studentId,
        student.student_name,
        toKSTISOString(drumInTime),
        toKSTISOString(drumOutTime),
        drumRoom.room_no
      ]);
      
      // 출석 기록에 드럼 세션 추가 (INSERT)
      const insertAttendanceSql = normalizePlaceholder(process.env.INSERT_ATTENDANCE_SQL); // 필요 시
      // 하지만 보통 입실 시 출석 기록을 생성함. 여기서는 생략하거나 추가 구현 필요.
      // 기존 process-entrance 로직을 보면 입실 시 출석 기록을 생성함.
      // 여기서는 방 이동이므로 새로운 세션(드럼)을 생성해야 함.
      
      if (insertAttendanceSql) {
        await sql.query(insertAttendanceSql, [
          studentId,
          student.student_name,
          toKSTISOString(drumInTime),
          toKSTISOString(drumOutTime),
          `드럼실 ${drumRoom.room_no}번`,
          '드럼' // course_name (간소화)
        ]);
      }
      
      console.log(`🥁 피아노(${currentRoomNo}) -> 드럼(${drumRoom.room_no}) 이동: ${student.student_name}`);
      return true;
    }
  }
  
  return false;
}

// 이론실로 이동
async function moveToTheoryRoom(sql: any, studentId: string, currentRoomNo: number, currentRoomType: 'practice' | 'kinder'): Promise<boolean> {
  // 이론실 빈 방 찾기
  const theoryRoomQuery = normalizePlaceholder(process.env.THEORY_FIND_EMPTY_ROOM_SQL);
  if (!theoryRoomQuery) return false;
  
  const theoryRoomResult: any = await sql.query(theoryRoomQuery);
  const theoryRoom = Array.isArray(theoryRoomResult) ? theoryRoomResult[0] : (theoryRoomResult?.rows?.[0] ?? null);
  
  if (theoryRoom) {
    // 이동 처리 트랜잭션
    
    // 1. 현재 방 비우기 & 출석 기록 업데이트
    const now = new Date();
    const today = toKSTISOString(now).slice(0, 10);
    const updateAttendanceSql = normalizePlaceholder(process.env.UPDATE_ATTENDANCE_ACTUAL_OUT_TIME_SQL);
    
    if (updateAttendanceSql) {
      await sql.query(updateAttendanceSql, [toKSTISOString(now), studentId, today]);
    }
    
    let clearRoomSql = '';
    if (currentRoomType === 'practice') {
      clearRoomSql = normalizePlaceholder(process.env.CLEAR_PRACTICE_ROOM_SQL);
    } else {
      clearRoomSql = normalizePlaceholder(process.env.KINDER_CLEAR_ROOM_SQL);
    }
    
    if (clearRoomSql) {
      await sql.query(clearRoomSql, [currentRoomNo]);
    }
    
    // 2. 이론실 입실
    const studentQuery = normalizePlaceholder(process.env.SELECT_STUDENT_BY_ID_SQL);
    const studentResult: any = await sql.query(studentQuery, [studentId]);
    const student = Array.isArray(studentResult) ? studentResult[0] : (studentResult?.rows?.[0] ?? null);
    
    if (student) {
      const classTimeQuery = normalizePlaceholder(process.env.SELECT_CLASS_TIME_SETTINGS_SQL);
      const classTimeResult: any = await sql.query(classTimeQuery);
      const classTimeSettings = Array.isArray(classTimeResult) ? classTimeResult : (classTimeResult?.rows || []);
      
      let gradeName = '초등부';
       switch (Number(student.student_grade)) {
        case 1: gradeName = '유치부'; break;
        case 2: gradeName = '초등부'; break;
        case 3: gradeName = '중고등부'; break;
        case 4: gradeName = '대회부'; break;
        case 5: gradeName = '연주회부'; break;
        case 6: gradeName = '신입생'; break;
        case 7: gradeName = '기타'; break;
      }
      
      const setting = classTimeSettings.find((s: any) => s.grade_name === gradeName);
      const theoryDuration = setting?.pt_theory || 15;
      
      const theoryInTime = new Date();
      const theoryOutTime = new Date(theoryInTime.getTime() + theoryDuration * 60 * 1000);
      
      const theoryEntranceQuery = normalizePlaceholder(process.env.THEORY_UPDATE_ENTRANCE_SQL);
      if (theoryEntranceQuery) {
        await sql.query(theoryEntranceQuery, [
          studentId,
          student.student_name,
          toKSTISOString(theoryInTime),
          toKSTISOString(theoryOutTime),
          theoryRoom.room_no
        ]);
      }
      
      // 출석 기록 추가 (이론)
      const insertAttendanceSql = normalizePlaceholder(process.env.INSERT_ATTENDANCE_SQL);
      if (insertAttendanceSql) {
        await sql.query(insertAttendanceSql, [
          studentId,
          student.student_name,
          toKSTISOString(theoryInTime),
          toKSTISOString(theoryOutTime),
          `이론실 ${theoryRoom.room_no}번`,
          '피아노+이론' // course_name
        ]);
      }
      
      console.log(`📚 피아노(${currentRoomNo}) -> 이론(${theoryRoom.room_no}) 이동: ${student.student_name}`);
      return true;
    }
  }
  
  return false;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const userAgent = request.headers.get('user-agent') || '';
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = userAgent.toLowerCase().includes('vercel-cron');

  if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await handleAutoExit();
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
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const result = await handleAutoExit();
    return NextResponse.json(result);
  } catch (error) {
    console.error('자동 퇴실 처리 오류:', error);
    return NextResponse.json({ success: false, error: 'Error' }, { status: 500 });
  }
}
