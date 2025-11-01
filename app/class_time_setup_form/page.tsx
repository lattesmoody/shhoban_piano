import { neon } from '@neondatabase/serverless';
import Link from 'next/link';
import { Suspense } from 'react';
import UpdatedAlert from './UpdatedAlert';
import { selectClassTimeSettings } from '../lib/sql/maps/classTimeQueries';
import { saveClassTimeSettings } from './actions';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

const grades = ['유치부','초등부','중고등부','대회부','연주회부'];

export default async function ClassTimeSetupForm({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }){
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await selectClassTimeSettings(sql);

  const getVal = (g: string, key: string): number => {
    const r: any = rows.find(r => r.grade_name === g);
    if (!r) return 0;
    return Number(r[key] ?? 0);
  };

  const nameOf = (g: string, key: string) => `${g}:${key}`;

  const sp = (searchParams ? await searchParams : undefined) as (Record<string, string | string[] | undefined> | undefined);
  const showUpdated = (sp?.updated === '1');

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
        <header className={styles.header}><h1 className={styles.title}>과정별 수업 시간 설정</h1></header>
      <div className={styles.tableWrap}>
        <form action={saveClassTimeSettings}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th rowSpan={2}>과정</th>
                <th colSpan={2}>피아노+이론</th>
                <th colSpan={2}>피아노+드럼</th>
                <th rowSpan={2}>드럼</th>
                <th rowSpan={2}>피아노</th>
              </tr>
              <tr>
                <th>피아노</th>
                <th>이론</th>
                <th>피아노</th>
                <th>드럼</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g)=> (
                <tr key={g}>
                  <td>{g}</td>
                  <td><input name={nameOf(g,'pt_piano')} className={styles.minInput} defaultValue={getVal(g,'pt_piano')} /></td>
                  <td><input name={nameOf(g,'pt_theory')} className={styles.minInput} defaultValue={getVal(g,'pt_theory')} /></td>
                  <td><input name={nameOf(g,'pd_piano')} className={styles.minInput} defaultValue={getVal(g,'pd_piano')} /></td>
                  <td><input name={nameOf(g,'pd_drum')} className={styles.minInput} defaultValue={getVal(g,'pd_drum')} /></td>
                  <td><input name={nameOf(g,'drum_only')} className={styles.minInput} defaultValue={getVal(g,'drum_only')} /></td>
                  <td><input name={nameOf(g,'piano_only')} className={styles.minInput} defaultValue={getVal(g,'piano_only')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.btnBar}>
            <button type="submit" className={styles.btn}>설정</button>
            <Link href="/" className={`${styles.btn} ${styles.btnCancel}`}>취소</Link>
          </div>
        </form>
      </div>
      <Suspense fallback={null}>
        <UpdatedAlert serverShow={showUpdated} />
      </Suspense>
      </div>
    </>
  );
}
