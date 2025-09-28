import React from 'react';
import { neon } from '@neondatabase/serverless';
import { selectAllMembers, MemberListRow } from '@/app/lib/sql/maps/memberQueries';
import ClientForm from './ClientForm';

/**
 * 함수 이름: StudentCreateFormPage
 * 함수 역할: 수강생 추가 폼 UI와 데이터 제출 로직을 담당하는 컴포넌트
 */
export default async function StudentCreateFormPage() {
  const sql = neon(process.env.DATABASE_URL!);
  const members: MemberListRow[] = await selectAllMembers(sql);
  return <ClientForm members={members} />;
}