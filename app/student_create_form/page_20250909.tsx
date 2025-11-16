'use client'; // 폼 상호작용 및 상태 관리를 위해 클라이언트 컴포넌트로 지정

import React, { useState, ChangeEvent, FormEvent } from 'react';
import styles from './page.module.css';

// 폼 데이터의 타입을 명확하게 정의 (TypeScript)
interface FormData {
  name: string;
  uniqueId: string;
  schoolName: string;
  grade: string;
  instructor: string;
  courseType: string;
  vehicleBoarding: 'O' | 'X';
  notes: string;
}

// 폼 필드의 에러 상태를 위한 타입
type FormErrors = Partial<Record<keyof FormData, string>>;

export default function StudentCreateForm() {
  // 폼 데이터를 관리하는 state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    uniqueId: '',
    schoolName: '',
    grade: '유치부',
    instructor: '1',
    courseType: '2일 반',
    vehicleBoarding: 'O',
    notes: '',
  });

  // 유효성 검사 에러 메시지를 관리하는 state
  const [errors, setErrors] = useState<FormErrors>({});

  // 입력 필드 값이 변경될 때마다 formData state를 업데이트하는 함수
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // 사용자가 입력을 시작하면 해당 필드의 에러 메시지를 제거
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  // 폼 유효성을 검사하는 함수
  const validate = (): FormErrors => {
    const newErrors: FormErrors = {};
    if (!formData.name) newErrors.name = '수강생 이름은 필수 항목입니다.';
    if (!formData.uniqueId) {
        newErrors.uniqueId = '고유번호는 필수 항목입니다.';
    } else if (!/^\d{4,5}$/.test(formData.uniqueId)) {
        newErrors.uniqueId = '고유번호는 4~5자의 숫자로 입력해야 합니다.';
    }
    if (!formData.schoolName) newErrors.schoolName = '학교명은 필수 항목입니다.';
    
    return newErrors;
  };

  // 폼 제출 시 실행되는 함수
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // 페이지 새로고침 방지
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return; // 유효성 검사 실패 시 제출 중단
    }
    
    // 유효성 검사 통과 시
    //console.log('제출된 데이터:', formData);
    alert('수강생이 성공적으로 생성되었습니다!');
    // 여기에 서버로 데이터를 전송하는 API 호출 로직을 추가합니다.
    // 예: fetch('/api/students', { method: 'POST', body: JSON.stringify(formData) });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>수강생 추가</h1>
      </header>
      
      <form onSubmit={handleSubmit} className={styles.studentForm} noValidate>
        {/* 각 폼 필드는 재사용 가능한 컴포넌트로 분리 필요 (개선한다면). */}
        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>이름</label>
          <div className={styles.inputWrapper}>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className={styles.input} placeholder="수강생 이름 입력" required />
            {errors.name && <p className={styles.errorMessage}>{errors.name}</p>}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="uniqueId" className={styles.label}>고유번호</label>
          <div className={styles.inputWrapper}>
            <input type="text" id="uniqueId" name="uniqueId" value={formData.uniqueId} onChange={handleChange} className={styles.input} placeholder="고유번호 4~5자 입력, ex) 휴대폰 번호 뒷 네자리" required />
            {errors.uniqueId && <p className={styles.errorMessage}>{errors.uniqueId}</p>}
          </div>
        </div>

        <div className={styles.formGroup}>
            <label htmlFor="schoolName" className={styles.label}>학교명</label>
            <div className={styles.inputWrapper}>
                <input type="text" id="schoolName" name="schoolName" value={formData.schoolName} onChange={handleChange} className={styles.input} placeholder="수강생 학교명 입력" required />
                {errors.schoolName && <p className={styles.errorMessage}>{errors.schoolName}</p>}
            </div>
        </div>
        
        {/* Select 예시 */}
        <div className={styles.formGroup}>
            <label htmlFor="grade" className={styles.label}>학년</label>
            <div className={styles.inputWrapper}>
                <select id="grade" name="grade" value={formData.grade} onChange={handleChange} className={styles.select}>
                    <option value="유치부">유치부</option>
                    <option value="1학년">1학년</option>
                    <option value="2학년">2학년</option>
                    <option value="3학년">3학년</option>
                    <option value="4학년">4학년</option>
                    <option value="5학년">5학년</option>
                    <option value="6학년">6학년</option>
                    <option value="중·고등부">중·고등부</option>
                    <option value="대회부">대회부</option>       
                    <option value="연주회부">연주회부</option>     
                    <option value="성인부">성인부</option>                            
                </select>
            </div>
        </div>
        
        <div className={styles.formGroup}>
            <label htmlFor="instructor" className={styles.label}>담당강사</label>
            <div className={styles.inputWrapper}>
                <select id="instructor" name="instructor" value={formData.instructor} onChange={handleChange} className={styles.select}>
                    <option value="1">1 - 정명룡</option>
                    <option value="2">2 - 전상은</option>
                </select>
            </div>
        </div>

        <div className={styles.formGroup}>
            <label htmlFor="courseType" className={styles.label}>과정구분</label>
            <div className={styles.inputWrapper}>
                <select id="courseType" name="courseType" value={formData.courseType} onChange={handleChange} className={styles.select}>
                    <option value="2일 반">2일 반</option>
                    <option value="3일 반">3일 반</option>
                    <option value="3일 반">4일 반</option>                    
                    <option value="5일 반">5일 반</option>
                </select>
            </div>
        </div>

        <div className={styles.formGroup}>
            <label htmlFor="vehicleBoarding" className={styles.label}>과정구분</label>
            <div className={styles.inputWrapper}>
                <select id="vehicleBoarding" name="vehicleBoarding" value={formData.vehicleBoarding} onChange={handleChange} className={styles.select}>
                    <option value="2일 반">2일 반</option>
                    <option value="3일 반">3일 반</option>
                    <option value="3일 반">4일 반</option>                    
                    <option value="5일 반">5일 반</option>
                </select>
            </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="notes" className={styles.label}>특이사항</label>
          <div className={styles.inputWrapper}>
            <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} className={styles.textarea} placeholder="특이사항 입력" />
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.submitButton}>생성</button>
          <button type="button" className={styles.cancelButton}>취소</button>
        </div>
      </form>
    </div>
  );
}