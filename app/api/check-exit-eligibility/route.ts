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
      const dayCode = kstTime.getDay();
      
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
    
    // 5. 수강 시간 도달 여부 판단
    const inTime = new Date(currentRoom.in_time);
    const expectedOutTime = new Date(currentRoom.out_time);
    
    const elapsedMinutes = Math.floor((now.getTime() - inTime.getTime()) / (1000 * 60));
    const expectedMinutes = Math.floor((expectedOutTime.getTime() - inTime.getTime()) / (1000 * 60));
    
    if (elapsedMinutes >= expectedMinutes) {
      // 현재 방의 수강 시간은 충족됨
      
      // 6. "피아노+이론" 학생인 경우, 이론 시간 체크
      if (lessonCode === 1 && (currentRoom.roomType === 'practice' || currentRoom.roomType === 'kinder')) {
        // 피아노+이론 과정이고, 연습실/유치부실에서 퇴실하려는 경우
        console.log('🎹📚 피아노+이론 학생 - 이론 시간 체크');
        
        // 오늘 출석 기록 조회
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
          
          // 총 수강 시간 계산
          let totalAttendedMinutes = 0;
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
          
          // 현재 세션 시간 추가 (아직 actual_out_time이 없으므로)
          totalAttendedMinutes += elapsedMinutes;
          
          // 학년별 필수 시간 조회
          const classTimeSettingsSqlRaw = process.env.SELECT_CLASS_TIME_SETTINGS_SQL;
          const classTimeSettingsSql = normalizePlaceholders(classTimeSettingsSqlRaw);
          
          if (classTimeSettingsSql) {
            const settingsResult: any = await sql.query(classTimeSettingsSql, []);
            const classTimeSettings = Array.isArray(settingsResult) ? settingsResult : (settingsResult?.rows || []);
            
            let gradeName = '초등부';
            if (studentInfo.student_grade) {
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
            
            const setting = classTimeSettings.find((s: any) => s.grade_name === gradeName);
            const requiredPianoTime = setting?.pt_piano || 25;
            const requiredTheoryTime = setting?.pt_theory || 25;
            const requiredTotalTime = requiredPianoTime + requiredTheoryTime;
            
            console.log(`📊 총 수강: ${totalAttendedMinutes}분 / 필수: ${requiredTotalTime}분 (피아노: ${requiredPianoTime}분, 이론: ${requiredTheoryTime}분)`);
            
            if (totalAttendedMinutes < requiredTotalTime) {
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
                  expectedOutTime: currentRoom.out_time,
                  elapsedMinutes,
                  expectedMinutes,
                  totalAttendedMinutes,
                  requiredTotalTime
                }
              });
            }
          }
        }
      }
      
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
        message: 'X',
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
