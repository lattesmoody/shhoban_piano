// 로컬/운영 공통 SQL 매핑: 이론실 관리
require('dotenv').config({ path: './.env.development.local' });

function normalizePlaceholders(raw: string | undefined): string {
  const input = (raw || '').trim();
  if (!input) return '';
  let normalized = input.replace(/\\\$(\d+)/g, (_m: any, d: any) => `$${d}`);
  normalized = normalized.replace(/`(\$\d+)/g, (_m: any, g1: any) => g1);
  return normalized;
}

export type TheoryRow = {
  room_no: number;
  student_name: string | null;
  student_id: string | null;
  student_grade: number | null;
  in_time: string | null;
  out_time: string | null;          // 퇴실 예정 시간 (입실 시 계산)
  actual_out_time: string | null;   // 실제 퇴실 시점 시간 (퇴실 버튼 클릭 시)
  theory_duration: number;          // 이론 진행 시간 (분)
  is_enabled: boolean;
  usage_yn: number;
};

// 이론실 상태 조회
export async function selectTheoryStatus(sql: any): Promise<TheoryRow[]> {
  const envSql = normalizePlaceholders(process.env.SELECT_THEORY_STATUS_SQL);
  if (!envSql) throw new Error('SELECT_THEORY_STATUS_SQL 환경변수가 설정되지 않았습니다.');
  const result = await (sql as any).query(envSql);
  const rows: any[] = Array.isArray(result)
    ? result
    : (result && (result as any).rows && Array.isArray((result as any).rows) ? (result as any).rows : []);
  return rows as TheoryRow[];
}

// 이론실 입실 처리
export async function updateTheoryEntrance(
  sql: any,
  roomNo: number,
  studentId: string,
  studentName: string,
  inTime: string,
  outTime: string
): Promise<void> {
  const envSql = normalizePlaceholders(process.env.THEORY_UPDATE_ENTRANCE_SQL);
  if (!envSql) throw new Error('THEORY_UPDATE_ENTRANCE_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql, [studentId, studentName, inTime, outTime, roomNo]);
}

// 이론실 퇴실 처리 (특정 방)
export async function deleteTheoryStatus(sql: any, roomNo: number): Promise<void> {
  const envSql = normalizePlaceholders(process.env.DELETE_THEORY_STATUS_SQL);
  if (!envSql) throw new Error('DELETE_THEORY_STATUS_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql, [roomNo]);
}

// 이론실 전체 공실 처리
export async function setAllTheoryEmpty(sql: any): Promise<void> {
  const envSql = normalizePlaceholders(process.env.THEORY_SET_ALL_EMPTY_SQL);
  if (!envSql) throw new Error('THEORY_SET_ALL_EMPTY_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql);
}

// 이론실 빈 방 찾기
export async function findEmptyTheoryRoom(sql: any): Promise<{ room_no: number } | null> {
  const envSql = normalizePlaceholders(process.env.THEORY_FIND_EMPTY_ROOM_SQL);
  if (!envSql) throw new Error('THEORY_FIND_EMPTY_ROOM_SQL 환경변수가 설정되지 않았습니다.');
  const result = await (sql as any).query(envSql);
  const rows: any[] = Array.isArray(result)
    ? result
    : (result && (result as any).rows && Array.isArray((result as any).rows) ? (result as any).rows : []);
  return rows.length > 0 ? rows[0] : null;
}

// 학생이 이론실에 입실했는지 확인
export async function checkTheoryEntrance(sql: any, studentId: string): Promise<any | null> {
  const envSql = normalizePlaceholders(process.env.THEORY_CHECK_STUDENT_ENTRANCE_SQL);
  if (!envSql) throw new Error('THEORY_CHECK_STUDENT_ENTRANCE_SQL 환경변수가 설정되지 않았습니다.');
  const result = await (sql as any).query(envSql, [studentId]);
  const rows: any[] = Array.isArray(result)
    ? result
    : (result && (result as any).rows && Array.isArray((result as any).rows) ? (result as any).rows : []);
  return rows.length > 0 ? rows[0] : null;
}

