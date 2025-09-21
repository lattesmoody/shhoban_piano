import styles from './page.module.css';
import { neon } from '@neondatabase/serverless';
import { selectDrumStatus, DrumRow } from '@/app/lib/sql/maps/drumRoomQueries';
import DeleteButton from './DeleteButton';
import AllEmptyButton from './AllEmptyButton';

export default async function DrumRoomManagePage(){
  const sql = neon(process.env.DATABASE_URL!);
  const rows: DrumRow[] = await selectDrumStatus(sql);

  return (
    <>
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div>관리자 님, 환영합니다 : )</div>
          <nav className={styles.topNav}>
            <a href="#">Main</a>
            <a href="#">Manage</a>
            <a href="#">Logout</a>
          </nav>
        </div>
      </div>
      <div className={styles.container}>
        <header className={styles.header}><h1 className={styles.title}>드럼실관리</h1></header>
        <div className={styles.actionBar}>
          <AllEmptyButton />
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th>번호</th>
                <th>이름 (학년)</th>
                <th>고유번호</th>
                <th>입실</th>
                <th>퇴실</th>
                <th>분침</th>
                <th>사용유무</th>
                <th>기능</th>
              </tr>
            </thead>
            <tbody className={styles.tbody}>
              {rows.map((r) => (
                <tr key={r.room_no}>
                  <td>{r.room_no}</td>
                  <td>{r.student_name ? `${r.student_name}${r.student_grade ? ` (${r.student_grade})` : ''}` : ''}</td>
                  <td>{r.student_id ?? ''}</td>
                  <td>{formatTimeCell(r.in_time)}</td>
                  <td>{formatTimeCell(r.out_time)}</td>
                  <td>{computeTurnsFromOutTime(r.out_time)}</td>
                  <td>{r.usage_yn}</td>
                  <td>
                    <div className={styles.actions}>
                      <DeleteButton roomNo={r.room_no} />
                    </div>
                  </td>
                </tr>
              ))}
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

function computeTurnsFromOutTime(value: unknown): string {
  if (!value) return '';
  try {
    const d = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(d.getTime())) return '';
    const minute = d.getMinutes();
    if (minute === 0 || minute >= 56) return '12';
    const idx = Math.ceil(minute / 5);
    return String(idx);
  } catch {
    return '';
  }
}
