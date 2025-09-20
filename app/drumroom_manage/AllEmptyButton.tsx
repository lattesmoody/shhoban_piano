'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { makeAllEmpty } from './actions';
import styles from './page.module.css';

export default function AllEmptyButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className={styles.chip}
      onClick={() =>
        start(async () => {
          await makeAllEmpty();
          alert('전체 공실로 변경했습니다.');
          router.refresh();
        })
      }
      disabled={pending}
    >
      전체 공실
    </button>
  );
}


