'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import DeleteButton from './DeleteButton';
import { TheoryRow } from '@/app/lib/sql/maps/theoryRoomQueries';

interface Props {
  initialRows: TheoryRow[];
}

export default function TheoryRoomClient({ initialRows }: Props) {
  const [rows, setRows] = useState<TheoryRow[]>(initialRows);

  useEffect(() => {
    // 5초마다 페이지 새로고침
    const interval = setInterval(() => {
      window.location.reload();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>이론실관리</h1>
      </header>
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

