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
    
    // 4. 학생 정보 및 과정 정보 조회
    const studentInfoSqlRaw = process.env.SELECT_STUDENT_BY_ID_SQL;
    const studentInfoSql = normalizePlaceholders(studentInfoSqlRaw);
    let studentInfo: any = null;
    let lessonCode: number | null = null;
    
    if (studentInfoSql) {
      const studentResult: any = await sql.query(studentInfoSql, [studentId]);
      studentInfo = Array.isArray(studentResult) ? studentResult[0] : (studentResult?.rows?.[0] ?? null);
    }
    
    if (studentInfo) {
      const today = new Date();
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstTime = new Date(today.getTime() + kstOffset);
      // 요일 코드 변환 (월=1, ... 일=7)
      const dayCode = ((kstTime.getDay() + 6) % 7) + 1;
      
      const courseQueryRaw = process.env.SELECT_STUDENT_COURSE_BY_DAY_SQL;
      const courseQuery = normalizePlaceholders(courseQueryRaw);
      
      if (courseQuery) {
        const courseResult: any = await sql.query(courseQuery, [studentId, dayCode]);
        const course = Array.isArray(courseResult) ? courseResult[0] : (courseResult?.rows?.[0] ?? null);
        if (course) {
          lessonCode = Number(course.lesson_code);
        }
      }
    }
    
    // 5. 수강 시간 도달 여부 판단 (중도 퇴실 포함 총 수강 시간 계산)
    const inTime = new Date(currentRoom.in_time);
    // const expectedOutTime = new Date(currentRoom.out_time); // 기존 예정 시간 대신 총량으로 비교
    
    const elapsedMinutes = Math.floor((now.getTime() - inTime.getTime()) / (1000 * 60));
    
    // 오늘 출석 기록 조회하여 총 수강 시간 계산
    let totalAttendedMinutes = 0;
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstTime = new Date(now.getTime() + kstOffset);
    const today = kstTime.toISOString().slice(0, 10);
    
    const attendanceSqlRaw = process.env.SELECT_ATTENDANCE_BY_DATE_SQL;
    const attendanceSql = normalizePlaceholders(attendanceSqlRaw);
    
    if (attendanceSql) {
      const attendanceResult: any = await sql.query(attendanceSql, [today]);
      const allAttendance = Array.isArray(attendanceResult) ? attendanceResult : (attendanceResult?.rows || []);
      const todayAttendance = allAttendance.filter((record: any) => record.student_id === studentId);
      
      // 완료된 세션들 (actual_out_time이 있는 것만)
      const completedSessions = todayAttendance.filter((record: any) => 
        record.actual_out_time !== null && record.actual_out_time !== undefined
      );
      
      completedSessions.forEach((session: any) => {
        if (session.in_time && session.actual_out_time) {
          const sessionInTime = new Date(session.in_time);
          const sessionOutTime = new Date(session.actual_out_time);
          const duration = Math.floor((sessionOutTime.getTime() - sessionInTime.getTime()) / (1000 * 60));
          if (duration >= 0) {
            totalAttendedMinutes += duration;
          }
        }
      });
    }
    
    // 현재 세션 시간 추가
    totalAttendedMinutes += elapsedMinutes;
    
    // 학년별 필수 시간 조회 및 비교
    let requiredTotalTime = 35; // 기본값
    let gradeName = '초등부';
    
    if (studentInfo && studentInfo.student_grade) {
      switch (Number(studentInfo.student_grade)) {
        case 1: gradeName = '유치부'; break;
        case 2: gradeName = '초등부'; break;
        case 3: gradeName = '중고등부'; break;
        case 4: gradeName = '대회부'; break;
        case 5: gradeName = '연주회부'; break;
        case 6: gradeName = '신입생'; break;
        case 7: gradeName = '기타'; break;
      }
    }
    
    const classTimeSettingsSqlRaw = process.env.SELECT_CLASS_TIME_SETTINGS_SQL;
    const classTimeSettingsSql = normalizePlaceholders(classTimeSettingsSqlRaw);
    
    if (classTimeSettingsSql) {
      const settingsResult: any = await sql.query(classTimeSettingsSql, []);
      const classTimeSettings = Array.isArray(settingsResult) ? settingsResult : (settingsResult?.rows || []);
      const setting = classTimeSettings.find((s: any) => s.grade_name === gradeName);
      
      if (setting) {
        if (lessonCode === 1) { // 피아노+이론
          // 퇴실 버튼은 '완전 하원'을 의미한다고 가정하면 전체 시간 비교
          // 하지만 연습실에서 퇴실하는 거라면 피아노 시간만 체크해야 할 수도 있음
          // 여기서는 안전하게 전체 시간 체크 (이론 포함)
          // 만약 피아노만 체크해야 한다면 requiredPianoTime 사용
          requiredTotalTime = (setting.pt_piano || 0) + (setting.pt_theory || 0);
        } else if (lessonCode === 2) { // 피아노+드럼
          requiredTotalTime = (setting.pd_piano || 0) + (setting.pd_drum || 0);
        } else if (lessonCode === 3) { // 드럼
          requiredTotalTime = setting.drum_only || 35;
        } else if (lessonCode === 4) { // 피아노
          requiredTotalTime = setting.piano_only || 35;
        } else if (lessonCode === 5) { // 연습만
          requiredTotalTime = setting.practice_only || 50;
        } else {
          requiredTotalTime = setting.piano_only || 35;
        }
      }
    }
    
    console.log(`📊 총 수강: ${totalAttendedMinutes}분 / 필수: ${requiredTotalTime}분 (과정: ${lessonCode})`);
    
    if (totalAttendedMinutes >= requiredTotalTime) {
      // 수강 시간 충족 - 퇴실 가능
      return NextResponse.json({
        status: 'can_exit',
        message: 'O',
        roomInfo: {
          roomType: currentRoom.roomType,
          roomNo: currentRoom.room_no,
          studentName: currentRoom.student_name,
          inTime: currentRoom.in_time,
          elapsedMinutes,
          totalAttendedMinutes
        }
      });
    } else {
      // 수강 시간 부족 - 퇴실 불가
      const remainingMinutes = requiredTotalTime - totalAttendedMinutes;
      return NextResponse.json({
        status: 'time_insufficient',
        message: 'X',
        remainingMinutes,
        roomInfo: {
          roomType: currentRoom.roomType,
          roomNo: currentRoom.room_no,
          studentName: currentRoom.student_name,
          inTime: currentRoom.in_time,
          elapsedMinutes,
          totalAttendedMinutes
        }
      });
    }

    /* 기존 로직 주석 처리 또는 제거
    if (elapsedMinutes >= expectedMinutes) {
      // ...
    */

  } catch (error) {
    console.error('퇴실 가능 여부 확인 오류:', error);
    return NextResponse.json({ error: '퇴실 가능 여부 확인 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
