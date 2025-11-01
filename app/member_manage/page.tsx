import React from 'react';
import styles from './page.module.css';
import Link from 'next/link';
import DeleteButton from './DeleteButton';
import EditButton from './EditButton';
import { neon } from '@neondatabase/serverless';
import { selectAllMembers, MemberListRow } from '@/app/lib/sql/maps/memberQueries';

export default async function MemberManagePage() {
  const sql = neon(process.env.DATABASE_URL!);
  const members: MemberListRow[] = await selectAllMembers(sql);

  const handleEdit = (id: number) => alert(`수정 클릭: 순번 ${id}`);
  const handleDelete = (id: number) => {
    if (confirm(`정말로 순번 ${id} 항목을 삭제하시겠습니까?`)) {
      alert('삭제 기능은 데모에서 비활성화되어 있습니다.');
    }
  };

  return (
    <>
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div className={styles.welcome}>관리자 님, 환영합니다 : )</div>
          <nav className={styles.topNav} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0' }}>
            <Link href="/main" style={{ padding: '4px 24px', textDecoration: 'none', color: 'inherit' }}>Main</Link>
            <Link href="/setting_manage" style={{ padding: '4px 24px', textDecoration: 'none', color: 'inherit' }}>Manage</Link>
            <form action={async () => {
              'use server';
              const { logoutAction } = await import('@/app/main/actions');
              await logoutAction();
            }} style={{ display: 'inline', margin: 0 }}>
              <button type="submit" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 'inherit', padding: '4px 24px' }}>
                Logout
              </button>
            </form>
          </nav>
        </div>
      </div>
      <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>강사 관리</h1>
      </header>

      <div className={styles.actionBar}>
        <Link href="/member_create_form">
          <button className={styles.primaryButton}>강사 추가</button>
        </Link>
      </div>

      <main>
        <div className={styles.tableContainer}>
          <table className={styles.memberTable}>
            <caption className={styles.srOnly}>강사 목록 테이블</caption>
            <thead className={styles.tableHeader}>
              <tr>
                <th scope="col">순번</th>
                <th scope="col">아이디</th>
                <th scope="col">이름</th>
                <th scope="col">강사 구분</th>
                <th scope="col">기능</th>
              </tr>
            </thead>
            <tbody>
              {members.map((row, idx) => (
                <tr key={row.member_id}>
                  <td>{idx + 1}</td>
                  <td>{row.member_id}</td>
                  <td>{row.member_name}</td>
                  <td>{Number(row.member_code)}</td>
                  <td className={styles.actionCell}>
                    <EditButton memberId={row.member_id} memberName={row.member_name} roleCode={Number(row.member_code)} className={styles.actionButton} />
                    <DeleteButton loginId={row.member_id} roleCode={Number(row.member_code)} className={`${styles.actionButton} ${styles.deleteButton}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      </div>
    </>
  );
}


