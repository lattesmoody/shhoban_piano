// 대기열 관리 SQL 매핑 (ENV 기반 쿼리)
require('dotenv').config({ path: './.env.development.local' });

function normalizePlaceholders(raw: string | undefined): string {
  const input = (raw || '').trim();
  if (!input) return '';
  let normalized = input.replace(/\\\$(\d+)/g, (_m, d) => `$${d}`);
  normalized = normalized.replace(/`(\$\d+)/g, (_m, g1) => g1);
  return normalized;
}

export type WaitingQueueRow = {
  queue_id: number | string; // number (DB) 또는 string (이론실 임시 ID)
  student_id: string;
  student_name: string;
  student_grade: number | null;
  lesson_type: number;
  queue_type: string;
  queue_number: number;
  wait_start_time: string;
  estimated_wait_time: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  member_id: string | null; // 담당 강사 ID (이론실 학생용)
};

// 대기열 조회 (타입별)
export async function selectWaitingQueue(sql: any, queueType: string): Promise<WaitingQueueRow[]> {
  const envSql = normalizePlaceholders(process.env.SELECT_WAITING_QUEUE_SQL);
  if (!envSql) throw new Error('SELECT_WAITING_QUEUE_SQL 환경변수가 설정되지 않았습니다.');
  
  const result = await (sql as any).query(envSql, [queueType]);
  const rows: any[] = Array.isArray(result) ? result : (result && (result as any).rows ? (result as any).rows : []);
  return rows as WaitingQueueRow[];
}

// 대기열 추가
export async function insertWaitingQueue(sql: any, params: {
  student_id: string;
  student_name: string;
  student_grade: number | null;
  lesson_type: number;
  queue_type: string;
}): Promise<void> {
  // 먼저 다음 대기 번호 조회
  const nextNumberSql = normalizePlaceholders(process.env.GET_NEXT_QUEUE_NUMBER_SQL);
  if (!nextNumberSql) throw new Error('GET_NEXT_QUEUE_NUMBER_SQL 환경변수가 설정되지 않았습니다.');
  
  const numberResult = await (sql as any).query(nextNumberSql, [params.queue_type]);
  const nextNumber = Array.isArray(numberResult) ? numberResult[0]?.next_number : numberResult?.rows?.[0]?.next_number || 1;
  
  const envSql = normalizePlaceholders(process.env.INSERT_WAITING_QUEUE_SQL);
  if (!envSql) throw new Error('INSERT_WAITING_QUEUE_SQL 환경변수가 설정되지 않았습니다.');
  
  await (sql as any).query(envSql, [
    params.student_id,
    params.student_name,
    params.student_grade,
    params.lesson_type,
    params.queue_type,
    nextNumber
  ]);
}

// 대기열에서 제거 (입실 시)
export async function removeFromWaitingQueue(sql: any, studentId: string, queueType: string): Promise<void> {
  const envSql = normalizePlaceholders(process.env.REMOVE_FROM_WAITING_QUEUE_SQL);
  if (!envSql) throw new Error('REMOVE_FROM_WAITING_QUEUE_SQL 환경변수가 설정되지 않았습니다.');
  
  await (sql as any).query(envSql, [studentId, queueType]);
}

// 대기열 번호 재정렬
export async function reorderWaitingQueue(sql: any, queueType: string): Promise<void> {
  const envSql = normalizePlaceholders(process.env.REORDER_WAITING_QUEUE_SQL);
  if (!envSql) throw new Error('REORDER_WAITING_QUEUE_SQL 환경변수가 설정되지 않았습니다.');
  
  await (sql as any).query(envSql, [queueType]);
}
