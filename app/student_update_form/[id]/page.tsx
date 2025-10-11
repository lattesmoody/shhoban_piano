import React from 'react';
import styles from './page.module.css';
import { neon } from '@neondatabase/serverless';
import { selectStudentById, StudentRow } from '@/app/lib/sql/maps/studentQueries';
import Link from 'next/link';
import { updateStudent } from './actions';

// - 수정 폼에서 사용하는 데이터의 구조 정의
interface FormData { name: string; uniqueId: string; schoolName: string; grade: string; instructor: string; courseType: number; useVehicle: 'O' | 'X' | ''; notes: string; }

// - 데이터 로딩 중 표시될 UI 윤곽선 컴포넌트
const FormSkeleton = () => (
    <div className={styles.studentForm}>
      {[...Array(8)].map((_, index) => (
        <div key={index} className={styles.formGroup}>
          <div className={`${styles.label} ${styles.skeleton} ${styles.skeletonText}`} />
          <div className={`${styles.input} ${styles.skeleton} ${styles.skeletonBox}`} />
        </div>
      ))}
      <div className={styles.buttonGroup}>
        <div className={`${styles.submitButton} ${styles.skeleton} ${styles.skeletonBox}`} />
        <div className={`${styles.cancelButton} ${styles.skeleton} ${styles.skeletonBox}`} />
      </div>
    </div>
);

export default async function StudentUpdateForm({ params }: { params: { id: string } }) {
  const sql = neon(process.env.DATABASE_URL!);
  const row: StudentRow | null = await selectStudentById(sql, params.id);
  if (!row) {
    return <div style={{ padding: '2rem' }}>해당 학생 정보를 찾을 수 없습니다.</div>;
  }
  const formData: FormData = {
    name: row.student_name,
    uniqueId: row.student_id,
    schoolName: row.student_school || '',
    grade: String(row.student_grade ?? ''),
    instructor: row.member_id || '',
    courseType: Number(row.course_code ?? 0),
    useVehicle: row.vehicle_yn ? 'O' : 'X',
    notes: row.special_notes || '',
  };
  return (
    <div className={styles.container}>
      <header className={styles.header}><h1 className={styles.title}>수강생 수정</h1></header>
      <form className={styles.studentForm} action={updateStudent}>
        <input type="hidden" name="studentId" value={formData.uniqueId} />
        <div className={styles.formGroup}><label className={styles.label}>이름</label><input className={`${styles.input} ${styles.readOnlyInput}`} name="name" defaultValue={formData.name} readOnly/></div>
        <div className={styles.formGroup}><label className={styles.label}>고유번호</label><input className={`${styles.input} ${styles.readOnlyInput}`} name="uniqueId" defaultValue={formData.uniqueId} readOnly/></div>
        <div className={styles.formGroup}><label className={styles.label}>학교명</label><input className={styles.input} name="schoolName" defaultValue={formData.schoolName}/></div>
        <div className={styles.formGroup}><label className={styles.label}>학년</label><input className={styles.input} name="grade" defaultValue={formData.grade}/></div>
        <div className={styles.formGroup}><label className={styles.label}>담당강사</label><input className={styles.input} name="instructor" defaultValue={formData.instructor}/></div>
        <div className={styles.formGroup}>
          <label className={styles.label}>과정구분</label>
          <select className={styles.input} name="courseType" defaultValue={String(formData.courseType)}>
            <option value="2">2일 반</option>
            <option value="3">3일 반</option>
            <option value="4">4일 반</option>
            <option value="5">5일 반</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>차량탑승</label>
          <select className={styles.input} name="useVehicle" defaultValue={formData.useVehicle}>
            <option value="O">O</option>
            <option value="X">X</option>
          </select>
        </div>
        <div className={styles.formGroup}><label className={styles.label}>특이사항</label><textarea className={styles.textarea} name="notes" defaultValue={formData.notes}/></div>
        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.submitButton}>수정</button>
          <Link href="/student_manage" className={styles.cancelButton}>뒤로</Link>
        </div>
      </form>
    </div>
  );
}