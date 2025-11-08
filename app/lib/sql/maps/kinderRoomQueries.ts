// 로컬/운영 공통 SQL 매핑: 유치부실 관리
require('dotenv').config({ path: './.env.development.local' });

function normalizePlaceholders(raw: string | undefined): string {
  const input = (raw || '').trim();
  if (!input) return '';
  let normalized = input.replace(/\\\$(\d+)/g, (_m, d) => `$${d}`);
  normalized = normalized.replace(/`(\$\d+)/g, (_m, g1) => g1);
  return normalized;
}

export type KinderRow = {
  room_no: number;
  student_name: string | null;
  student_id: string | null;
  student_grade: number | null;
  in_time: string | null;
  out_time: string | null;          // 퇴실 예정 시간 (입실 시 계산)
  actual_out_time: string | null;   // 실제 퇴실 시점 시간 (퇴실 버튼 클릭 시)
  turns: number;
  is_enabled: boolean;
  usage_yn: number;
};

export async function selectKinderStatus(sql: any): Promise<KinderRow[]> {
  const envSql = normalizePlaceholders(process.env.SELECT_KINDER_STATUS_SQL);
  if (!envSql) throw new Error('SELECT_KINDER_STATUS_SQL 환경변수가 설정되지 않았습니다.');
  const result = await (sql as any).query(envSql);
  const rows: any[] = Array.isArray(result)
    ? result
    : (result && (result as any).rows && Array.isArray((result as any).rows) ? (result as any).rows : []);
  return rows as KinderRow[];
}

export async function deleteKinderStatus(sql: any, roomNo: number): Promise<void> {
  const envSql = normalizePlaceholders(process.env.DELETE_KINDER_STATUS_SQL);
  if (!envSql) throw new Error('DELETE_KINDER_STATUS_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql, [roomNo]);
}

export async function activateKinderStatus(sql: any, roomNo: number): Promise<void> {
  const envSql = normalizePlaceholders(process.env.ACTIVATE_KINDER_STATUS_SQL);
  if (!envSql) throw new Error('ACTIVATE_KINDER_STATUS_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql, [roomNo]);
}

export async function deactivateKinderStatus(sql: any, roomNo: number): Promise<void> {
  const envSql = normalizePlaceholders(process.env.DEACTIVATE_KINDER_STATUS_SQL);
  if (!envSql) throw new Error('DEACTIVATE_KINDER_STATUS_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql, [roomNo]);
}

export async function setAllKinderEmpty(sql: any): Promise<void> {
  const envSql = normalizePlaceholders(process.env.KINDER_SET_ALL_EMPTY_SQL);
  if (!envSql) throw new Error('KINDER_SET_ALL_EMPTY_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql);
}

export async function setAllKinderLecture(sql: any): Promise<void> {
  const envSql = normalizePlaceholders(process.env.KINDER_SET_ALL_LECTURE_SQL);
  if (!envSql) throw new Error('KINDER_SET_ALL_LECTURE_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql);
}


