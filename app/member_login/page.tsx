'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function MemberLoginPage() {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`로그인 시도: ${id}`);
  };

  return (
    <div className={styles.container}>
      <div>
        <h1 className={styles.title}>Member Login</h1>
        <form onSubmit={handleSubmit} className={styles.card}>
          <div className={styles.row}>
            <div className={styles.label}>아이디</div>
            <input className={styles.input} placeholder="ID를 입력해 주세요." value={id} onChange={(e) => setId(e.target.value)} />
          </div>
          <div className={styles.row}>
            <div className={styles.label}>비밀번호</div>
            <input className={styles.input} type="password" placeholder="비밀번호를 입력해 주세요." value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div className={styles.footer}>
            <button className={styles.loginBtn} type="submit">로 그 인</button>
          </div>
        </form>
      </div>
    </div>
  );
}


