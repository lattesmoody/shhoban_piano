'use client'; // 상태 관리(useState)를 위해 클라이언트 컴포넌트로 지정

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
// 2025.09.09 라이브러리 추가
import Link from 'next/link'; // Next.js의 페이지 이동을 위한 컴포넌트


// 학생 데이터의 타입을 정의하여 코드 안정성 확보 (TypeScript)
type Student = {
  id: number;
  name: string;
  uniqueId: number;
  school: string;
  grade: number;
  member: string;
  course: string;
  vehicle: string | null; // 차량 정보는 없을 수도 있음을 명시
};

// 서버로부터 받아왔다고 가정하는 목업(mock) 데이터
const mockStudentData: Student[] = [
  { id: 1, name: '수강생1', uniqueId: 1111, school: '테스트초', grade: 1, member: '강사테스트1', course: '5일 반', vehicle: null },
  { id: 2, name: '수강생2', uniqueId: 9111, school: '테스트초', grade: 2, member: '강사테스트2', course: '2일 반', vehicle: null },
  { id: 3, name: '수강생3', uniqueId: 2222, school: '테스트초', grade: 1, member: '강사테스트1', course: '5일 반', vehicle: null },
  { id: 4, name: '수강생4', uniqueId: 9222, school: '테스트초', grade: 2, member: '강사테스트2', course: '5일 반', vehicle: null },
  { id: 5, name: '수강생5', uniqueId: 3333, school: '테스트초', grade: 1, member: '강사테스트1', course: '5일 반', vehicle: null },
  { id: 6, name: '수강생6', uniqueId: 9333, school: '테스트초', grade: 2, member: '강사테스트2', course: '2일 반', vehicle: null },
  { id: 7, name: '수강생7', uniqueId: 4444, school: '테스트초', grade: 1, member: '강사테스트1', course: '5일 반', vehicle: null },
];

export default function StudentManagementPage() {
  // 학생 목록 데이터를 상태로 관리
  const [students, setStudents] = useState<Student[]>([]);

  // 컴포넌트가 처음 렌더링될 때 데이터를 불러오는 로직
  useEffect(() => {
    // 실제 환경에서는 이 부분에 API 호출 코드가 들어감
    // 예: fetch('/api/students').then(res => res.json()).then(data => setStudents(data));
    setStudents(mockStudentData);
  }, []); // 빈 배열을 전달하여 최초 1회만 실행되도록 설정

  // 각 버튼에 대한 핸들러 함수 (지금은 console에 로그만 출력)
  const handleEditInfo = (id: number) => alert(`정보수정 클릭: 학생 ID ${id}`);
  const handleEditCourse = (id: number) => alert(`과정수정 클릭: 학생 ID ${id}`);
  const handleDelete = (id: number) => {
    if (confirm(`정말로 학생 ID ${id}를 삭제하시겠습니까?`)) {
      // 실제로는 API를 호출하여 서버의 데이터를 삭제.
      setStudents(prevStudents => prevStudents.filter(student => student.id !== id));
      alert(`학생 ID ${id}가 삭제되었습니다.`);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>수강생 관리</h1>
      </header>
      
      {/* 실제 프로젝트에서는 이 부분도 별도 컴포넌트(e.g., <ActionBar />)로 분리 필요 */}
      <div className={styles.actionBar}>
        <button className={styles.primaryButton}>수강생 추가</button>
      </div>

      <main>
        {/* 이 div가 반응형 테이블의 핵심 */}
        <div className={styles.tableContainer}>
          <table className={styles.studentTable}>
            {/* 웹 접근성을 위해 테이블의 제목을 제공 */}
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
                    {/* ===== 핵심: Link 컴포넌트로 수정 페이지 이동 ===== */}
                    <Link href={`/edit/${student.id}`} passHref>
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