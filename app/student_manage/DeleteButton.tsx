'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteStudent } from './actions';

export default function DeleteButton({ studentId, className }: { studentId: string; className?: string; }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('studentId', studentId);
      const res = await deleteStudent(formData);
      if (res?.ok) {
        alert('회원이 삭제되었습니다.');
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


