'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { neon } from '@neondatabase/serverless';
import { insertWaitingQueue, removeFromWaitingQueue, reorderWaitingQueue } from '@/app/lib/sql/maps/waitingQueueQueries';
import { selectClassTimeSettings, ClassTimeSetting } from '@/app/lib/sql/maps/classTimeQueries';
import { insertAttendance } from '@/app/lib/sql/maps/attendanceQueries';
import dotenv from 'dotenv';
dotenv.config({ path: './.env.development.local' });

export async function logoutAction() {
  const jar = await cookies();
  jar.delete('auth_token');
  redirect('/');
}

// KST 시간을 ISO 문자열로 변환
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


// 입실 처리: studentId 입력 → 오늘 요일 과정 조회 → 해당 타입 방에 입실 처리 후 메시지 반환
export async function processEntrance(studentId: string): Promise<string> {
  try {
    if (!studentId) return '고유번호를 입력해주세요.';
    const sql = neon(process.env.DATABASE_URL!);

    // 1) 수강생 기본 정보
    const selStudentSql = normalizePlaceholderForEnv(process.env.SELECT_STUDENT_BY_ID_SQL);
    if (!selStudentSql) {
      throw new Error('SELECT_STUDENT_BY_ID_SQL 환경변수가 설정되지 않았습니다.');
    }
    const stuRes: any = await (sql as any).query(selStudentSql, [studentId]);
    const student = Array.isArray(stuRes) ? stuRes[0] : (stuRes?.rows?.[0] ?? null);
    if (!student) return '등록된 수강생이 아닙니다.';

    // 2) 요일별 과정 조회
    const dayCode = ((new Date().getDay() + 6) % 7) + 1; // 월=1..일=7
    const selCourseSql = normalizePlaceholderForEnv(process.env.SELECT_STUDENT_COURSE_BY_DAY_SQL);
    if (!selCourseSql) {
      throw new Error('SELECT_STUDENT_COURSE_BY_DAY_SQL 환경변수가 설정되지 않았습니다.');
    }
    const courseRes: any = await (sql as any).query(selCourseSql, [studentId, dayCode]);
    const course = Array.isArray(courseRes) ? courseRes[0] : (courseRes?.rows?.[0] ?? null);
    if (!course) return `${student.student_name}님 반갑습니다.\n오늘은 수업이 없습니다.`;

    const lessonCode: number = Number(course.lesson_code);
    const now = new Date();
    
    // 입실 시간 정규화 함수
    const normalizeInTime = (date: Date): Date => {
      const normalized = new Date(date);
      const minute = date.getMinutes();
      
      if (minute >= 0 && minute <= 2) {
        normalized.setMinutes(0, 0, 0);
      } else if (minute >= 3 && minute <= 7) {
        normalized.setMinutes(5, 0, 0);
      } else if (minute >= 8 && minute <= 12) {
        normalized.setMinutes(10, 0, 0);
      } else if (minute >= 13 && minute <= 17) {
        normalized.setMinutes(15, 0, 0);
      } else if (minute >= 18 && minute <= 22) {
        normalized.setMinutes(20, 0, 0);
      } else if (minute >= 23 && minute <= 27) {
        normalized.setMinutes(25, 0, 0);
      } else if (minute >= 28 && minute <= 32) {
        normalized.setMinutes(30, 0, 0);
      } else if (minute >= 33 && minute <= 37) {
        normalized.setMinutes(35, 0, 0);
      } else if (minute >= 38 && minute <= 42) {
        normalized.setMinutes(40, 0, 0);
      } else if (minute >= 43 && minute <= 47) {
        normalized.setMinutes(45, 0, 0);
      } else if (minute >= 48 && minute <= 52) {
        normalized.setMinutes(50, 0, 0);
      } else if (minute >= 53 && minute <= 57) {
        normalized.setMinutes(55, 0, 0);
      } else if (minute >= 58 && minute <= 59) {
        // 다음 시간 00분으로 간주
        normalized.setHours(normalized.getHours() + 1);
        normalized.setMinutes(0, 0, 0);
      }
      
      return normalized;
    };
    
    // 입실 시간 정규화 적용
    const normalizedInTime = normalizeInTime(now);

    // === 수강 시간 초과 체크 (입실 전 확인) ===
    const lessonNameMap: Record<number,string> = {1:'피아노+이론',2:'피아노+드럼',3:'드럼',4:'피아노',5:'연습만'};
    const lessonName = lessonNameMap[lessonCode] || '수업';
    const today = toKSTISOString(normalizedInTime).slice(0, 10); // YYYY-MM-DD
    
    try {
      // 필수 수강 시간 조회
      const classTimeSettings = await selectClassTimeSettings(sql);
      let gradeName = '초등부';
      if (student.student_grade) {
        switch (Number(student.student_grade)) {
          case 1: gradeName = '유치부'; break;
          case 2: gradeName = '초등부'; break;
          case 3: gradeName = '중고등부'; break;
          case 4: gradeName = '대회부'; break;
          case 5: gradeName = '연주회부'; break;
          case 6: gradeName = '신입생'; break;
          case 7: gradeName = '기타'; break;
        }
      }
      
      const setting = classTimeSettings.find(s => s.grade_name === gradeName);
      let requiredTotalTime = 35; // 기본값
      
      if (setting) {
        if (lessonCode === 1) { // 피아노+이론
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
      
      // 오늘 출석 기록 조회 및 합산
      const attendanceSql = normalizePlaceholderForEnv(process.env.SELECT_ATTENDANCE_BY_DATE_SQL);
      if (attendanceSql) {
        const attendanceResult = await (sql as any).query(attendanceSql, [today]);
        const allAttendance = Array.isArray(attendanceResult) ? attendanceResult : (attendanceResult?.rows || []);
        const todayAttendance = allAttendance.filter((record: any) => record.student_id === studentId);
        
        // 완료된 세션들 (actual_out_time이 있는 것만)
        const completedSessions = todayAttendance.filter((record: any) => 
          record.actual_out_time !== null && record.actual_out_time !== undefined
        );
        
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
        
        console.log(`입실 체크: ${student.student_name}, 총수강: ${totalAttendedMinutes}분 / 필수: ${requiredTotalTime}분`);
        
        // 이미 시간을 모두 채웠다면 입실 차단
        if (totalAttendedMinutes >= requiredTotalTime) {
          return `${student.student_name}님 (${lessonName})\n오늘 수업시간을 모두 채웠습니다!`;
        }
      }
    } catch (error) {
      console.error('수강 시간 초과 체크 중 오류:', error);
      // 오류 시 입실 허용
    }
    // ========================================

    // 과정별 수업 시간 설정 조회하여 퇴실 시간 계산
    const calculateOutTime = async (): Promise<Date> => {
      try {
        const classTimeSettings = await selectClassTimeSettings(sql);
        
        // 학생 학년 정보로 grade_name 매핑
        let gradeName = '초등부'; // 기본값
        if (student.student_grade) {
          switch (Number(student.student_grade)) {
            case 1: gradeName = '유치부'; break;
            case 2: gradeName = '초등부'; break;
            case 3: gradeName = '중고등부'; break;
            case 4: gradeName = '대회부'; break;
            case 5: gradeName = '연주회부'; break;
            case 6: gradeName = '신입생'; break;
            case 7: gradeName = '기타'; break;
            default: gradeName = '초등부'; break;
          }
        }

        // 해당 학년의 수업 시간 설정 찾기
        const setting = classTimeSettings.find(s => s.grade_name === gradeName);
        let classDuration = 35; // 기본 수업 시간 (분)

        if (setting) {
          // 레슨 코드에 따른 수업 시간 결정
          switch (lessonCode) {
            case 1: // 피아노+이론 => 피아노 시간만 반영
              classDuration = setting.pt_piano || 35;
              break;
            case 2: // 피아노+드럼 => 피아노 시간만 반영
              classDuration = setting.pd_piano || 35;
              break;
            case 3: // 드럼
              classDuration = setting.drum_only || 35;
              break;
            case 4: // 피아노
              classDuration = setting.piano_only || 35;
              break;
            case 5: // 연습만
              classDuration = setting.practice_only || 50;
              break;
            default:
              classDuration = 35;
              break;
          }
        }

        // 최소 수업 시간 보장
        if (classDuration <= 0) classDuration = 35;

        // 중도입실인 경우 남은 수강 시간 계산
        let remainingClassTime = classDuration;
        
        // 오늘 출석 기록 확인 (중도입실 판단)
        const today = toKSTISOString(normalizedInTime).slice(0, 10); // YYYY-MM-DD
        //console.log(`📅 중도입실 체크: 날짜=${today}, 학생ID=${studentId}`);
        
        try {
          const attendanceSql = normalizePlaceholderForEnv(process.env.SELECT_ATTENDANCE_BY_DATE_SQL);
          if (attendanceSql) {
            const attendanceResult = await (sql as any).query(attendanceSql, [today]);
            const allAttendance = Array.isArray(attendanceResult) ? attendanceResult : (attendanceResult?.rows || []);
            const todayAttendance = allAttendance.filter((record: any) => record.student_id === studentId);
            
            //console.log(`📊 오늘 출석 기록: 전체=${allAttendance.length}개, 해당학생=${todayAttendance.length}개`);
            if (todayAttendance.length > 0) {
              //console.log('📝 해당 학생 출석 기록:', JSON.stringify(todayAttendance, null, 2));
            }
            
            // 완료된 세션들의 총 시간 계산 - actual_out_time만 확인
            const completedSessions = todayAttendance.filter((record: any) => {
              // 실제 퇴실 시간(actual_out_time)이 있어야만 완료된 세션으로 간주
              // out_time은 입실 시 자동 계산되므로 완료 여부 판단에 사용하면 안됨
              const hasActualOutTime = record.actual_out_time !== null && record.actual_out_time !== undefined;
              //console.log(`  - 레코드 ${record.attendance_num}: actual_out_time=${record.actual_out_time}, 완료=${hasActualOutTime}`);
              return hasActualOutTime;
            });
            
            //console.log(`✅ 완료된 세션: ${completedSessions.length}개`);
            
            // 모든 완료된 세션의 시간을 합산
            let totalAttendedMinutes = 0;
            if (completedSessions.length > 0) {
              //console.log(`📌 모든 완료된 세션의 시간 합산:`);
              
              completedSessions.forEach((session: any) => {
                if (session.in_time && session.actual_out_time) {
                  const inTime = new Date(session.in_time);
                  const outTime = new Date(session.actual_out_time);
                  
                  const durationMinutes = Math.floor((outTime.getTime() - inTime.getTime()) / (1000 * 60));
                  
                  if (durationMinutes < 0) {
                    console.error(`❌ 세션 #${session.attendance_num}: 음수 시간 발견 (무시)`);
                  } else {
                    totalAttendedMinutes += durationMinutes;
                    //console.log(`   - 세션 #${session.attendance_num}: ${durationMinutes}분`);
                  }
                }
              });
              
              //console.log(`✅ 총 수강 시간: ${totalAttendedMinutes}분`);
            }
            
            // 남은 수강 시간 = 총 수업 시간 - 이미 진행된 시간
            if (totalAttendedMinutes > 0) {
              remainingClassTime = Math.max(classDuration - totalAttendedMinutes, 0); // 최소 0분 (음수 방지)
              //console.log(`중도입실 감지: 총 수업시간=${classDuration}분, 진행된 시간=${totalAttendedMinutes}분, 남은 시간=${remainingClassTime}분`);
            }
          }
        } catch (error) {
          console.error('중도입실 시간 계산 실패:', error);
          // 오류 시 기본 수업 시간 사용
        }

        // 퇴실 시간 = 정규화된 입실 시간 + 남은 수업 시간
        const outTime = new Date(normalizedInTime.getTime() + remainingClassTime * 60 * 1000);
        
        //console.log(`수업 시간 계산: 학년=${gradeName}, 레슨=${lessonCode}, 기본시간=${classDuration}분, 실제시간=${remainingClassTime}분`);
        //console.log(`입실: ${toKSTISOString(normalizedInTime)} → 퇴실: ${toKSTISOString(outTime)}`);
        
        return outTime;
      } catch (error) {
        console.error('퇴실 시간 계산 오류:', error);
        // 오류 시 기본 35분 후로 설정
        return new Date(normalizedInTime.getTime() + 35 * 60 * 1000);
      }
    };

    const calculatedOutTime = await calculateOutTime();

    // 3) 중복 입실 체크: 모든 방 타입에서 이미 입실한 학생인지 확인
    const isDrum = lessonCode === 3;
    const isKindergarten = (student.student_grade === 1 || student.student_grade === '1'); // 유치부 학년 코드 1 (숫자/문자열 모두 처리)
    
    //console.log(`방 배정 로직 확인: 학생=${student.student_name}, 학년=${student.student_grade} (타입: ${typeof student.student_grade}), 레슨코드=${lessonCode}`);
    //console.log(`isDrum=${isDrum}, isKindergarten=${isKindergarten}`);
    
    // 모든 방 타입에서 중복 입실 체크
    let alreadyEnteredRooms: any[] = [];
    
    // 연습실 체크
    const practiceCheckSqlRaw = process.env.PRACTICE_CHECK_STUDENT_ENTRANCE_SQL;
    const practiceCheckSql = normalizePlaceholderForEnv(practiceCheckSqlRaw);
    if (practiceCheckSql) {
      const practiceRes: any = await (sql as any).query(practiceCheckSql, [studentId]);
      const practiceEntered = Array.isArray(practiceRes) ? practiceRes : (practiceRes?.rows || []);
      practiceEntered.forEach((room: any) => {
        if (room) alreadyEnteredRooms.push({...room, roomType: 'practice'});
      });
    }
    
    // 유치부실 체크 (환경 변수가 있는 경우)
    const kinderCheckSqlRaw = process.env.KINDER_CHECK_STUDENT_ENTRANCE_SQL;
    const kinderCheckSql = normalizePlaceholderForEnv(kinderCheckSqlRaw);
    if (kinderCheckSql) {
      const kinderRes: any = await (sql as any).query(kinderCheckSql, [studentId]);
      const kinderEntered = Array.isArray(kinderRes) ? kinderRes : (kinderRes?.rows || []);
      kinderEntered.forEach((room: any) => {
        if (room) alreadyEnteredRooms.push({...room, roomType: 'kinder'});
      });
    }
    
    // 드럼실 체크
    const drumCheckSqlRaw = process.env.DRUM_CHECK_STUDENT_ENTRANCE_SQL;
    const drumCheckSql = normalizePlaceholderForEnv(drumCheckSqlRaw);
    if (drumCheckSql) {
      const drumRes: any = await (sql as any).query(drumCheckSql, [studentId]);
      const drumEntered = Array.isArray(drumRes) ? drumRes : (drumRes?.rows || []);
      drumEntered.forEach((room: any) => {
        if (room) alreadyEnteredRooms.push({...room, roomType: 'drum'});
      });
    }
    
    if (alreadyEnteredRooms.length > 0) {
      const roomInfo = alreadyEnteredRooms.map((room: any) => 
        `${room.roomType === 'practice' ? '연습실' : room.roomType === 'kinder' ? '유치부실' : '드럼실'} ${room.room_no}번`
      ).join(', ');
      
      return `이미 수강 중인 학생입니다.\n현재 입실: ${roomInfo}\n\n먼저 퇴실 처리 후 다시 입실해주세요.`;
    }

    // 4) 방 배정: 과정 우선, 그 다음 학년에 따라 테이블 결정
    let findEmptySqlRaw: string | undefined;
    let roomType: string;
    
    // 피아노+이론 과정의 특별 처리
    const isPianoTheory = lessonCode === 1;
    // 피아노+드럼 과정의 특별 처리
    const isPianoDrum = lessonCode === 2;
    
    if (isPianoTheory) {
      // 피아노+이론 학생: 피아노 시간 완료 여부 확인
      //console.log('🎹📚 피아노+이론 과정 - 피아노 완료 여부 체크');
      
      // 오늘 출석 기록 확인 (피아노 시간을 이미 채웠는지 확인)
      const today = toKSTISOString(normalizedInTime).slice(0, 10);
      let hasPianoCompleted = false;
      
      try {
        const attendanceSql = normalizePlaceholderForEnv(process.env.SELECT_ATTENDANCE_BY_DATE_SQL);
        if (attendanceSql) {
          const attendanceResult = await (sql as any).query(attendanceSql, [today]);
          const allAttendance = Array.isArray(attendanceResult) ? attendanceResult : (attendanceResult?.rows || []);
          const todayAttendance = allAttendance.filter((record: any) => record.student_id === studentId);
          
          // 완료된 세션들 (actual_out_time이 있는 것만)
          const completedSessions = todayAttendance.filter((record: any) => 
            record.actual_out_time !== null && record.actual_out_time !== undefined
          );
          
          //console.log(`📊 피아노+이론 학생 출석 기록: 전체=${todayAttendance.length}개, 완료=${completedSessions.length}개`);
          
          // 총 수강 시간 계산
          let totalAttendedMinutes = 0;
          completedSessions.forEach((session: any) => {
            if (session.in_time && session.actual_out_time) {
              const inTime = new Date(session.in_time);
              const outTime = new Date(session.actual_out_time);
              const duration = Math.floor((outTime.getTime() - inTime.getTime()) / (1000 * 60));
              if (duration >= 0) {
                totalAttendedMinutes += duration;
                //console.log(`  ✓ 세션: ${duration}분 (입실: ${inTime.toLocaleTimeString()}, 퇴실: ${outTime.toLocaleTimeString()})`);
              }
            }
          });
          
          // 학년별 피아노 필수 시간 조회
          const classTimeSettings = await selectClassTimeSettings(sql);
          let gradeName = '초등부';
          if (student.student_grade) {
            switch (Number(student.student_grade)) {
              case 1: gradeName = '유치부'; break;
              case 2: gradeName = '초등부'; break;
              case 3: gradeName = '중고등부'; break;
              case 4: gradeName = '대회부'; break;
              case 5: gradeName = '연주회부'; break;
              case 6: gradeName = '신입생'; break;
              case 7: gradeName = '기타'; break;
            }
          }
          
          const setting = classTimeSettings.find(s => s.grade_name === gradeName);
          const requiredPianoTime = setting?.pt_piano || 25;
          
          //console.log(`📏 필수 피아노 시간: ${requiredPianoTime}분, 현재 수강: ${totalAttendedMinutes}분`);
          
          if (totalAttendedMinutes >= requiredPianoTime) {
            hasPianoCompleted = true;
            //console.log(`✅ 피아노 시간 완료 (${totalAttendedMinutes}분 >= ${requiredPianoTime}분) - 이론실로 배정`);
          } else {
            //console.log(`ℹ️  피아노 시간 부족 (${totalAttendedMinutes}분 / ${requiredPianoTime}분) - 연습실/유치부실로 배정`);
          }
        }
      } catch (error) {
        console.error('출석 기록 조회 오류:', error);
      }
      
      if (hasPianoCompleted) {
        // 피아노 완료 → 이론실로
        findEmptySqlRaw = `SELECT * FROM theory_room_status WHERE student_id IS NULL AND is_enabled = true ORDER BY room_no ASC LIMIT 1`;
        roomType = 'theory';
        //console.log('방 배정 결정: 이론실 (피아노 완료, 이론 수업)');
      } else {
        // 피아노 미완료 → 연습실/유치부실로
        if (isKindergarten) {
          findEmptySqlRaw = `SELECT * FROM kinder_room_status WHERE student_id IS NULL AND is_enabled = true ORDER BY room_no ASC LIMIT 1`;
          roomType = 'kinder';
          //console.log('방 배정 결정: 유치부실 (피아노 미완료)');
        } else {
          findEmptySqlRaw = `SELECT * FROM practice_room_status WHERE student_id IS NULL AND is_enabled = true ORDER BY room_no ASC LIMIT 1`;
          roomType = 'practice';
          //console.log('방 배정 결정: 연습실 (피아노 미완료)');
        }
      }
    } else if (isPianoDrum) {
      // 피아노+드럼 학생: 연습실/유치부실 있으면 피아노부터, 없으면 드럼실부터
      //console.log('🎹🥁 피아노+드럼 과정 - 우선순위 체크');
      
      // 오늘 출석 기록 확인 (드럼 시간을 이미 채웠는지 확인)
      const today = toKSTISOString(normalizedInTime).slice(0, 10);
      let hasDrumCompleted = false;
      
      try {
        const attendanceSql = normalizePlaceholderForEnv(process.env.SELECT_ATTENDANCE_BY_DATE_SQL);
        if (attendanceSql) {
          const attendanceResult = await (sql as any).query(attendanceSql, [today]);
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
              const inTime = new Date(session.in_time);
              const outTime = new Date(session.actual_out_time);
              const duration = Math.floor((outTime.getTime() - inTime.getTime()) / (1000 * 60));
              if (duration >= 0) {
                totalAttendedMinutes += duration;
              }
            }
          });
          
          // 학년별 드럼 필수 시간 조회
          const classTimeSettings = await selectClassTimeSettings(sql);
          let gradeName = '초등부';
          if (student.student_grade) {
            switch (Number(student.student_grade)) {
              case 1: gradeName = '유치부'; break;
              case 2: gradeName = '초등부'; break;
              case 3: gradeName = '중고등부'; break;
              case 4: gradeName = '대회부'; break;
              case 5: gradeName = '연주회부'; break;
              case 6: gradeName = '신입생'; break;
              case 7: gradeName = '기타'; break;
            }
          }
          
          const setting = classTimeSettings.find(s => s.grade_name === gradeName);
          const requiredDrumTime = setting?.pd_drum || 20;
          
          if (totalAttendedMinutes >= requiredDrumTime) {
            hasDrumCompleted = true;
            //console.log(`✅ 드럼 시간 완료 (${totalAttendedMinutes}분 >= ${requiredDrumTime}분) - 피아노 연습실로 배정`);
          } else {
            //console.log(`ℹ️  드럼 시간 부족 (${totalAttendedMinutes}분 / ${requiredDrumTime}분)`);
          }
        }
      } catch (error) {
        console.error('출석 기록 조회 오류:', error);
      }
      
      if (hasDrumCompleted) {
        // 드럼 완료 → 피아노 연습실/유치부실로
        if (isKindergarten) {
          findEmptySqlRaw = `SELECT * FROM kinder_room_status WHERE student_id IS NULL AND is_enabled = true ORDER BY room_no ASC LIMIT 1`;
          roomType = 'kinder';
          //console.log('방 배정 결정: 유치부실 (드럼 완료, 피아노 수업)');
        } else {
          findEmptySqlRaw = `SELECT * FROM practice_room_status WHERE student_id IS NULL AND is_enabled = true ORDER BY room_no ASC LIMIT 1`;
          roomType = 'practice';
          //console.log('방 배정 결정: 연습실 (드럼 완료, 피아노 수업)');
        }
      } else {
        // 드럼 미완료 → 연습실/유치부실 먼저 확인
        if (isKindergarten) {
          // 유치부 학생: 유치부실 확인 (활성화된 빈 방만)
          const kinderCheckSql = `SELECT * FROM kinder_room_status WHERE student_id IS NULL AND is_enabled = true ORDER BY room_no ASC LIMIT 1`;
          const kinderRoomRes: any = await (sql as any).query(kinderCheckSql);
          const kinderRoom = Array.isArray(kinderRoomRes) ? kinderRoomRes[0] : (kinderRoomRes?.rows?.[0] ?? null);
          
          if (kinderRoom) {
            // 유치부실 있음 → 피아노부터
            findEmptySqlRaw = kinderCheckSql;
            roomType = 'kinder';
            //console.log('방 배정 결정: 유치부실 (피아노 먼저)');
          } else {
            // 유치부실 없음 → 드럼실로 (활성화된 빈 방만)
            findEmptySqlRaw = `SELECT * FROM drum_room_status WHERE student_id IS NULL AND is_enabled = true ORDER BY room_no ASC LIMIT 1`;
            roomType = 'drum';
            //console.log('방 배정 결정: 드럼실 (유치부실 만실)');
          }
        } else {
          // 일반 학생: 연습실 확인 (활성화된 빈 방만)
          const practiceCheckSql = `SELECT * FROM practice_room_status WHERE student_id IS NULL AND is_enabled = true ORDER BY room_no ASC LIMIT 1`;
          const practiceRoomRes: any = await (sql as any).query(practiceCheckSql);
          const practiceRoom = Array.isArray(practiceRoomRes) ? practiceRoomRes[0] : (practiceRoomRes?.rows?.[0] ?? null);
          
          if (practiceRoom) {
            // 연습실 있음 → 피아노부터
            findEmptySqlRaw = practiceCheckSql;
            roomType = 'practice';
            //console.log('방 배정 결정: 연습실 (피아노 먼저)');
          } else {
            // 연습실 없음 → 드럼실로 (활성화된 빈 방만)
            findEmptySqlRaw = `SELECT * FROM drum_room_status WHERE student_id IS NULL AND is_enabled = true ORDER BY room_no ASC LIMIT 1`;
            roomType = 'drum';
            //console.log('방 배정 결정: 드럼실 (연습실 만실)');
          }
        }
      }
    } else if (isDrum) {
      // 드럼 수업 → 드럼실
      findEmptySqlRaw = `SELECT * FROM drum_room_status WHERE student_id IS NULL AND is_enabled = true ORDER BY room_no ASC LIMIT 1`;
      roomType = 'drum';
      //console.log('방 배정 결정: 드럼실 (드럼 과정)');
    } else if (isKindergarten) {
      // 유치부 학생의 피아노 관련 과정 → 유치부실
      findEmptySqlRaw = `SELECT * FROM kinder_room_status WHERE student_id IS NULL AND is_enabled = true ORDER BY room_no ASC LIMIT 1`;
      roomType = 'kinder';
      //console.log('방 배정 결정: 유치부실 (유치부 + 피아노 관련 과정)');
    } else {
      // 그 외 → 연습실
      findEmptySqlRaw = `SELECT * FROM practice_room_status WHERE student_id IS NULL AND is_enabled = true ORDER BY room_no ASC LIMIT 1`;
      roomType = 'practice';
      //console.log('방 배정 결정: 연습실 (일반 학생 + 피아노 관련 과정)');
    }
    const findEmptySql = normalizePlaceholderForEnv(findEmptySqlRaw);
    
    if (!findEmptySql) {
      let sqlType: string;
      if (isDrum) {
        sqlType = 'DRUM_FIND_EMPTY_ROOM_SQL';
      } else if (isKindergarten) {
        sqlType = 'KINDER_FIND_EMPTY_ROOM_SQL';
      } else {
        sqlType = 'PRACTICE_FIND_EMPTY_ROOM_SQL';
      }
      throw new Error(`${sqlType} 환경변수가 설정되지 않았습니다.`);
    }
    
    const roomRes: any = await (sql as any).query(findEmptySql);
    let room = Array.isArray(roomRes) ? roomRes[0] : (roomRes?.rows?.[0] ?? null);
    
    if (!room) {
      // 원하는 방이 없을 때 - 드럼실이 아니면 이론실 확인
      if (!isDrum) {
        //console.log('🔍 원하는 방이 없음. 이론실 확인 중...');
        const theoryRoomSqlRaw = process.env.THEORY_FIND_EMPTY_ROOM_SQL;
        const theoryRoomSql = normalizePlaceholderForEnv(theoryRoomSqlRaw);
        
        if (theoryRoomSql) {
          const theoryRoomRes: any = await (sql as any).query(theoryRoomSql);
          const theoryRoom = Array.isArray(theoryRoomRes) ? theoryRoomRes[0] : (theoryRoomRes?.rows?.[0] ?? null);
          
          if (theoryRoom) {
            //console.log(`✅ 이론실 ${theoryRoom.room_no}번 발견. 이론실로 입실 처리`);
            room = theoryRoom;
            roomType = 'theory'; // 이론실로 변경
          } else {
            //console.log('⚠️ 이론실도 만실');
          }
        }
      }
      
      // 이론실도 없으면 입실 불가
      if (!room) {
        return `${student.student_name}님 반갑습니다.\n현재 모든 방이 사용 중입니다. 잠시 후 다시 시도해주세요.`;
      }
    }

    // 방이 있으면 입실 처리 (퇴실 시간 포함)
    let updSqlRaw: string | undefined;
    if (roomType === 'theory') {
      // 이론실 업데이트
      updSqlRaw = process.env.THEORY_UPDATE_ENTRANCE_WITH_OUT_TIME_SQL || process.env.THEORY_UPDATE_ENTRANCE_SQL;
    } else if (isDrum) {
      // 드럼실 업데이트 (유치부든 아니든 드럼 과정이면 드럼실)
      updSqlRaw = process.env.DRUM_UPDATE_ENTRANCE_WITH_OUT_TIME_SQL || process.env.DRUM_UPDATE_ENTRANCE_SQL;
    } else if (isKindergarten) {
      // 유치부실 업데이트 (유치부의 피아노 관련 과정)
      updSqlRaw = process.env.KINDER_UPDATE_ENTRANCE_WITH_OUT_TIME_SQL || process.env.KINDER_UPDATE_ENTRANCE_SQL;
    } else {
      // 연습실 업데이트 (일반 학생의 피아노 관련 과정)
      updSqlRaw = process.env.PRACTICE_UPDATE_ENTRANCE_WITH_OUT_TIME_SQL || process.env.PRACTICE_UPDATE_ENTRANCE_SQL;
    }
    
    const updSql = normalizePlaceholderForEnv(updSqlRaw);
    
    if (!updSql) {
      let sqlType: string;
      if (roomType === 'theory') {
        sqlType = 'THEORY_UPDATE_ENTRANCE_SQL';
      } else if (isDrum) {
        sqlType = 'DRUM_UPDATE_ENTRANCE_SQL';
      } else if (isKindergarten) {
        sqlType = 'KINDER_UPDATE_ENTRANCE_SQL';
      } else {
        sqlType = 'PRACTICE_UPDATE_ENTRANCE_SQL';
      }
      throw new Error(`${sqlType} 환경변수가 설정되지 않았습니다.`);
    }
    
    //console.log('Executing SQL:', updSql);
    //console.log('Parameters:', [studentId, student.student_name, toKSTISOString(normalizedInTime), toKSTISOString(calculatedOutTime), room.room_no]);
    //console.log('Original time:', toKSTISOString(now), '→ Normalized time:', toKSTISOString(normalizedInTime));
    //console.log('Calculated out time:', toKSTISOString(calculatedOutTime));
    
    // SQL 쿼리가 out_time을 포함하는지 확인하고 적절한 파라미터 전달
    if (updSql.includes('out_time')) {
      // out_time을 포함하는 쿼리
      await (sql as any).query(updSql, [studentId, student.student_name, toKSTISOString(normalizedInTime), toKSTISOString(calculatedOutTime), room.room_no]);
    } else {
      // 기존 쿼리 (out_time 미포함)
      await (sql as any).query(updSql, [studentId, student.student_name, toKSTISOString(normalizedInTime), room.room_no]);
    }

    // 대기열에서 제거 (입실 완료)
    // 단, 이론실 입실 시에는 제거하지 않음 (이론실 자체가 대기 공간)
    if (roomType !== 'theory') {
      const queueType = isDrum ? 'drum' : (isKindergarten ? 'kinder' : 'piano');
      //console.log(`대기열 제거: studentId=${studentId}, queueType=${queueType}`);
      try {
        await removeFromWaitingQueue(sql, studentId, queueType);
        await reorderWaitingQueue(sql, queueType);
        //console.log(`✅ 대기열 제거 완료: ${queueType}`);
      } catch (error) {
        console.error('Failed to remove from waiting queue:', error);
      }
    } else {
      //console.log(`ℹ️ 이론실 입실이므로 대기열에서 제거하지 않음`);
    }

    // 출석 기록 생성
    //console.log('\n📝 출석 기록 생성 시작...');
    try {
      const lessonNameMap: Record<number,string> = {1:'피아노+이론',2:'피아노+드럼',3:'드럼',4:'피아노',5:'연습만'};
      const lessonName = lessonNameMap[lessonCode] || '수업';
      
      // remark에 방 타입 명시 (이론실/드럼실 구분을 위해)
      let remarkPrefix = '';
      if (roomType === 'theory') remarkPrefix = '이론실 ';
      else if (roomType === 'drum') remarkPrefix = '드럼실 ';
      
      const attendanceData = {
        attendance_date: toKSTISOString(normalizedInTime).slice(0, 10), // YYYY-MM-DD 형식
        student_id: studentId,
        student_name: student.student_name,
        student_grade: student.student_grade,
        course_name: lessonName,
        in_time: toKSTISOString(normalizedInTime),
        actual_in_time: toKSTISOString(normalizedInTime), // 실제 입실 시간 (KST)
        out_time: toKSTISOString(calculatedOutTime),
        actual_out_time: null, // 입실 시에는 null, 퇴실 시에 실제 시간 기록
        remark: `${remarkPrefix}${room.room_no}번`
      };
      
      //console.log('📋 출석 데이터:', JSON.stringify(attendanceData, null, 2));
      
      await insertAttendance(sql, attendanceData);
      
      //console.log('✅ 출석 기록 생성 완료!');
    } catch (error) {
      console.error('❌ 출석 기록 생성 실패:', error);
      console.error('에러 상세:', error instanceof Error ? error.message : String(error));
      // 출석 기록 생성 실패해도 입실은 성공으로 처리
    }

    // 5) 입실 타입 판단 및 메시지 구성
    // const lessonNameMap... (이미 상단에서 정의됨)
    const lessonNameForMsg = lessonNameMap[lessonCode] || '수업';
    
    // 오늘 출석 기록 확인 (중도입실 판단)
    // const today... (이미 상단에서 정의됨)
    let todayAttendance: any[] = [];
    
    //console.log(`\n🔔 입실 메시지 생성: 날짜=${today}, 학생ID=${studentId}`);
    
    try {
      const attendanceSql = normalizePlaceholderForEnv(process.env.SELECT_ATTENDANCE_BY_DATE_SQL);
      if (attendanceSql) {
        const attendanceResult = await (sql as any).query(attendanceSql, [today]);
        const allAttendance = Array.isArray(attendanceResult) ? attendanceResult : (attendanceResult?.rows || []);
        todayAttendance = allAttendance.filter((record: any) => record.student_id === studentId);
        
        //console.log(`📊 메시지용 출석 기록: 전체=${allAttendance.length}개, 해당학생=${todayAttendance.length}개`);
        if (todayAttendance.length > 0) {
          //console.log('📝 해당 학생 출석 기록:', JSON.stringify(todayAttendance, null, 2));
        }
      }
    } catch (error) {
      console.error('출석 기록 조회 실패:', error);
    }
    
    // 완료된 세션 (실제 퇴실한 기록) 확인 - actual_out_time만 확인
    const completedSessions = todayAttendance.filter((record: any) => {
      // 실제 퇴실 시간(actual_out_time)이 있어야만 완료된 세션으로 간주
      // out_time은 입실 시 자동 계산되므로 완료 여부 판단에 사용하면 안됨
      const hasActualOutTime = record.actual_out_time !== null && record.actual_out_time !== undefined;
      //console.log(`  - 메시지용 레코드 ${record.attendance_num}: actual_out_time=${record.actual_out_time}, 완료=${hasActualOutTime}`);
      return hasActualOutTime;
    });
    
    //console.log(`✅ 메시지용 완료된 세션: ${completedSessions.length}개`);
    
    if (completedSessions.length > 0) {
      // 중도입실 - 이전에 퇴실한 기록이 있음
      
      // 모든 완료된 세션의 시간을 합산
      let totalAttendedMinutes = 0;
      //console.log(`📌 메시지용 모든 완료된 세션의 시간 합산:`);
      
      completedSessions.forEach((session: any) => {
        if (session.in_time && session.actual_out_time) {
          const inTime = new Date(session.in_time);
          const outTime = new Date(session.actual_out_time);
          
          const durationMinutes = Math.floor((outTime.getTime() - inTime.getTime()) / (1000 * 60));
          
          if (durationMinutes < 0) {
            console.error(`❌ 메시지용 세션 #${session.attendance_num}: 음수 시간 (무시)`);
          } else {
            totalAttendedMinutes += durationMinutes;
            //console.log(`   - 세션 #${session.attendance_num}: ${durationMinutes}분`);
          }
        }
      });
      
      //console.log(`✅ 메시지용 총 수강 시간: ${totalAttendedMinutes}분`);
      
      // 중도입실 메시지
      const roomTypeKorean = roomType === 'theory' ? '이론실' : (isDrum ? '드럼실' : (isKindergarten ? '유치부실' : '연습실'));
      return `진행된 연습시간 ${totalAttendedMinutes}분입니다. ${student.student_name}님 또 만나네요? 오늘의 학습은 "${lessonNameForMsg}"입니다. (${roomTypeKorean} ${room.room_no}번)`;
      
    } else {
      // 일반입실 - 오늘 첫 입실
      const roomTypeKorean = roomType === 'theory' ? '이론실' : (isDrum ? '드럼실' : (isKindergarten ? '유치부실' : '연습실'));
      return `${student.student_name}님 반갑습니다.\n오늘의 학습은 "${lessonNameForMsg}" 입니다. (${roomTypeKorean} ${room.room_no}번)`;
    }
  } catch (e: any) {
    console.error('processEntrance error', e);
    return '오류가 발생했습니다. (입실)';
  }
}

function normalizePlaceholderForEnv(raw: string | undefined): string {
  const input = (raw || '').trim();
  if (!input) return '';
  
  // PowerShell에서 이스케이프된 \$ 를 $ 로 변환
  let normalized = input.replace(/\\\$/g, '$');
  
  // 백틱으로 감싸진 $1, $2 등을 정리
  normalized = normalized.replace(/`(\$\d+)/g, '$1');
  
  // 추가적인 이스케이프 문자 정리
  normalized = normalized.replace(/\\"/g, '"');
  
  return normalized;
}

// 대기열에서 수동 삭제
export async function removeFromWaitingQueueAction(queueId: string, studentId: string, queueType: 'piano' | 'kinder' | 'drum') {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    // 대기열에서 해당 학생 제거
    await removeFromWaitingQueue(sql, studentId, queueType);
    
    // 대기열 순서 재정렬
    await reorderWaitingQueue(sql, queueType);
    
    //console.log(`대기열에서 학생 ${studentId} 삭제 완료 (타입: ${queueType})`);
    
    return { success: true, message: '대기열에서 삭제되었습니다.' };
  } catch (error) {
    console.error('대기열 삭제 오류:', error);
    return { success: false, message: '삭제 중 오류가 발생했습니다.' };
  }
}



