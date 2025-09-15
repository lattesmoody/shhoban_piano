'use client';

import React, { useState } from 'react';
import styles from './page.module.css';

type Row = { no:number; name:string; grade:number; course:string; inTime:string; outTime:string; memo?:string };
const mock: Row[] = [ { no:1, name:'ㄱ', grade:1, course:'피아노', inTime:'2 : 30', outTime:'3 : 20', memo:'' } ];

export default function StudentAttendancePage(){
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()+1);
  const [day, setDay] = useState(now.getDate());

  return (
    <div className={styles.container}>
      <header className={styles.header}><h1 className={styles.title}>수강생 출석 현황</h1></header>
      <div className={styles.filterBar}>
        <select className={styles.select} value={year} onChange={e=>setYear(Number(e.target.value))}>
          {Array.from({length:3}, (_,i)=>now.getFullYear()-1+i).map(y=> <option key={y} value={y}>{y}</option>)}
        </select>
        <select className={styles.select} value={month} onChange={e=>setMonth(Number(e.target.value))}>
          {Array.from({length:12},(_,i)=>i+1).map(m=> <option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
        </select>
        <select className={styles.select} value={day} onChange={e=>setDay(Number(e.target.value))}>
          {Array.from({length:31},(_,i)=>i+1).map(d=> <option key={d} value={d}>{String(d).padStart(2,'0')}</option>)}
        </select>
        <button className={styles.submit}>확인</button>
      </div>

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
          <tbody className={styles.tbody}>
            {mock.map(r=> (
              <tr key={r.no}>
                <td>{r.no}</td>
                <td>{r.name}</td>
                <td>{r.grade}</td>
                <td>{r.course}</td>
                <td>{r.inTime}</td>
                <td>{r.outTime}</td>
                <td>{r.memo || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


