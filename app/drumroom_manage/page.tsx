'use client';

import React from 'react';
import styles from './page.module.css';

type Row = { no:number; name:string; uniqueId:string; inTime:string; outTime:string; turns:number; usage:number };
const mock: Row[] = Array.from({length:7}, (_,i)=>({ no:i+1, name:'()', uniqueId:'', inTime:'', outTime:'', turns:0, usage:0 }));

export default function DrumRoomManagePage(){
  const handleDelete = (no:number)=>alert(`삭제 클릭: ${no}`);

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
        <button className={styles.chip}>전체 공실</button>
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
            {mock.map(r=> (
              <tr key={r.no}>
                <td>{r.no}</td>
                <td>{r.name}</td>
                <td>{r.uniqueId}</td>
                <td>{r.inTime}</td>
                <td>{r.outTime}</td>
                <td>{r.turns}</td>
                <td>{r.usage}</td>
                <td><div className={styles.actions}><button className={styles.btn} onClick={()=>handleDelete(r.no)}>삭제</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </>
  );
}


