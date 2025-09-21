import styles from './page.module.css';
import { neon } from '@neondatabase/serverless';
import { selectKinderStatus, KinderRow } from '@/app/lib/sql/maps/kinderRoomQueries';
import DeleteButton from './DeleteButton';
import ActivateButton from './ActivateButton';
import AllEmptyButton from './AllEmptyButton';
import AllLectureButton from './AllLectureButton';

export default async function KinderRoomManagePage(){
  const sql = neon(process.env.DATABASE_URL!);
  const rows: KinderRow[] = await selectKinderStatus(sql);

  return (
    <div className={styles.container}>
      <header className={styles.header}><h1 className={styles.title}>유치부실관리</h1></header>
      <div className={styles.actionBar}>
        <AllEmptyButton />
        <AllLectureButton />
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
                <td>{r.turns ? (r.turns || '') : ''}</td>
                <td>{r.usage_yn}</td>
                <td>
                  <div className={styles.actions}>
                    <DeleteButton roomNo={r.room_no} />
                    <ActivateButton roomNo={r.room_no} enabled={!!r.is_enabled} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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

