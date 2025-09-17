'use client';

import React from 'react';

export default function EditButton({ memberId, className }: { memberId: string; className?: string; }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => alert(`수정 클릭: 아이디 ${memberId}`)}
    >
      수정
    </button>
  );
}


