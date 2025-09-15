'use client';

import React from 'react';
import styles from './page.module.css';

type GradeKey = '유치부'|'초등부'|'중고등부'|'대학부'|'연주회부';
type CourseKey = '피아노+이론_피아노'|'피아노+이론_이론'|'피아노+드럼_피아노'|'피아노+드럼_드럼'|'드럼'|'피아노';

const grades: GradeKey[] = ['유치부','초등부','중고등부','대학부','연주회부'];
const headers = ['과정','피아노+이론','피아노+드럼','드럼','피아노'];
const subHeaders = ['피아노','이론','피아노','드럼','',''];

export default function ClassTimeSetupForm(){
  const handleSubmit = (e: React.FormEvent)=>{ e.preventDefault(); alert('설정 저장(데모)'); };

  return (
    <div className={styles.container}>
      <header className={styles.header}><h1 className={styles.title}>과정별 수업 시간 설정</h1></header>
      <div className={styles.tableWrap}>
        <form onSubmit={handleSubmit}>
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
              {grades.map((g, idx)=> (
                <tr key={g}>
                  <td>{g}</td>
                  <td><input className={styles.minInput} defaultValue={idx===0?35:idx===1?35:idx===2?35:25} /></td>
                  <td><input className={styles.minInput} defaultValue={idx===0?25:idx===1?25:0} /></td>
                  <td><input className={styles.minInput} defaultValue={idx===0?30:idx===1?30:idx===2?30:40} /></td>
                  <td><input className={styles.minInput} defaultValue={idx===0?30:idx===1?30:idx===2?30:30} /></td>
                  <td><input className={styles.minInput} defaultValue={idx===0?50:idx===1?50:idx===2?30:50} /></td>
                  <td><input className={styles.minInput} defaultValue={idx===0?50:idx===1?50:idx===2?30:55} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.btnBar}>
            <button type="submit" className={styles.btn}>설정</button>
            <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={()=>history.back()}>취소</button>
          </div>
        </form>
      </div>
    </div>
  );
}


