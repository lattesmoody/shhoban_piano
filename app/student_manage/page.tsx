'use client'; 

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import Link from 'next/link';
// - 중앙 관리 데이터 파일(`@/lib/data`)에서 학생 데이터와 타입 import
import { mockStudentData, Student } from '@/app/lib/data';

export default function StudentManagementPage() {
  // - 학생 목록을 저장하고 UI에 반영하기 위한 상태
  const [students, setStudents] = useState<Student[]>([]);

  // - 컴포넌트 마운트 시, 중앙 데이터로 학생 목록 상태 초기화
  useEffect(() => {
    setStudents(mockStudentData);
  }, []);

  // - '과정수정' 버튼 클릭 핸들러
  const handleEditCourse = (id: number) => alert(`과정수정 클릭: 학생 ID ${id}`);
  
  // - '삭제' 버튼 클릭 핸들러
  const handleDelete = (id: number) => {
    if (confirm(`정말로 학생 ID ${id}를 삭제하시겠습니까?`)) {
      setStudents(prevStudents => prevStudents.filter(student => student.id !== id));
      alert(`학생 ID ${id}가 삭제되었습니다.`);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>수강생 관리</h1>
      </header>
      
      <div className={styles.actionBar}>
        <button className={styles.primaryButton}>수강생 추가</button>
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
                  <td>{student.course}</td>
                  <td>{student.vehicle || '-'}</td>
                  <td className={styles.actionCell}>
                    <Link href={`/student_update_form/${student.id}`} passHref>
                      <button className={styles.actionButton}>정보수정</button>
                    </Link>
                    <button onClick={() => handleEditCourse(student.id)} className={styles.actionButton}>과정수정</button>
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