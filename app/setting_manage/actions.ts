'use server';

import { revalidatePath } from 'next/cache';

// 임시: 기능 테스트 중 (실제 초기화 기능은 구현 예정)
export async function resetDailyStatus() {
  //console.log('🔄 일일 수강 현황 초기화 - 테스트 모드');
  
  try {
    // TODO: 실제 초기화 로직 구현 예정
    // 1. 현재 입실 중인 학생들의 actual_out_time 업데이트
    // 2. 모든 방 비우기 (연습실/유치부실/드럼실/이론실)
    // 3. 대기열 초기화
    
    // 임시로 성공 응답만 반환
    await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 대기
    
    revalidatePath('/setting_manage');
    
    return { 
      ok: true, 
      practice: 0,
      kinder: 0,
      drum: 0,
      theory: 0,
      message: '테스트 모드: 실제 초기화는 구현 예정입니다.'
    };
    
  } catch (error) {
    console.error('❌ 오류:', error);
    return { 
      ok: false, 
      message: '오류가 발생했습니다: ' + (error instanceof Error ? error.message : String(error))
    };
  }
}