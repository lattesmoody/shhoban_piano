// 학생 관련 DB 쿼리 매핑 레이어
require('dotenv').config({ path: './.env.development.local' }); 

function normalizePlaceholders(raw: string | undefined): string {
  const input = (raw || '').trim();
  if (!input) return '';
  let normalized = input.replace(/\\\$(\d+)/g, (_m, d) => `$${d}`);
  normalized = normalized.replace(/`(\$\d+)/g, (_m, g1) => g1);
  return normalized;
}

// DB 결과 형태 타입 (쿼리 컬럼과 동일)
export type StudentRow = {
  student_num: number;
  student_name: string;
  student_id: string;
  student_school: string | null;
  student_grade: number | null;
  member_id: string | null;
  member_name: string | null; // COALESCE 별칭
  course_code: number | null;
  vehicle_yn: boolean | null;
  special_notes: string | null;
  is_active: boolean | null;
  created_time: string | null;
};

// 활성화된 학생 목록을 조회하는 함수 (memberQueries.ts와 동일한 스타일)
export async function selectActiveStudents(sql: any): Promise<StudentRow[]> {
  const envSql = process.env.SELECT_ACTIVE_STUDENTS_SQL;
  if (envSql && envSql.trim().length > 0) {
    const result = await (sql as any).query(envSql);
    const rows: any[] = Array.isArray(result)
      ? result
      : (result && (result as any).rows && Array.isArray((result as any).rows) ? (result as any).rows : []);
    return rows as StudentRow[];
  }
  throw new Error('SELECT_ACTIVE_STUDENTS_SQL 환경변수가 설정되지 않았습니다. 운영/개발 환경변수에 SQL을 등록해 주세요.');
}

export async function deleteStudentById(sql: any, studentId: string): Promise<void> {
  const envSql = normalizePlaceholders(process.env.DELETE_STUDENT_BY_ID_SQL);
  if (!envSql) {
    throw new Error('DELETE_STUDENT_BY_ID_SQL 환경변수가 설정되지 않았습니다.');
  }
  await (sql as any).query(envSql, [studentId]);
}

