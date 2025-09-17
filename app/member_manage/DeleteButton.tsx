'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteMember } from './actions';

export default function DeleteButton({ loginId, className }: { loginId: string; className?: string; }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (!confirm(`정말로 '${loginId}' 계정을 삭제하시겠습니까?`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('loginId', loginId);
      const res = await deleteMember(fd);
      if (res?.ok) {
        alert('강사 계정이 삭제되었습니다.');
        router.refresh();
      } else {
        alert(res?.message || '삭제 중 오류가 발생했습니다.');
      }
    });
  };

  return (
    <button type="button" className={className} onClick={handleClick} disabled={isPending}>
      {isPending ? '삭제 중...' : '삭제'}
    </button>
  );
}


