'use client'; 

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import Link from 'next/link';
// 중앙 데이터 파일에서 `getStudents` 함수와 `Student` 타입 import
import { getStudents, Student } from '@/app/lib/data';

export default function StudentManagementPage() {
  // 학생 목록을 저장하고 UI에 반영하기 위한 상태
  const [students, setStudents] = useState<Student[]>([]);

  // 컴포넌트 마운트 시, localStorage에서 학생 목록을 가져와 상태 업데이트
  useEffect(() => {
    setStudents(getStudents());
  }, []);

  // '과정수정' 버튼 클릭 핸들러
  const handleEditCourse = (id: number) => alert(`과정수정 클릭: 학생 ID ${id}`);
  
  // '삭제' 버튼 클릭 핸들러 (localStorage 연동 로직은 미구현)
  const handleDelete = (id: number) => {
    if (confirm(`정말로 학생 ID ${id}를 삭제하시겠습니까?`)) {
      // (참고) 실제 삭제를 위해서는 lib/data.ts에 deleteStudent 함수 구현 필요
      // setStudents(prevStudents => prevStudents.filter(student => student.id !== id));
      alert(`학생 ID ${id} 삭제 기능은 구현되지 않았습니다.`);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>수강생 관리</h1>
      </header>
      
      <div className={styles.actionBar}>
        {/* '수강생 추가' 버튼을 Link로 감싸 페이지 이동 기능 추가 */}
        <Link href="/student_create_form">
            <button className={styles.primaryButton}>수강생 추가</button>
        </Link>
      </div>

      <main>
        <div className={styles.tableContainer}>
          <table className={styles.studentTable}>
            <caption className="sr-only">수강생 목록 테이블</caption>
            <thead className={styles.tableHeader}>
              <tr>
                <th scope="col">순번</th>
                <th scope="col">이름</th>
                <th scope="col">고유번호</th>
                <th scope="col">학교</th>
                <th scope="col">학년</th>
                <th scope="col">담당강사</th>
                <th scope="col">과정구분</th>
                <th scope="col">차량</th>
                <th scope="col">기능</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student.id}>
                  <td>{index + 1}</td>
                  <td>{student.name}</td>
                  <td>{student.uniqueId}</td>
                  <td>{student.school}</td>
                  <td>{student.grade}</td>
                  <td>{student.member}</td>
                  {/* 👇 숫자로 된 course 데이터에 "일 반"을 붙여서 표시 */}
                  <td>{`${student.course}일 반`}</td>
                  <td>{student.vehicle || '-'}</td>
                  <td className={styles.actionCell}>
                    <Link href={`/student_update_form/${student.uniqueId}`} passHref>
                      <button className={styles.actionButton}>정보수정</button>
                    </Link>
                    <Link
                      href={{
                        pathname: `/student_detail_update_form/${student.uniqueId}`,
                        query: { courseType: student.course }
                      }}
                      passHref
                    >
                      <button className={styles.actionButton}>과정수정</button>
                    </Link>
                    <button onClick={() => handleDelete(student.id)} className={`${styles.actionButton} ${styles.deleteButton}`}>삭제</button>
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