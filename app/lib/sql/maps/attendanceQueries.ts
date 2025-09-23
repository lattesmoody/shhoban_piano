// 출석(등원/하원) 매핑 (ENV 기반 쿼리)
require('dotenv').config({ path: './.env.development.local' });

function normalizePlaceholders(raw: string | undefined): string {
  const input = (raw || '').trim();
  if (!input) return '';
  let normalized = input.replace(/\\\$(\d+)/g, (_m, d) => `$${d}`);
  normalized = normalized.replace(/`(\$\d+)/g, (_m, g1) => g1);
  return normalized;
}

export type AttendanceRow = {
  attendance_num: number;
  attendance_date: string;
  student_id: string;
  student_name: string;
  student_grade: number | null;
  course_name: string | null;
  in_time: string | null;
  out_time: string | null;
  remark: string | null;
};

// 날짜별 목록 조회
export async function selectAttendanceByDate(sql: any, y: number, m: number, d: number): Promise<AttendanceRow[]> {
  const envSql = normalizePlaceholders(process.env.SELECT_ATTENDANCE_BY_DATE_SQL);
  if (!envSql) throw new Error('SELECT_ATTENDANCE_BY_DATE_SQL 환경변수가 설정되지 않았습니다.');
  const dateParam = new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0,10);
  const result = await (sql as any).query(envSql, [dateParam]);
  const rows: any[] = Array.isArray(result)
    ? result
    : ((result && (result as any).rows) ? (result as any).rows : []);
  return rows as AttendanceRow[];
}

// 등원/하원 기록 upsert는 케이스에 따라 별도 구현 가능. 여기서는 단순 insert를 예시로 제공
export async function insertAttendance(sql: any, payload: Omit<AttendanceRow, 'attendance_num' | 'attendance_date'> & { attendance_date: string }): Promise<void> {
  const envSql = normalizePlaceholders(process.env.INSERT_ATTENDANCE_SQL);
  if (!envSql) throw new Error('INSERT_ATTENDANCE_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql, [
    payload.attendance_date,
    payload.student_id,
    payload.student_name,
    payload.student_grade,
    payload.course_name,
    payload.in_time,
    payload.out_time,
    payload.remark,
  ]);
}


