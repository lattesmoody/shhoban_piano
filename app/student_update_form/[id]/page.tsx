'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
// - 중앙 데이터 관리 파일에서 `getStudents` 함수 import
import { getStudents } from '@/app/lib/data';

// - 수정 폼에서 사용하는 데이터의 구조 정의
interface FormData {
  name: string;
  uniqueId: string;
  schoolName: string;
  grade: string;
  instructor: string;
  courseType: number;
  useVehicle: 'O' | 'X' | '';
  notes: string;
}

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

// - 중앙 데이터 소스(`getStudents()`) 호출
const allStudents = getStudents();
// - `uniqueId`를 키로 사용하는 조회용 데이터베이스 객체 생성
const mockStudentDatabaseByUniqueId = allStudents.reduce((acc, student) => {
    acc[student.uniqueId] = student;
    return acc;
}, {} as { [key: string]: typeof allStudents[0] });


export default function StudentUpdateForm() {
  // - useRouter: 페이지 이동 기능 제어
  const router = useRouter();
  // - useParams: URL의 동적 파라미터 추출
  const params = useParams();
  // - URL 파라미터를 `studentUniqueId` 변수에 할당
  const studentUniqueId = params.id as string;

  // - `formData`: 폼 입력 필드 값을 저장하는 상태
  const [formData, setFormData] = useState<FormData | null>(null);
  // - `isLoading`: 데이터 로딩 상태 제어
  const [isLoading, setIsLoading] = useState(true);

  // - 컴포넌트 마운트 또는 `studentUniqueId` 변경 시 데이터 로딩 실행
  useEffect(() => {
    const timer = setTimeout(() => {
      if (studentUniqueId) {
        // - URL 파라미터의 양쪽 공백 제거
        const trimmedUniqueId = studentUniqueId.trim();
        // - 공백 제거된 `uniqueId`로 학생 데이터 조회
        const studentData = mockStudentDatabaseByUniqueId[trimmedUniqueId];
        
        // - 데이터 조회 성공 시 `formData` 상태 업데이트
        if (studentData) {
          setFormData({
            name: studentData.name,
            uniqueId: String(studentData.uniqueId),
            schoolName: studentData.school,
            grade: `${studentData.grade}학년`,
            instructor: studentData.member,
            courseType: studentData.course,
            useVehicle: studentData.vehicle === 'O' ? 'O' : 'X',
            notes: '',
          });
        }
        // - 데이터 조회 결과와 상관없이 로딩 상태 종료
        setIsLoading(false);
      } else {
        // - `studentUniqueId`가 없을 경우에도 로딩 상태 종료
        setIsLoading(false);
      }
    }, 1500);

    // - 컴포넌트 언마운트 시 타이머 정리
    return () => clearTimeout(timer);
  }, [studentUniqueId]); 

  // - 폼 필드 값 변경 시 `formData` 상태 실시간 업데이트
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
  };

  // - 폼 제출 핸들러
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    // - 브라우저 기본 새로고침 동작 방지
    e.preventDefault();
    // - 수정 완료 알림창 표시
    alert(`수강생(고유번호: ${studentUniqueId})의 정보가 성공적으로 수정되었습니다.`);
    // - 수강생 관리 페이지로 이동
    router.push('/student_manage');
  };
  
  // - `isLoading` 상태가 true이면 스켈레톤 UI 렌더링
  if (isLoading) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>수강생 수정</h1>
        </header>
        <FormSkeleton />
      </div>
    );
  }

  // - 로딩 완료 후 `formData`가 없으면 정보 없음 메시지 렌더링
  if (!formData) return <div style={{ padding: '2rem' }}>해당 학생 정보를 찾을 수 없습니다.</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>수강생 수정</h1>
      </header>
      
      <form onSubmit={handleSubmit} className={styles.studentForm}>
        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>이름</label>
          <input type="text" id="name" name="name" value={formData.name} readOnly className={`${styles.input} ${styles.readOnlyInput}`} />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="uniqueId" className={styles.label}>고유번호</label>
          <input type="text" id="uniqueId" name="uniqueId" value={formData.uniqueId} readOnly className={`${styles.input} ${styles.readOnlyInput}`} />
        </div>
        <div className={styles.formGroup}>
            <label htmlFor="schoolName" className={styles.label}>학교명</label>
            <input type="text" id="schoolName" name="schoolName" value={formData.schoolName} onChange={handleChange} className={styles.input} placeholder="수강생 학교명 입력" />
        </div>
        <div className={styles.formGroup}>
            <label htmlFor="grade" className={styles.label}>학년</label>
            <select id="grade" name="grade" value={formData.grade} onChange={handleChange} className={styles.select}>
                <option value="유치부">유치부</option>
                <option value="1학년">1학년</option>
                <option value="2학년">2학년</option>
                <option value="3학년">3학년</option>
            </select>
        </div>
        <div className={styles.formGroup}>
            <label htmlFor="instructor" className={styles.label}>담당강사</label>
            <select id="instructor" name="instructor" value={formData.instructor} onChange={handleChange} className={styles.select}>
                <option value="강사테스트1">강사테스트1</option>
                <option value="강사테스트2">강사테스트2</option>
            </select>
        </div>
        <div className={styles.formGroup}>
            <label htmlFor="courseType" className={styles.label}>과정구분</label>
            <select id="courseType" name="courseType" value={formData.courseType} onChange={handleChange} className={styles.select}>
                <option value="2일 반">2일 반</option>
                <option value="3일 반">3일 반</option>
                <option value="5일 반">5일 반</option>
            </select>
        </div>
        <div className={styles.formGroup}>
            <label htmlFor="useVehicle" className={styles.label}>차량탑승</label>
            <select id="useVehicle" name="useVehicle" value={formData.useVehicle} onChange={handleChange} className={styles.select}>
                <option value="O">O</option>
                <option value="X">X</option>
            </select>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="notes" className={styles.label}>특이사항</label>
          <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} className={styles.textarea} placeholder="특이사항 입력" />
        </div>
        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.submitButton}>수정</button>
          <button type="button" onClick={() => router.back()} className={styles.cancelButton}>취소</button>
        </div>
      </form>
    </div>
  );
}