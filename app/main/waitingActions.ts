'use server';

import { neon } from '@neondatabase/serverless';
import { removeFromWaitingQueue, reorderWaitingQueue } from '@/app/lib/sql/maps/waitingQueueQueries';
import { revalidatePath } from 'next/cache';

// 환경변수 로드
require('dotenv').config({ path: './.env.development.local' });

function normalizePlaceholders(raw: string | undefined): string {
  const input = (raw || '').trim();
  if (!input) return '';
  let normalized = input.replace(/\\\$(\d+)/g, (_m, d) => `$${d}`);
  normalized = normalized.replace(/`(\$\d+)/g, (_m, g1) => g1);
  return normalized;
}

// 대기열에서 학생 제거 (취소)
export async function cancelWaiting(studentId: string, queueType: string): Promise<string> {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    // 대기열에서 제거
    await removeFromWaitingQueue(sql, studentId, queueType);
    
    // 대기 번호 재정렬
    await reorderWaitingQueue(sql, queueType);
    
    // 페이지 새로고침
    revalidatePath('/main');
    
    return '대기가 취소되었습니다.';
  } catch (error) {
    console.error('Failed to cancel waiting:', error);
    return '대기 취소 중 오류가 발생했습니다.';
  }
}

// 대기열 순서 변경
export async function moveWaitingOrder(studentId: string, queueType: string, direction: 'up' | 'down'): Promise<string> {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    // 현재 학생의 대기 번호 조회
    const currentQueueSql = normalizePlaceholders(process.env.GET_CURRENT_QUEUE_NUMBER_SQL);
    if (!currentQueueSql) throw new Error('GET_CURRENT_QUEUE_NUMBER_SQL 환경변수가 설정되지 않았습니다.');
    
    const currentResult = await (sql as any).query(currentQueueSql, [studentId, queueType]);
    const currentQueue = Array.isArray(currentResult) ? currentResult[0] : currentResult?.rows?.[0];
    
    if (!currentQueue) {
      return '대기 중인 학생을 찾을 수 없습니다.';
    }
    
    const currentNumber = currentQueue.queue_number;
    const targetNumber = direction === 'up' ? currentNumber - 1 : currentNumber + 1;
    
    // 대상 학생 조회
    const targetQueueSql = normalizePlaceholders(process.env.GET_TARGET_QUEUE_STUDENT_SQL);
    if (!targetQueueSql) throw new Error('GET_TARGET_QUEUE_STUDENT_SQL 환경변수가 설정되지 않았습니다.');
    
    const targetResult = await (sql as any).query(targetQueueSql, [targetNumber, queueType]);
    const targetQueue = Array.isArray(targetResult) ? targetResult[0] : targetResult?.rows?.[0];
    
    if (!targetQueue) {
      return direction === 'up' ? '이미 첫 번째 순서입니다.' : '이미 마지막 순서입니다.';
    }
    
    // 순서 교환
    const swapSql = normalizePlaceholders(process.env.SWAP_QUEUE_ORDER_SQL);
    if (!swapSql) throw new Error('SWAP_QUEUE_ORDER_SQL 환경변수가 설정되지 않았습니다.');
    
    await (sql as any).query(swapSql, [studentId, targetQueue.student_id, targetNumber, currentNumber, queueType]);
    
    // 페이지 새로고침
    revalidatePath('/main');
    
    return '순서가 변경되었습니다.';
  } catch (error) {
    console.error('Failed to move waiting order:', error);
    return '순서 변경 중 오류가 발생했습니다.';
  }
}
