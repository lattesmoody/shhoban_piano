'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { makeAllLecture } from './actions';
import styles from './page.module.css';

export default function AllLectureButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className={styles.chip}
      onClick={() =>
        start(async () => {
          await makeAllLecture();
          alert('전체 특강으로 변경했습니다.');
          router.refresh();
        })
      }
      disabled={pending}
    >
      전체 특강
    </button>
  );
}


