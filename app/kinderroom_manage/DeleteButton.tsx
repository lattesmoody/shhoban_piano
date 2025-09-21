'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteStatus } from './actions';
import styles from './page.module.css';

export default function DeleteButton({ roomNo }: { roomNo: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className={`${styles.btn} ${styles.btnDelete}`}
      onClick={() =>
        start(async () => {
          await deleteStatus(roomNo);
          alert('삭제되었습니다.');
          router.refresh();
        })
      }
      disabled={pending}
    >
      삭제
    </button>
  );
}
