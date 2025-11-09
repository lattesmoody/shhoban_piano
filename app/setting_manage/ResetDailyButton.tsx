'use client';

import { useState, useTransition } from 'react';
import { resetDailyStatus } from './actions';

interface ResetButtonProps {
  className?: string;
}

export default function ResetDailyButton({ className }: ResetButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    // 1차 확인
    if (!confirm('일일 수강 현황을 초기화 하시겠습니까?')) {
      return;
    }

    // 2차 확인
    if (!confirm('일일 수강 현황을 정말 초기화하시겠습니까?')) {
      return;
    }

    // 초기화 진행
    startTransition(async () => {
      try {
        const result = await resetDailyStatus();
        
        if (result.ok) {
          alert(`초기화 완료!\n\n연습실: ${result.practice || 0}개\n유치부실: ${result.kinder || 0}개\n드럼실: ${result.drum || 0}개\n이론실: ${result.theory || 0}개\n\n모든 방이 비워졌습니다.`);
        } else {
          alert(result.message || '초기화 중 오류가 발생했습니다.');
        }
      } catch (error) {
        console.error('초기화 오류:', error);
        alert('초기화 중 오류가 발생했습니다.');
      }
    });
  };

  return (
    <button 
      type="button" 
      className={className}
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? '초기화 중...' : '일일 수강 현황 초기화'}
    </button>
  );
}

