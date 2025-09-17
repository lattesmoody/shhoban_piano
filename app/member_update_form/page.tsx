'use client';

import React, { useActionState, useEffect, Suspense } from 'react';
import styles from './page.module.css';
import { updateMember } from './actions';
import { useRouter, useSearchParams } from 'next/navigation';

function MemberUpdateFormPageBody() {
  const router = useRouter();
  const params = useSearchParams();
  const memberId = params.get('memberId') || '';
  const memberName = params.get('memberName') || '';
  const roleCode = params.get('roleCode') || '';

  const [state, formAction] = useActionState(updateMember, undefined);

  useEffect(() => {
    if (state?.ok) {
      alert('강사 정보가 수정되었습니다.');
      router.replace('/member_manage');
    }
  }, [state?.ok, router]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>강사 수정</h1>
      </header>

      <form action={formAction} className={styles.form}>
        <label className={styles.label}>아이디</label>
        <input name="memberId" className={styles.input} defaultValue={memberId} readOnly />

        <label className={styles.label}>비밀번호</label>
        <input type="password" name="newPassword" className={styles.input} placeholder="비밀번호를 변경하려면 입력하세요" />
        <div className={styles.hint}>비밀번호 미입력 시 기존 비밀번호 유지</div>

        <label className={styles.label}>이름</label>
        <input name="memberName" className={styles.input} defaultValue={memberName} />

        <label className={styles.label}>강사구분</label>
        <input name="roleCode" className={styles.input} defaultValue={roleCode} />

        <div className={styles.buttons}>
          <button type="submit" className={styles.primaryButton}>수정</button>
          <button type="button" className={styles.cancelButton} onClick={() => router.back()}>취소</button>
        </div>

        {state?.message ? (
          <div style={{ gridColumn: '1 / -1', color: '#b91c1c', textAlign: 'center' }}>{state.message}</div>
        ) : null}
      </form>
    </div>
  );
}

export default function MemberUpdateFormPage() {
  return (
    <Suspense fallback={null}>
      <MemberUpdateFormPageBody />
    </Suspense>
  );
}


