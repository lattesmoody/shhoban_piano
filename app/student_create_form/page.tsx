'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { useActionState } from 'react';
import { createStudent } from '@/app/student_create_form/actions';

/**
 * 함수 이름: StudentCreateFormPage
 * 함수 역할: 수강생 추가 폼 UI와 데이터 제출 로직을 담당하는 컴포넌트
 */
export default function StudentCreateFormPage() {
  // - useRouter: 폼 제출 후 페이지 이동을 위해 사용
  const router = useRouter();

  // - 폼의 각 입력 필드 값을 관리하는 상태
  const [formData, setFormData] = useState({
    name: '',
    uniqueId: '',
    school: '',
    grade: 1,
    member: '강사테스트1', // 담당강사
    course: 5,   // 과정구분
    vehicle: null,      // 차량 정보 (현재 폼에서는 입력받지 않음)
  });

  // - 입력 필드(input, select)의 값이 변경될 때마다 formData 상태를 업데이트
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // - e.target의 타입이 HTMLInputElement이고 type이 'number'일 경우 숫자로 변환
    const isNumericInput = e.target instanceof HTMLInputElement && type === 'number';
    setFormData(prev => ({
      ...prev,
      [name]: isNumericInput ? parseInt(value, 10) || 0 : value,
    }));
  };

  // - '생성' 버튼 클릭 시 실행되는 폼 제출 핸들러
  const [errorMessage, formAction] = useActionState(createStudent, undefined);
  
  const handleAlertSubmit = () => {
    alert('수강생 추가가 완료되었습니다.');
  };

  return (
    // - UI 구조를 다른 페이지와 통일 (기존 Tailwind CSS -> CSS Modules)
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>수강생 추가</h1>
      </header>
      
      <form action={formAction} onSubmit={handleAlertSubmit} className={styles.studentForm}>
        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>이름</label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className={styles.input} placeholder="수강생 이름 입력" required />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="uniqueId" className={styles.label}>고유번호</label>
          <input type="text" pattern="[0-9]*" id="uniqueId" name="uniqueId" value={formData.uniqueId} onChange={handleChange} className={styles.input} placeholder="고유번호 4~5자 입력" required />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="school" className={styles.label}>학교명</label>
          <input type="text" id="school" name="school" value={formData.school} onChange={handleChange} className={styles.input} placeholder="수강생 학교명 입력" />
        </div>
        <div className={styles.formGroup}>
            <label htmlFor="grade" className={styles.label}>학년</label>
            <select id="grade" name="grade" value={formData.grade} onChange={handleChange} className={styles.select}>
                <option value={1}>1학년</option>
                <option value={2}>2학년</option>
                <option value={3}>3학년</option>
                <option value={4}>4학년</option>
                <option value={5}>5학년</option>
                <option value={6}>6학년</option>
                <option value="중·고등부">중·고등부</option>
                <option value="대회부">대회부</option>       
                <option value="연주회부">연주회부</option>     
                <option value="성인부">성인부</option>   
            </select>
        </div>
        <div className={styles.formGroup}>
            <label htmlFor="member" className={styles.label}>담당강사</label>
            <select id="member" name="member" value={formData.member} onChange={handleChange} className={styles.select}>
                <option value="강사테스트1">강사테스트1</option>
                <option value="강사테스트2">강사테스트2</option>
            </select>
        </div>
        <div className={styles.formGroup}>
            <label htmlFor="course" className={styles.label}>과정구분</label>
            <select id="course" name="course" value={formData.course} onChange={handleChange} className={styles.select}>
              <option value={2}>2일 반</option>
              <option value={3}>3일 반</option>
              <option value={4}>4일 반</option>
              <option value={5}>5일 반</option>
            </select>
        </div>
        
        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.submitButton}>생성</button>
          <button type="button" onClick={() => router.back()} className={styles.cancelButton}>취소</button>
        </div>
      </form>
      {errorMessage && <p style={{color:'#c0392b', marginTop:'8px'}}>{errorMessage}</p>}
    </div>
  );
}