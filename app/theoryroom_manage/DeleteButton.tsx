'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteTheoryStatus } from './actions';
import styles from './page.module.css';

export default function DeleteButton({ roomNo, studentName }: { roomNo: number; studentName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  
  return (
    <button
      className={`${styles.btn} ${styles.btnDelete}`}
      onClick={() => {
        if (confirm(`${studentName}님을 이론실에서 퇴실 처리하시겠습니까?`)) {
          start(async () => {
            await deleteTheoryStatus(roomNo);
            alert('퇴실 처리되었습니다.');
            router.refresh();
          });
        }
      }}
      disabled={pending}
    >
      삭제
    </button>
  );
}

