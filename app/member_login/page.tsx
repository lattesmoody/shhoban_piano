'use client';

import { useActionState } from 'react';
import styles from './page.module.css';
import { authenticate } from '@/app/lib/process_member_create_form/actions';

export default function MemberLoginPage() {
  const [errorMessage, formAction] = useActionState(authenticate, undefined);

  return (
    <div className={styles.container}>
      <div>
        <h1 className={styles.title}>Member Login</h1>
        <form action={formAction} className={styles.card}>
          <div className={styles.row}>
            <div className={styles.label}>아이디</div>
            <input className={styles.input} name="member_id" placeholder="ID를 입력해 주세요." />
          </div>
          <div className={styles.row}>
            <div className={styles.label}>비밀번호</div>
            <input className={styles.input} type="password" name="member_pw" placeholder="비밀번호를 입력해 주세요." />
          </div>
          <div className={styles.footer}>
            <button className={styles.loginBtn} type="submit">로 그 인</button>
          </div>
          {errorMessage && (
            <div style={{ color: '#ff6b6b', textAlign: 'center', marginTop: '10px' }}>{errorMessage}</div>
          )}
        </form>
      </div>
    </div>
  );
}


