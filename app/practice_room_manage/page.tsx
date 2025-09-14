'use client';

import React from 'react';
import styles from './page.module.css';

type Row = {
  no: number;
  name: string;
  uniqueId: string;
  inTime: string;
  outTime: string;
  turns: number;
  usage: number;
};

const mock: Row[] = [
  { no: 1, name: 'ㄱ (1)', uniqueId: '1111', inTime: '2 : 35', outTime: '3 : 25', turns: 5, usage: 1 },
  { no: 2, name: '()', uniqueId: '0', inTime: '', outTime: '', turns: 0, usage: 0 },
  { no: 3, name: '()', uniqueId: '0', inTime: '', outTime: '', turns: 0, usage: 0 },
  { no: 4, name: '()', uniqueId: '0', inTime: '', outTime: '', turns: 0, usage: 0 },
  { no: 5, name: '()', uniqueId: '0', inTime: '', outTime: '', turns: 0, usage: 0 },
  { no: 6, name: '()', uniqueId: '0', inTime: '', outTime: '', turns: 0, usage: 0 },
  { no: 7, name: '()', uniqueId: '0', inTime: '', outTime: '', turns: 0, usage: 0 },
];

export default function PracticeRoomManagePage() {
  const handleDelete = (no: number) => alert(`삭제 클릭: ${no}`);
  const handleActivate = (no: number) => alert(`활성화 클릭: ${no}`);

  return (
    <div className={styles.container}>
      <header className={styles.header}><h1 className={styles.title}>연습실관리</h1></header>
      <div className={styles.actionBar}>
        <button className={styles.chip}>전체 공실</button>
        <button className={styles.chip}>전체 특강</button>
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
            {mock.map((r) => (
              <tr key={r.no}>
                <td>{r.no}</td>
                <td>{r.name}</td>
                <td>{r.uniqueId}</td>
                <td>{r.inTime}</td>
                <td>{r.outTime}</td>
                <td>{r.turns}</td>
                <td>{r.usage}</td>
                <td>
                  <div className={styles.actions}>
                    <button className={`${styles.btn} ${styles.btnDelete}`} onClick={() => handleDelete(r.no)}>삭제</button>
                    <button className={`${styles.btn} ${styles.btnActivate}`} onClick={() => handleActivate(r.no)}>활성화</button>
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


