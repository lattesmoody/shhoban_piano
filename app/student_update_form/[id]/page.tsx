'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
// - 중앙 관리 데이터 파일(`@/lib/data`)에서 학생 데이터 import
import { mockStudentData } from '@/app/lib/data';

// - 수정 폼에서 사용하는 데이터의 구조를 정의하는 타입
interface FormData {
  name: string;
  uniqueId: string;
  schoolName: string;
  grade: string;
  instructor: string;
  courseType: string;
  useVehicle: 'O' | 'X' | '';
  notes: string;
}
  
// - 중앙 데이터(`mockStudentData`)를 ID로 쉽게 조회하기 위해 객체 형태로 변환
const mockStudentDatabase = mockStudentData.reduce((acc, student) => {
    acc[student.id] = student;
    return acc;
}, {} as { [key: string]: typeof mockStudentData[0] });


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


export default function StudentUpdateForm() {
  // - useRouter: 페이지 이동(뒤로가기, 목록으로 이동 등) 기능 제어
  // - useParams: URL 경로에서 동적 파라미터(`id`) 추출
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  // - formData: 폼 입력 필드의 값을 저장하는 상태
  // - isLoading: 데이터 로딩 상태를 제어하는 상태 (true: 로딩 중)
  const [formData, setFormData] = useState<FormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // - 컴포넌트 마운트 또는 `studentId` 변경 시 데이터 로딩 실행
  // - `setTimeout`으로 실제 네트워크 지연 시뮬레이션 (1.5초)
  // - `studentId`로 학생 조회 후, `formData` 상태 업데이트
  // - 데이터 조회 성공/실패 여부와 관계없이 로딩 상태 종료
  useEffect(() => {
      const timer = setTimeout(() => {
        // ===== 👇 디버깅 코드 추가 =====
        console.log("URL에서 가져온 ID:", studentId);
        console.log("데이터베이스 키 목록:", Object.keys(mockStudentDatabase));
        const studentData = mockStudentDatabase[studentId];
        console.log("조회된 학생 데이터:", studentData);
        // ===== 👆 디버깅 코드 끝 =====

        if (studentId) {
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
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      }, 1500);

      return () => clearTimeout(timer);
  }, [studentId]);

  // - 폼 필드 값 변경 시 `formData` 상태 실시간 업데이트
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
  };

  // - '수정' 버튼 클릭 시 실행되는 제출 핸들러
  // - `e.preventDefault()`로 브라우저 기본 동작(새로고침) 방지
  // - 수정된 데이터를 콘솔에 출력 (API 호출 시뮬레이션)
  // - 작업 완료 후, 수강생 목록 페이지로 이동
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('서버로 전송될 수정된 데이터:', formData);
    alert(`학생 ID ${studentId}의 정보가 성공적으로 수정되었습니다.`);
    router.push('/student_manage');
  };
  
  // - `isLoading`이 true이면 스켈레톤 UI 렌더링
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

  // - 로딩 완료 후 `formData`가 없으면 '정보 없음' 메시지 렌더링
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