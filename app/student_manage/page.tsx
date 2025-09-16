import React from 'react';
import styles from './page.module.css';
import Link from 'next/link';
import { neon } from '@neondatabase/serverless';
// DB에서 학생 데이터를 가져오는 함수와 Student 타입 import
import { selectActiveStudents, StudentRow } from '@/app/lib/sql/maps/studentQueries';

export default async function StudentManagementPage() {
  // DB에서 활성화된 학생 목록을 조회
  const sql = neon(process.env.DATABASE_URL!);
  const students: StudentRow[] = await selectActiveStudents(sql);

  // 삭제 버튼 클릭 시 사용할 클라이언트 컴포넌트 (별도 구현 필요)

  return (
    <>
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div className={styles.welcomeMessage}>관리자 님, 환영합니다 : )</div>
          <nav className={styles.topNav}>
            <a href="#">Main</a>
            <a href="#">Manage</a>
            <a href="#">Logout</a>
          </nav>
        </div>
      </div>
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
                <tr key={student.student_id}>
                  <td>{index + 1}</td>
                  <td>{student.student_name}</td>
                  <td>{student.student_id}</td>
                  <td>{student.student_school}</td>
                  <td>{student.student_grade}</td>
                  <td>{student.member_name || student.member_id}</td>
                  {/* 👇 숫자로 된 course_code 데이터에 "일 반"을 붙여서 표시 */}
                  <td>{`${student.course_code}일 반`}</td>
                  <td>{student.vehicle_yn ? '탑승' : '-'}</td>
                  <td className={styles.actionCell}>
                    <Link href={`/student_update_form/${student.student_id}`} passHref>
                      <button className={styles.actionButton}>정보수정</button>
                    </Link>
                    <Link
                      href={{
                        pathname: `/student_detail_update_form/${student.student_id}`,
                        query: { courseType: student.course_code }
                      }}
                      passHref
                    >
                      <button className={styles.actionButton}>과정수정</button>
                    </Link>
                    <button className={`${styles.actionButton} ${styles.deleteButton}`}>삭제</button>
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