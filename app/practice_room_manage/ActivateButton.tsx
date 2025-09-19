'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { activateStatus, deactivateStatus } from './actions';
import styles from './page.module.css';

export default function ActivateButton({ roomNo, enabled }: { roomNo: number; enabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const handleClick = () =>
    start(async () => {
      if (enabled) {
        await deactivateStatus(roomNo);
        alert('비활성화되었습니다.');
      } else {
        await activateStatus(roomNo);
        alert('활성화되었습니다.');
      }
      router.refresh();
    });

  return (
    <button
      className={`${styles.btn} ${enabled ? styles.btnActivate : styles.btnActivateDisabled}`}
      onClick={handleClick}
      disabled={pending}
      aria-pressed={enabled}
    >
      활성화
    </button>
  );
}


