import styles from './page.module.css';
import { neon } from '@neondatabase/serverless';
import Link from 'next/link';
import DeleteButton from './DeleteButton';
import AllEmptyButton from './AllEmptyButton';
import { selectTheoryStatus, TheoryRow } from '@/app/lib/sql/maps/theoryRoomQueries';

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
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>이론실관리</h1>
        </header>
        <div className={styles.actionBar}>
          <AllEmptyButton />
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th>이름 (학년)</th>
                <th>고유번호</th>
                <th>입실</th>
                <th>이론진행 (분)</th>
                <th>기능</th>
              </tr>
            </thead>
            <tbody className={styles.tbody}>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                    현재 이론실에 입실한 학생이 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.room_no}>
                    <td>
                      {row.student_name}
                      {row.student_grade ? ` (${row.student_grade})` : ''}
                    </td>
                    <td>{row.student_id ?? ''}</td>
                    <td>{formatTimeCell(row.in_time)}</td>
                    <td>{row.theory_duration}</td>
                    <td>
                      <div className={styles.actions}>
                        <DeleteButton roomNo={row.room_no} studentName={row.student_name || ''} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function formatTimeCell(value: unknown): string {
  if (!value) return '';
  try {
    const d = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(d.getTime())) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh} : ${mm}`;
  } catch {
    return '';
  }
}

