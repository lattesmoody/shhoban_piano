'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
import { updateStudentCourses, loadStudentCourses } from './actions';

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
          name={`day_${index}`}
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
                name={`lesson_${index}`}
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
  let courseCount = parseInt(courseTypeParam, 10);
  if (Number.isNaN(courseCount) || courseCount < 2) courseCount = 2;
  if (courseCount > 7) courseCount = 7;
  // - 화면에 표시할 제목용 문자열 생성 (예: "5일 반")
  const courseTypeDisplay = `${courseCount}일 반`;

  // - 동적으로 생성될 폼들의 데이터를 배열 상태로 관리
  const [formState, setFormState] = useState<CourseDetail[]>([]);

  // - 페이지 로드 시 `courseCount`에 맞춰 폼 상태 초기화
  useEffect(() => {
    const weekdays = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
    (async () => {
      try {
        const saved = await loadStudentCourses(studentUniqueId);
        if (saved && saved.length > 0) {
          // 저장된 값이 있으면 슬롯 수에 맞춰 채움
          const initial = Array.from({ length: courseCount }, (_, idx) => {
            const hit = saved.find(s => s.courseIndex === idx + 1);
            return {
              day: hit?.day || weekdays[idx % weekdays.length],
              lesson: hit?.lesson || '',
            };
          });
          setFormState(initial);
        } else {
          const initial = Array.from({ length: courseCount }, (_, idx) => ({
            day: weekdays[idx % weekdays.length],
            lesson: '',
          }));
          setFormState(initial);
        }
      } catch {
        const fallback = Array.from({ length: courseCount }, (_, idx) => ({
          day: weekdays[idx % weekdays.length],
          lesson: '',
        }));
        setFormState(fallback);
      }
    })();
  }, [courseCount, studentUniqueId]);

  // - 하위 컴포넌트의 변경사항을 부모 상태에 반영하는 핸들러
  const handleDetailChange = (index: number, field: keyof CourseDetail, value: string) => {
    const updatedState = [...formState];
    updatedState[index] = { ...updatedState[index], [field]: value };
    setFormState(updatedState);
  };

  const viewCount = courseCount === 5 ? 5 : courseCount === 6 ? 6 : courseCount === 7 ? 7 : Math.min(courseCount, 4);

  // - 제출 시 유효성 검사: 과정(레슨) 필수 선택 + 요일 중복 금지(월~금 범위)
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const current = formState.slice(0, viewCount);
    const hasEmptyLesson = current.some(item => !item.lesson);
    if (hasEmptyLesson) {
      e.preventDefault();
      alert('과정 선택은 필수 입니다.');
      return;
    }

    const days = current.map(item => item.day);
    const uniqueDays = new Set(days);
    if (uniqueDays.size !== days.length) {
      e.preventDefault();
      alert('요일 설정 다시 확인해주세요');
      return;
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        {/* - 표시용 문자열을 사용해 제목 렌더링 */}
        <h1 className={styles.title}>{`수강생 과정 수정 [ ${courseTypeDisplay} ]`}</h1>
      </header>

      <form action={updateStudentCourses} onSubmit={handleSubmit} className={styles.form}>
        <input type="hidden" name="studentId" value={studentUniqueId} />
        <input type="hidden" name="count" value={viewCount} />
        {/* - `courseCount`만큼 CourseBlock 컴포넌트를 반복 렌더링 */}
        {formState.slice(0, viewCount).map((details, index) => (
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