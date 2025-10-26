'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { neon } from '@neondatabase/serverless';
import { insertWaitingQueue, removeFromWaitingQueue, reorderWaitingQueue } from '@/app/lib/sql/maps/waitingQueueQueries';
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
    if (!selStudentSql) return '[환경설정 누락] SELECT_STUDENT_BY_ID_SQL';
    const stuRes: any = await (sql as any).query(selStudentSql, [studentId]);
    const student = Array.isArray(stuRes) ? stuRes[0] : (stuRes?.rows?.[0] ?? null);
    if (!student) return '등록된 수강생이 아닙니다.';

    // 2) 요일별 과정 조회
    const dayCode = ((new Date().getDay() + 6) % 7) + 1; // 월=1..일=7
    const selCourseSql = normalizePlaceholderForEnv(process.env.SELECT_STUDENT_COURSE_BY_DAY_SQL);
    if (!selCourseSql) return '[환경설정 누락] SELECT_STUDENT_COURSE_BY_DAY_SQL';
    const courseRes: any = await (sql as any).query(selCourseSql, [studentId, dayCode]);
    const course = Array.isArray(courseRes) ? courseRes[0] : (courseRes?.rows?.[0] ?? null);
    if (!course) return `${student.student_name}님 반갑습니다. 오늘은 수업이 없습니다.`;

    const lessonCode: number = Number(course.lesson_code);
    const now = new Date();

    // 3) 중복 입실 체크: 이미 입실한 학생인지 확인
    const isDrum = lessonCode === 3;
    const checkEntranceSqlRaw = isDrum
      ? process.env.DRUM_CHECK_STUDENT_ENTRANCE_SQL
      : process.env.PRACTICE_CHECK_STUDENT_ENTRANCE_SQL;
    const checkEntranceSql = normalizePlaceholderForEnv(checkEntranceSqlRaw);
    if (checkEntranceSql) {
      const entranceRes: any = await (sql as any).query(checkEntranceSql, [studentId]);
      const alreadyEntered = Array.isArray(entranceRes) ? entranceRes[0] : (entranceRes?.rows?.[0] ?? null);
      if (alreadyEntered) return '이미 수강 중인 학생입니다.';
    }

    // 4) 방 배정: 레슨에 따라 테이블 결정 (1:피아노+이론,2:피아노+드럼,3:드럼,4:피아노)
    //    ENV에 정의된 쿼리 사용 (노출 방지)
    const findEmptySqlRaw = isDrum
      ? process.env.DRUM_FIND_EMPTY_ROOM_SQL
      : process.env.PRACTICE_FIND_EMPTY_ROOM_SQL;
    const findEmptySql = normalizePlaceholderForEnv(findEmptySqlRaw);
    if (!findEmptySql) return isDrum ? '[환경설정 누락] DRUM_FIND_EMPTY_ROOM_SQL' : '[환경설정 누락] PRACTICE_FIND_EMPTY_ROOM_SQL';
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

    // 방이 있으면 입실 처리
    const updSqlRaw = isDrum
      ? process.env.DRUM_UPDATE_ENTRANCE_SQL
      : process.env.PRACTICE_UPDATE_ENTRANCE_SQL;
    const updSql = normalizePlaceholderForEnv(updSqlRaw);
    if (!updSql) return isDrum ? '[환경설정 누락] DRUM_UPDATE_ENTRANCE_SQL' : '[환경설정 누락] PRACTICE_UPDATE_ENTRANCE_SQL';
    await (sql as any).query(updSql, [studentId, student.student_name, now.toISOString(), room.room_no]);

    // 대기열에서 제거 (입실 완료)
    const queueType = isDrum ? 'drum' : (lessonCode === 1 || lessonCode === 4 ? 'piano' : 'piano');
    try {
      await removeFromWaitingQueue(sql, studentId, queueType);
      await reorderWaitingQueue(sql, queueType);
    } catch (error) {
      console.error('Failed to remove from waiting queue:', error);
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
  let normalized = input.replace(/\\\$(\d+)/g, (_m, d) => `$${d}`);
  normalized = normalized.replace(/`(\$\d+)/g, (_m, g1) => g1);
  return normalized;
}


