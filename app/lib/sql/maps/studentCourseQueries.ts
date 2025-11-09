// 수강생 과정 정보 매핑 레이어
require('dotenv').config({ path: './.env.development.local' });

function normalizePlaceholders(raw: string | undefined): string {
  const input = (raw || '').trim();
  if (!input) return '';
  // PowerShell에서 `$1`이 사라지거나, 백틱(`$1) 또는 백슬래시(\$1)로 저장된 경우를 복원
  let normalized = input.replace(/\\\$(\d+)/g, (_m, d) => `$${d}`);
  normalized = normalized.replace(/`(\$\d+)/g, (_m, g1) => g1);
  return normalized;
}

export async function deleteStudentCourses(sql: any, studentId: string) {
  const delSql = normalizePlaceholders(process.env.DELETE_STUDENT_COURSES_SQL);
  if (!delSql) throw new Error('DELETE_STUDENT_COURSES_SQL is not set');
  return (sql as any).query(delSql, [studentId]);
}

export async function insertStudentCourse(
  sql: any,
  studentId: string,
  courseCode: number,  // 변경: slot_no -> course_code
  dayCode: number,
  lessonCode: number,
) {
  const insSql = normalizePlaceholders(process.env.INSERT_STUDENT_COURSE_SQL);
  if (!insSql) throw new Error('INSERT_STUDENT_COURSE_SQL is not set');
  // 기대 SQL: INSERT INTO student_courses (student_id, course_code, day_code, lesson_code) VALUES ($1,$2,$3,$4)
  return (sql as any).query(insSql, [studentId, courseCode, dayCode, lessonCode]);
}

export function dayToCode(day: string): number {
  const map: Record<string, number> = {
    '월요일': 1,
    '화요일': 2,
    '수요일': 3,
    '목요일': 4,
    '금요일': 5,
    '토요일': 6,
    '일요일': 7,
  };
  return map[day] || 0;
}

export function lessonToCode(lesson: string): number {
  const map: Record<string, number> = {
    '피아노+이론': 1,
    '피아노+드럼': 2,
    '드럼': 3,
    '피아노': 4,
    '연습만': 5,
  };
  return map[lesson] || 0;
}

export function codeToDay(code: number): string {
  const map: Record<number, string> = {
    1: '월요일',
    2: '화요일',
    3: '수요일',
    4: '목요일',
    5: '금요일',
    6: '토요일',
    7: '일요일',
  };
  return map[code] || '';
}

export function codeToLesson(code: number): string {
  const map: Record<number, string> = {
    1: '피아노+이론',
    2: '피아노+드럼',
    3: '드럼',
    4: '피아노',
    5: '연습만',
  };
  return map[code] || '';
}

export async function selectStudentCourses(sql: any, studentId: string) {
  const selSql = normalizePlaceholders(process.env.SELECT_STUDENT_COURSES_SQL);
  if (!selSql) throw new Error('SELECT_STUDENT_COURSES_SQL is not set');
  return (sql as any).query(selSql, [studentId]);
}


