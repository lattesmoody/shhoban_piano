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
    if (!course) return `${student.student_name}님 반갑습니다. 오늘은 수업이 없습니다.`;

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
            default:
              classDuration = 35;
              break;
          }
        }

        // 최소 수업 시간 보장
        if (classDuration <= 0) classDuration = 35;

        // 퇴실 시간 = 정규화된 입실 시간 + 수업 시간
        const outTime = new Date(normalizedInTime.getTime() + classDuration * 60 * 1000);
        
        console.log(`수업 시간 계산: 학년=${gradeName}, 레슨=${lessonCode}, 시간=${classDuration}분`);
        console.log(`입실: ${normalizedInTime.toISOString()} → 퇴실: ${outTime.toISOString()}`);
        
        return outTime;
      } catch (error) {
        console.error('퇴실 시간 계산 오류:', error);
        // 오류 시 기본 35분 후로 설정
        return new Date(normalizedInTime.getTime() + 35 * 60 * 1000);
      }
    };

    const calculatedOutTime = await calculateOutTime();

    // 3) 중복 입실 체크: 이미 입실한 학생인지 확인
    const isDrum = lessonCode === 3;
    const checkEntranceSqlRaw = isDrum
      ? process.env.DRUM_CHECK_STUDENT_ENTRANCE_SQL
      : process.env.PRACTICE_CHECK_STUDENT_ENTRANCE_SQL;
    const checkEntranceSql = normalizePlaceholderForEnv(checkEntranceSqlRaw);
    
    if (!checkEntranceSql) {
      const sqlType = isDrum ? 'DRUM_CHECK_STUDENT_ENTRANCE_SQL' : 'PRACTICE_CHECK_STUDENT_ENTRANCE_SQL';
      throw new Error(`${sqlType} 환경변수가 설정되지 않았습니다.`);
    }
    
    if (checkEntranceSql) {
      const entranceRes: any = await (sql as any).query(checkEntranceSql, [studentId]);
      const alreadyEntered = Array.isArray(entranceRes) ? entranceRes[0] : (entranceRes?.rows?.[0] ?? null);
      if (alreadyEntered) return '이미 수강 중인 학생입니다.';
    }

    // 4) 방 배정: 레슨에 따라 테이블 결정 (1:피아노+이론,2:피아노+드럼,3:드럼,4:피아노)
    const findEmptySqlRaw = isDrum
      ? process.env.DRUM_FIND_EMPTY_ROOM_SQL
      : process.env.PRACTICE_FIND_EMPTY_ROOM_SQL;
    const findEmptySql = normalizePlaceholderForEnv(findEmptySqlRaw);
    
    if (!findEmptySql) {
      const sqlType = isDrum ? 'DRUM_FIND_EMPTY_ROOM_SQL' : 'PRACTICE_FIND_EMPTY_ROOM_SQL';
      throw new Error(`${sqlType} 환경변수가 설정되지 않았습니다.`);
    }
    
    const roomRes: any = await (sql as any).query(findEmptySql);
    const room = Array.isArray(roomRes) ? roomRes[0] : (roomRes?.rows?.[0] ?? null);
    
    if (!room) {
      // 방이 없으면 대기열에 추가
      const queueType = isDrum ? 'drum' : (lessonCode === 1 || lessonCode === 4 ? 'piano' : 'piano');
      
      try {
        await insertWaitingQueue(sql, {
          student_id: studentId,
          student_name: student.student_name,
          student_grade: student.student_grade,
          lesson_type: lessonCode,
          queue_type: queueType
        });
        
        return `${student.student_name}님 반갑습니다. 현재 배정 가능한 방이 없어 대기열에 등록되었습니다.`;
      } catch (error) {
        console.error('Failed to add to waiting queue:', error);
        return `${student.student_name}님 반갑습니다. 현재 배정 가능한 방이 없습니다.`;
      }
    }

    // 방이 있으면 입실 처리 (퇴실 시간 포함)
    const updSqlRaw = isDrum
      ? (process.env.DRUM_UPDATE_ENTRANCE_WITH_OUT_TIME_SQL || process.env.DRUM_UPDATE_ENTRANCE_SQL)
      : (process.env.PRACTICE_UPDATE_ENTRANCE_WITH_OUT_TIME_SQL || process.env.PRACTICE_UPDATE_ENTRANCE_SQL);
    
    const updSql = normalizePlaceholderForEnv(updSqlRaw);
    
    if (!updSql) {
      const sqlType = isDrum ? 'DRUM_UPDATE_ENTRANCE_SQL' : 'PRACTICE_UPDATE_ENTRANCE_SQL';
      throw new Error(`${sqlType} 환경변수가 설정되지 않았습니다.`);
    }
    
    console.log('Executing SQL:', updSql);
    console.log('Parameters:', [studentId, student.student_name, normalizedInTime.toISOString(), calculatedOutTime.toISOString(), room.room_no]);
    console.log('Original time:', now.toISOString(), '→ Normalized time:', normalizedInTime.toISOString());
    console.log('Calculated out time:', calculatedOutTime.toISOString());
    
    // SQL 쿼리가 out_time을 포함하는지 확인하고 적절한 파라미터 전달
    if (updSql.includes('out_time')) {
      // out_time을 포함하는 쿼리
      await (sql as any).query(updSql, [studentId, student.student_name, normalizedInTime.toISOString(), calculatedOutTime.toISOString(), room.room_no]);
    } else {
      // 기존 쿼리 (out_time 미포함)
      await (sql as any).query(updSql, [studentId, student.student_name, normalizedInTime.toISOString(), room.room_no]);
    }

    // 대기열에서 제거 (입실 완료)
    const queueType = isDrum ? 'drum' : (lessonCode === 1 || lessonCode === 4 ? 'piano' : 'piano');
    try {
      await removeFromWaitingQueue(sql, studentId, queueType);
      await reorderWaitingQueue(sql, queueType);
    } catch (error) {
      console.error('Failed to remove from waiting queue:', error);
    }

    // 출석 기록 생성
    try {
      const lessonNameMap: Record<number,string> = {1:'피아노+이론',2:'피아노+드럼',3:'드럼',4:'피아노'};
      const lessonName = lessonNameMap[lessonCode] || '수업';
      
      await insertAttendance(sql, {
        attendance_date: normalizedInTime.toISOString().slice(0, 10), // YYYY-MM-DD 형식
        student_id: studentId,
        student_name: student.student_name,
        student_grade: student.student_grade,
        course_name: lessonName,
        in_time: normalizedInTime.toISOString(),
        out_time: calculatedOutTime.toISOString(),
        remark: `${room.room_no}번 방`
      });
      
      console.log('출석 기록 생성 완료:', {
        student_name: student.student_name,
        course_name: lessonName,
        in_time: normalizedInTime.toISOString(),
        out_time: calculatedOutTime.toISOString()
      });
    } catch (error) {
      console.error('출석 기록 생성 실패:', error);
      // 출석 기록 생성 실패해도 입실은 성공으로 처리
    }

    // 5) 메시지 구성
    const lessonNameMap: Record<number,string> = {1:'피아노+이론',2:'피아노+드럼',3:'드럼',4:'피아노'};
    const lessonName = lessonNameMap[lessonCode] || '수업';
    return `${student.student_name}님 반갑습니다. 오늘의 학습은 "${lessonName}" 입니다. (${room.room_no}번 방)`;
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
    
    console.log(`대기열에서 학생 ${studentId} 삭제 완료 (타입: ${queueType})`);
    
    return { success: true, message: '대기열에서 삭제되었습니다.' };
  } catch (error) {
    console.error('대기열 삭제 오류:', error);
    return { success: false, message: '삭제 중 오류가 발생했습니다.' };
  }
}


