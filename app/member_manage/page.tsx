'use client';

import React, { useEffect, useState } from 'react';
import styles from './page.module.css';
import Link from 'next/link';

type MemberRow = {
  id: number; // 순번
  loginId: string; // 아이디
  name: string; // 이름
  roleCode: number; // 강사 구분(숫자)
};

// 첨부 스크린샷의 데이터 반영
const defaultRows: MemberRow[] = [
  { id: 1, loginId: 'testadmin', name: '관리자', roleCode: 99 },
  { id: 2, loginId: 'testhm00', name: '원장', roleCode: 0 },
  { id: 3, loginId: 'testhm01', name: '강사1', roleCode: 1 },
  { id: 4, loginId: 'testhm02', name: '강사2', roleCode: 2 },
  { id: 5, loginId: 'testview01', name: '뷰01', roleCode: 3 },
  { id: 6, loginId: 'testview02', name: '뷰02', roleCode: 3 },
  { id: 7, loginId: 'testview03', name: '뷰03', roleCode: 3 },
];

export default function MemberManagePage() {
  const [rows, setRows] = useState<MemberRow[]>([]);

  useEffect(() => {
    const envJson = process.env.NEXT_PUBLIC_MEMBER_ROWS_JSON;
    if (!envJson) {
      setRows(defaultRows);
      return;
    }
    try {
      const parsed = JSON.parse(envJson) as MemberRow[];
      const normalized = parsed.map((r, i) => ({
        id: typeof r.id === 'number' ? r.id : i + 1,
        loginId: r.loginId ?? '',
        name: r.name ?? '',
        roleCode: typeof r.roleCode === 'number' ? r.roleCode : Number(r.roleCode) || 0,
      }));
      setRows(normalized);
    } catch (e) {
      console.warn('환경변수 NEXT_PUBLIC_MEMBER_ROWS_JSON 파싱 실패. 기본값 사용', e);
      setRows(defaultRows);
    }
  }, []);

  const handleEdit = (id: number) => alert(`수정 클릭: 순번 ${id}`);
  const handleDelete = (id: number) => {
    if (confirm(`정말로 순번 ${id} 항목을 삭제하시겠습니까?`)) {
      alert('삭제 기능은 데모에서 비활성화되어 있습니다.');
    }
  };

  return (
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
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.loginId}</td>
                  <td>{row.name}</td>
                  <td>{row.roleCode}</td>
                  <td className={styles.actionCell}>
                    <button onClick={() => handleEdit(row.id)} className={styles.actionButton}>수정</button>
                    <button onClick={() => handleDelete(row.id)} className={`${styles.actionButton} ${styles.deleteButton}`}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}


