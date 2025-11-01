import { neon } from '@neondatabase/serverless';
import styles from './page.module.css';
import { selectAttendanceByDate } from '../lib/sql/maps/attendanceQueries';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

function formatTimeCell(value: any): string {
  if (!value) return '';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  return `${pad(dt.getHours())} : ${pad(dt.getMinutes())}`;
}

export default async function StudentAttendancePage({ searchParams }: { searchParams?: { y?: string; m?: string; d?: string } }) {
  const today = new Date();
  const resolvedSearchParams = await searchParams;
  const y = Number(resolvedSearchParams?.y ?? today.getFullYear());
  const m = Number(resolvedSearchParams?.m ?? (today.getMonth()+1));
  const d = Number(resolvedSearchParams?.d ?? today.getDate());

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await selectAttendanceByDate(sql, y, m, d);

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
        <header className={styles.header}><h1 className={styles.title}>수강생 출석 현황</h1></header>
      <form className={styles.filterBar}>
        <select name="y" defaultValue={y} className={styles.select}>
          {Array.from({length:5}, (_,i)=> y-2+i).map(v=> <option key={v} value={v}>{v}</option>)}
        </select>
        <select name="m" defaultValue={m} className={styles.select}>
          {Array.from({length:12}, (_,i)=>i+1).map(v=> <option key={v} value={v}>{pad(v)}</option>)}
        </select>
        <select name="d" defaultValue={d} className={styles.select}>
          {Array.from({length:31}, (_,i)=>i+1).map(v=> <option key={v} value={v}>{pad(v)}</option>)}
        </select>
        <button className={styles.btn} type="submit">확인</button>
      </form>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th>순번</th>
              <th>이름</th>
              <th>학년</th>
              <th>과정</th>
              <th>등원</th>
              <th>하원</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx)=> (
              <tr key={r.attendance_num}>
                <td>{idx+1}</td>
                <td>{r.student_name}</td>
                <td>{r.student_grade ?? ''}</td>
                <td>{r.course_name ?? ''}</td>
                <td>{formatTimeCell(r.in_time)}</td>
                <td>{formatTimeCell(r.out_time)}</td>
                <td>{r.remark ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </>
  );
}
