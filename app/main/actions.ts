'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { neon } from '@neondatabase/serverless';
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

    // 3) 방 배정: 레슨에 따라 테이블 결정 (1:피아노+이론,2:피아노+드럼,3:드럼,4:피아노)
    //    ENV에 정의된 쿼리 사용 (노출 방지)
    const isDrum = lessonCode === 3;
    const findEmptySqlRaw = isDrum
      ? process.env.DRUM_FIND_EMPTY_ROOM_SQL
      : process.env.PRACTICE_FIND_EMPTY_ROOM_SQL;
    const findEmptySql = normalizePlaceholderForEnv(findEmptySqlRaw);
    if (!findEmptySql) return isDrum ? '[환경설정 누락] DRUM_FIND_EMPTY_ROOM_SQL' : '[환경설정 누락] PRACTICE_FIND_EMPTY_ROOM_SQL';
    const roomRes: any = await (sql as any).query(findEmptySql);
    const room = Array.isArray(roomRes) ? roomRes[0] : (roomRes?.rows?.[0] ?? null);
    if (!room) return `${student.student_name}님 반갑습니다. 현재 배정 가능한 방이 없습니다.`;

    const updSqlRaw = isDrum
      ? process.env.DRUM_UPDATE_ENTRANCE_SQL
      : process.env.PRACTICE_UPDATE_ENTRANCE_SQL;
    const updSql = normalizePlaceholderForEnv(updSqlRaw);
    if (!updSql) return isDrum ? '[환경설정 누락] DRUM_UPDATE_ENTRANCE_SQL' : '[환경설정 누락] PRACTICE_UPDATE_ENTRANCE_SQL';
    await (sql as any).query(updSql, [studentId, student.student_name, now.toISOString(), room.room_no]);

    // 4) 메시지 구성
    const lessonNameMap: Record<number,string> = {1:'피아노+이론',2:'피아노+드럼',3:'드럼',4:'피아노'};
    const lessonName = lessonNameMap[lessonCode] || '수업';
    return `${student.student_name}님 반갑습니다. 오늘의 학습은 "${lessonName}" 입니다.`;
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


