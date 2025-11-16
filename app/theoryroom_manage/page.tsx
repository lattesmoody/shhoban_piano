import styles from './page.module.css';
import { neon } from '@neondatabase/serverless';
import Link from 'next/link';
import { selectTheoryStatus, TheoryRow } from '@/app/lib/sql/maps/theoryRoomQueries';
import TheoryRoomClient from './TheoryRoomClient';

export default async function TheoryRoomManagePage() {
  const sql = neon(process.env.DATABASE_URL!);
  
  // 이론실 상태 조회 (theoryRoomQueries 사용)
  let rows: TheoryRow[] = [];
  
  try {
    rows = await selectTheoryStatus(sql);
  } catch (error) {
    console.error('이론실 상태 조회 오류:', error);
  }

  return (
    <>
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div>관리자 님, 환영합니다 : )</div>
          <nav className={styles.topNav} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0' }}>
            <Link href="/main" style={{ padding: '4px 24px', textDecoration: 'none', color: 'inherit' }}>Main</Link>
            <Link href="/setting_manage" style={{ padding: '4px 24px', textDecoration: 'none', color: 'inherit' }}>Manage</Link>
            <form action={async () => {
              'use server';
              const { logoutAction } = await import('@/app/main/actions');
              await logoutAction();
            }} style={{ display: 'inline', margin: 0 }}>
              <button type="submit" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 'inherit', padding: '4px 24px' }}>
                Logout
              </button>
            </form>
          </nav>
        </div>
      </div>
      <TheoryRoomClient initialRows={rows} />
    </>
  );
}

