// 로컬/운영 공통 SQL 매핑: 드럼실 관리
require('dotenv').config({ path: './.env.development.local' });

function normalizePlaceholders(raw: string | undefined): string {
  const input = (raw || '').trim();
  if (!input) return '';
  let normalized = input.replace(/\\\$(\d+)/g, (_m: any, d: any) => `$${d}`);
  normalized = normalized.replace(/`(\$\d+)/g, (_m: any, g1: any) => g1);
  return normalized;
}

export type DrumRow = {
  room_no: number;
  student_name: string | null;
  student_id: string | null;
  student_grade: number | null;
  in_time: string | null;
  out_time: string | null;
  turns: number;
  is_enabled: boolean;
  usage_yn: number;
};

// 오늘(또는 최신) 드럼실 상태 조회
export async function selectDrumStatus(sql: any): Promise<DrumRow[]> {
  const envSql = normalizePlaceholders(process.env.SELECT_DRUM_STATUS_SQL);
  if (!envSql) throw new Error('SELECT_DRUM_STATUS_SQL 환경변수가 설정되지 않았습니다.');
  const result = await (sql as any).query(envSql);
  const rows: any[] = Array.isArray(result)
    ? result
    : (result && (result as any).rows && Array.isArray((result as any).rows) ? (result as any).rows : []);
  return rows as DrumRow[];
}

export async function deleteDrumStatus(sql: any, roomNo: number): Promise<void> {
  const envSql = normalizePlaceholders(process.env.DELETE_DRUM_STATUS_SQL);
  if (!envSql) throw new Error('DELETE_DRUM_STATUS_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql, [roomNo]);
}

export async function setAllDrumEmpty(sql: any): Promise<void> {
  const envSql = normalizePlaceholders(process.env.DRUM_SET_ALL_EMPTY_SQL);
  if (!envSql) throw new Error('DRUM_SET_ALL_EMPTY_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql);
}


