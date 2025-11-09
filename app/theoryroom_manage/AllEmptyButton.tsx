'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { makeAllTheoryEmpty } from './actions';
import styles from './page.module.css';

export default function AllEmptyButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  
  return (
    <button
      className={styles.chip}
      onClick={() => {
        if (confirm('이론실 전체를 공실 처리하시겠습니까?')) {
          start(async () => {
            await makeAllTheoryEmpty();
            alert('전체 공실 처리되었습니다.');
            router.refresh();
          });
        }
      }}
      disabled={pending}
    >
      전체 공실
    </button>
  );
}

