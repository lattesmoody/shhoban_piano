import styles from './page.module.css';
import { neon } from '@neondatabase/serverless';
import { selectPracticeStatusToday, PracticeRow } from '@/app/lib/sql/maps/practiceRoomQueries';
import DeleteButton from './DeleteButton';
import ActivateButton from './ActivateButton';
import AllEmptyButton from './AllEmptyButton';
import AllLectureButton from './AllLectureButton';

export default async function PracticeRoomManagePage() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows: PracticeRow[] = await selectPracticeStatusToday(sql);

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
        <header className={styles.header}><h1 className={styles.title}>연습실관리</h1></header>
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
                  <td>{r.student_name ?? ''}</td>
                  <td>{r.student_id ?? ''}</td>
                  <td>{r.in_time ?? ''}</td>
                  <td>{r.out_time ?? ''}</td>
                  <td>{r.turns}</td>
                  <td>{r.usage_yn}</td>
                  <td>
                    <div className={styles.actions}>
                      <DeleteButton roomNo={r.room_no} />
                      <ActivateButton roomNo={r.room_no} enabled={Boolean(r.is_enabled)} />
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


