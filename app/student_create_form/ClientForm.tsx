'use client';

import React, { useState, ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { useActionState } from 'react';
import { createStudent } from '@/app/student_create_form/actions';
import type { MemberListRow } from '@/app/lib/sql/maps/memberQueries';

type Props = { members: MemberListRow[] };

export default function ClientForm({ members }: Props) {
  const teacherOptions = (members || []).filter(m => Number(m.member_code) !== 99 && Number(m.member_code) !== 0);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    uniqueId: '',
    school: '',
    grade: 1,
    member: teacherOptions[0]?.member_id || '',
    course: 5,
    vehicle: 'O',
    special_notes: '',
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isNumericInput = e.target instanceof HTMLInputElement && type === 'number';
    setFormData(prev => ({
      ...prev,
      [name]: isNumericInput ? parseInt(value, 10) || 0 : value,
    }));
  };

  const [serverMsg, formAction] = useActionState<string | undefined, FormData>(createStudent, undefined);

  useEffect(() => {
    if (!serverMsg) return;
    if (serverMsg === 'DUPLICATE_STUDENT_ID') {
      alert('해당 고유번호가 존재합니다.');
      return;
    }
    if (serverMsg.startsWith('REDIRECT:')) {
      alert('수강생 추가가 완료되었습니다.');
      const href = serverMsg.replace('REDIRECT:', '');
      location.href = href;
    }
  }, [serverMsg]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>수강생 추가</h1>
      </header>

      <form action={formAction} className={styles.studentForm}>
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
            {teacherOptions.map((m) => (
              <option key={m.member_id} value={m.member_id}>{Number(m.member_code)} - {m.member_name}</option>
            ))}
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

        <div className={styles.formGroup}>
          <label htmlFor="vehicle" className={styles.label}>차량탑승</label>
          <select id="vehicle" name="vehicle" value={formData.vehicle} onChange={handleChange} className={styles.select}>
            <option value="O">O</option>
            <option value="X">X</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="special_notes" className={styles.label}>특이사항</label>
          <input type="text" id="special_notes" name="special_notes" value={formData.special_notes} onChange={handleChange} className={styles.input} placeholder="특이사항 입력" />
        </div>

        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.submitButton}>생성</button>
          <button type="button" onClick={() => router.back()} className={styles.cancelButton}>취소</button>
        </div>
      </form>
      {serverMsg && typeof serverMsg === 'string' && !serverMsg.startsWith('REDIRECT:') && serverMsg !== 'DUPLICATE_STUDENT_ID' && (
        <p style={{color:'#c0392b', marginTop:'8px'}}>{String(serverMsg)}</p>
      )}
    </div>
  );
}


