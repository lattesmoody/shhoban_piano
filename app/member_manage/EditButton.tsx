'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function EditButton({ memberId, memberName, roleCode, className }: { memberId: string; memberName: string; roleCode: number; className?: string; }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const q = new URLSearchParams({
          memberId,
          memberName,
          roleCode: String(roleCode),
        });
        router.push(`/member_update_form?${q.toString()}`);
      }}
    >
      수정
    </button>
  );
}


