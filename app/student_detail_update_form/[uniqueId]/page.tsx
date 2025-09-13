'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import styles from './page.module.css';

// - 각 과정 블록의 데이터 타입을 정의
type CourseDetail = {
  day: string;
  lesson: string;
};

// - 재사용을 위한 과정 블록 컴포넌트
const CourseBlock = ({ index, details, onDetailsChange }: {
  index: number;
  details: CourseDetail;
  onDetailsChange: (index: number, field: keyof CourseDetail, value: string) => void;
}) => {
  const daysOfWeek = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
  const lessons = ['피아노+이론', '피아노+드럼', '드럼', '피아노'];

  return (
    <div className={styles.courseBlock}>
      <h3 className={styles.blockTitle}>{`#${index + 1} 과정`}</h3>
      <div className={styles.controls}>
        <select
          value={details.day}
          onChange={(e) => onDetailsChange(index, 'day', e.target.value)}
          className={styles.select}
        >
          {daysOfWeek.map(day => <option key={day} value={day}>{day}</option>)}
        </select>
        <div className={styles.radioGroup}>
          {lessons.map(lesson => (
            <label key={lesson} className={styles.radioLabel}>
              <input
                type="radio"
                name={`lesson-${index}`}
                value={lesson}
                checked={details.lesson === lesson}
                onChange={(e) => onDetailsChange(index, 'lesson', e.target.value)}
              />
              {lesson}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};


export default function StudentCourseUpdatePage() {
  // - useRouter: 페이지 이동 기능 제어
  const router = useRouter();
  // - useParams: URL의 동적 경로 파라미터(`uniqueId`) 추출
  const params = useParams();
  // - useSearchParams: URL의 쿼리 스트링 파라미터(`courseType`) 추출
  const searchParams = useSearchParams();

  const studentUniqueId = params.uniqueId as string;
  // - URL 쿼리에서 `courseType`을 가져옴 (예: "5")
  const courseTypeParam = searchParams.get('courseType') || '0';

  // - 가져온 파라미터(문자열)를 숫자(courseCount)로 변환
  const courseCount = parseInt(courseTypeParam, 10);
  // - 화면에 표시할 제목용 문자열 생성 (예: "5일 반")
  const courseTypeDisplay = `${courseCount}일 반`;

  // - 동적으로 생성될 폼들의 데이터를 배열 상태로 관리
  const [formState, setFormState] = useState<CourseDetail[]>([]);

  // - 페이지 로드 시 `courseCount`에 맞춰 폼 상태 초기화
  useEffect(() => {
    const initialFormState = Array.from({ length: courseCount }, () => ({
      day: '월요일',
      lesson: '피아노',
    }));
    setFormState(initialFormState);
  }, [courseCount]);

  // - 하위 컴포넌트의 변경사항을 부모 상태에 반영하는 핸들러
  const handleDetailChange = (index: number, field: keyof CourseDetail, value: string) => {
    const updatedState = [...formState];
    updatedState[index] = { ...updatedState[index], [field]: value };
    setFormState(updatedState);
  };

  // - 폼 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    // - 브라우저 기본 새로고침 동작 방지
    e.preventDefault();
    // - 수정된 데이터를 콘솔에 출력 (API 호출 시뮬레이션)
    console.log('수정된 과정 데이터:', { studentUniqueId, details: formState });
    alert('과정 정보가 수정되었습니다.');
    // - 수강생 관리 페이지로 이동
    router.push('/student_manage');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        {/* - 표시용 문자열을 사용해 제목 렌더링 */}
        <h1 className={styles.title}>{`수강생 과정 수정 [ ${courseTypeDisplay} ]`}</h1>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* - `courseCount`만큼 CourseBlock 컴포넌트를 반복 렌더링 */}
        {formState.map((details, index) => (
          <CourseBlock
            key={index}
            index={index}
            details={details}
            onDetailsChange={handleDetailChange}
          />
        ))}

        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.submitButton}>수정</button>
          <button type="button" onClick={() => router.back()} className={styles.cancelButton}>취소</button>
        </div>
      </form>
    </div>
  );
}