// 서버 컴포넌트: 연습실 관리 DB에서 조회 후 클라이언트 렌더
import { neon } from '@neondatabase/serverless';
import { selectPracticeStatusToday, PracticeRow } from '@/app/lib/sql/maps/practiceRoomQueries';
import { selectKinderStatus, KinderRow } from '@/app/lib/sql/maps/kinderRoomQueries';
import MainClient from './MainClient';

export default async function AdminPage() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows: PracticeRow[] = await selectPracticeStatusToday(sql);
  const kinderRows: KinderRow[] = await selectKinderStatus(sql);
  return <MainClient rows={rows} kinderRows={kinderRows} />;
}
