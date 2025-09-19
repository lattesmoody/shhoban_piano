// 로컬/운영 공통 SQL 매핑: 연습실 관리
require('dotenv').config({ path: './.env.development.local' });

function normalizePlaceholders(raw: string | undefined): string {
  const input = (raw || '').trim();
  if (!input) return '';
  let normalized = input.replace(/\\\$(\d+)/g, (_m, d) => `$${d}`);
  normalized = normalized.replace(/`(\$\d+)/g, (_m, g1) => g1);
  return normalized;
}

export type PracticeRow = {
  room_no: number;
  student_name: string | null;
  student_id: string | null;
  in_time: string | null;
  out_time: string | null;
  turns: number;
  is_enabled: boolean;
  usage_yn: number;
};

// 오늘 날짜 기준 목록 조회
export async function selectPracticeStatusToday(sql: any): Promise<PracticeRow[]> {
  const envSql = normalizePlaceholders(process.env.SELECT_PRACTICE_STATUS_TODAY_SQL);
  if (!envSql) throw new Error('SELECT_PRACTICE_STATUS_TODAY_SQL 환경변수가 설정되지 않았습니다.');
  const result = await (sql as any).query(envSql);
  const rows: any[] = Array.isArray(result)
    ? result
    : (result && (result as any).rows && Array.isArray((result as any).rows) ? (result as any).rows : []);
  return rows as PracticeRow[];
}

export async function deletePracticeStatus(sql: any, roomNo: number): Promise<void> {
  const envSql = normalizePlaceholders(process.env.DELETE_PRACTICE_STATUS_SQL);
  if (!envSql) throw new Error('DELETE_PRACTICE_STATUS_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql, [roomNo]);
}

export async function activatePracticeStatus(sql: any, roomNo: number): Promise<void> {
  const envSql = normalizePlaceholders(process.env.ACTIVATE_PRACTICE_STATUS_SQL);
  if (!envSql) throw new Error('ACTIVATE_PRACTICE_STATUS_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql, [roomNo]);
}

export async function deactivatePracticeStatus(sql: any, roomNo: number): Promise<void> {
  const envSql = normalizePlaceholders(process.env.DEACTIVATE_PRACTICE_STATUS_SQL);
  if (!envSql) throw new Error('DEACTIVATE_PRACTICE_STATUS_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql, [roomNo]);
}

export async function setAllEmpty(sql: any): Promise<void> {
  const envSql = normalizePlaceholders(process.env.PRACTICE_SET_ALL_EMPTY_SQL);
  if (!envSql) throw new Error('PRACTICE_SET_ALL_EMPTY_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql);
}

export async function setAllLecture(sql: any): Promise<void> {
  const envSql = normalizePlaceholders(process.env.PRACTICE_SET_ALL_LECTURE_SQL);
  if (!envSql) throw new Error('PRACTICE_SET_ALL_LECTURE_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql);
}


