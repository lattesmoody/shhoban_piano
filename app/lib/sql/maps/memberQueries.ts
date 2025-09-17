// 로컬 전용 SQL 매핑 레이어
require('dotenv').config({ path: './.env.development.local' }); 

function normalizePlaceholders(raw: string | undefined): string {
  const input = (raw || '').trim();
  if (!input) return '';
  let normalized = input.replace(/\\\$(\d+)/g, (_m, d) => `$${d}`);
  normalized = normalized.replace(/`(\$\d+)/g, (_m, g1) => g1);
  return normalized;
}

export type NewMemberPayload = {
  loginId: string;       
  displayName: string;   
  roleCode: number;     
  passwordHash: string; 
};

export function buildNewMemberPayload(loginId: string, displayName: string, roleCode: number, passwordHash: string): NewMemberPayload {
  return { loginId, displayName, roleCode, passwordHash };
}

export async function insertMember(sql: any, payload: NewMemberPayload) {
  const { loginId, displayName, roleCode, passwordHash } = payload;
  const envSql = process.env.INSERT_MEMBER_SQL;
  if (envSql && envSql.trim().length > 0) {
    // neon v2: 값 자리표시자($1..) 사용 시 query 함수를 사용
    return (sql as any).query(envSql, [loginId, displayName, roleCode, passwordHash]);
  }
  throw new Error('INSERT_MEMBER_SQL 환경변수가 설정되지 않았습니다. 운영/개발 환경변수에 SQL을 등록해 주세요.');
}

export async function selectMemberByLoginId(sql: any, loginId: string) {
  const envSql = process.env.SELECT_MEMBER_BY_LOGINID_SQL;
  if (envSql && envSql.trim().length > 0) {
    const result = await (sql as any).query(envSql, [loginId.trim()]);
    return result;
  }
  throw new Error('SELECT_MEMBER_BY_LOGINID_SQL 환경변수가 설정되지 않았습니다. 운영/개발 환경변수에 SQL을 등록해 주세요.');
}

export type MemberListRow = {
  member_id: string;
  member_name: string;
  member_code: number;
};

export async function selectAllMembers(sql: any): Promise<MemberListRow[]> {
  const envSql = process.env.SELECT_ALL_MEMBERS_SQL;
  if (envSql && envSql.trim().length > 0) {
    const result = await (sql as any).query(envSql);
    const rows: any[] = Array.isArray(result)
      ? result
      : (result && (result as any).rows && Array.isArray((result as any).rows) ? (result as any).rows : []);
    return rows as MemberListRow[];
  }
  throw new Error('SELECT_ALL_MEMBERS_SQL 환경변수가 설정되지 않았습니다.');
}

export async function deleteMemberByLoginId(sql: any, loginId: string): Promise<void> {
  const envSql = normalizePlaceholders(process.env.DELETE_MEMBER_BY_ID_SQL);
  if (!envSql) throw new Error('DELETE_MEMBER_BY_ID_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql, [loginId]);
}

export async function selectMemberRoleCode(sql: any, loginId: string): Promise<number | null> {
  const envSql = normalizePlaceholders(process.env.SELECT_MEMBER_ROLE_BY_ID_SQL);
  if (!envSql) throw new Error('SELECT_MEMBER_ROLE_BY_ID_SQL 환경변수가 설정되지 않았습니다.');
  const result = await (sql as any).query(envSql, [loginId]);
  const rows: any[] = Array.isArray(result)
    ? result
    : (result && (result as any).rows && Array.isArray((result as any).rows) ? (result as any).rows : []);
  if (!rows || rows.length === 0) return null;
  const code = rows[0]?.member_code;
  return (code === null || code === undefined) ? null : Number(code);
}


