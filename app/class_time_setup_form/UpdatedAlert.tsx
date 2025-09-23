'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const SESSION_KEY = 'class_time_updated_alert_shown';

export default function UpdatedAlert({ serverShow }: { serverShow?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const show = serverShow ?? (params.get('updated') === '1');
    if (!show) return;

    const already = typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_KEY) === '1' : false;
    if (!already) {
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
      alert('수정되었습니다.');
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('updated');
    router.replace(url.toString());

    // 다음 내비게이션 또는 재진입 시 다시 알림 가능하도록 짧게 초기화
    setTimeout(() => { try { sessionStorage.removeItem(SESSION_KEY); } catch {} }, 200);
  }, [params, router, serverShow]);

  return null;
}


