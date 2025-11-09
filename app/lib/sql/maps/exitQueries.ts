// 퇴실 처리 관련 SQL 매핑
require('dotenv').config({ path: './.env.development.local' });

function normalizePlaceholders(raw: string | undefined): string {
  const input = (raw || '').trim();
  if (!input) return '';
  let normalized = input.replace(/\\\$(\d+)/g, (_m: any, d: any) => `$${d}`);
  normalized = normalized.replace(/`(\$\d+)/g, (_m: any, g1: any) => g1);
  return normalized;
}

export type RoomDataForExit = {
  student_id: string;
  student_name: string;
  in_time: string;
  out_time: string;
};

// 연습실 방 상태 조회 (퇴실 처리용)
export async function selectPracticeRoomForExit(sql: any, roomNo: number): Promise<RoomDataForExit | null> {
  const envSql = normalizePlaceholders(process.env.SELECT_PRACTICE_ROOM_FOR_EXIT_SQL);
  if (!envSql) throw new Error('SELECT_PRACTICE_ROOM_FOR_EXIT_SQL 환경변수가 설정되지 않았습니다.');
  const result = await (sql as any).query(envSql, [roomNo]);
  const rows: any[] = Array.isArray(result)
    ? result
    : (result && (result as any).rows && Array.isArray((result as any).rows) ? (result as any).rows : []);
  return rows.length > 0 ? rows[0] : null;
}

// 유치부실 방 상태 조회 (퇴실 처리용)
export async function selectKinderRoomForExit(sql: any, roomNo: number): Promise<RoomDataForExit | null> {
  const envSql = normalizePlaceholders(process.env.SELECT_KINDER_ROOM_FOR_EXIT_SQL);
  if (!envSql) throw new Error('SELECT_KINDER_ROOM_FOR_EXIT_SQL 환경변수가 설정되지 않았습니다.');
  const result = await (sql as any).query(envSql, [roomNo]);
  const rows: any[] = Array.isArray(result)
    ? result
    : (result && (result as any).rows && Array.isArray((result as any).rows) ? (result as any).rows : []);
  return rows.length > 0 ? rows[0] : null;
}

// 드럼실 방 상태 조회 (퇴실 처리용)
export async function selectDrumRoomForExit(sql: any, roomNo: number): Promise<RoomDataForExit | null> {
  const envSql = normalizePlaceholders(process.env.SELECT_DRUM_ROOM_FOR_EXIT_SQL);
  if (!envSql) throw new Error('SELECT_DRUM_ROOM_FOR_EXIT_SQL 환경변수가 설정되지 않았습니다.');
  const result = await (sql as any).query(envSql, [roomNo]);
  const rows: any[] = Array.isArray(result)
    ? result
    : (result && (result as any).rows && Array.isArray((result as any).rows) ? (result as any).rows : []);
  return rows.length > 0 ? rows[0] : null;
}

// 출석 기록에 actual_out_time 업데이트
export async function updateActualOutTime(
  sql: any,
  actualOutTime: string,
  studentId: string,
  attendanceDate: string
): Promise<void> {
  const envSql = normalizePlaceholders(process.env.UPDATE_ACTUAL_OUT_TIME_SQL);
  if (!envSql) throw new Error('UPDATE_ACTUAL_OUT_TIME_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql, [actualOutTime, studentId, attendanceDate]);
}

