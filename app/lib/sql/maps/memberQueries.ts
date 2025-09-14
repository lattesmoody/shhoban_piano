// 이 파일은 .gitignore에 의해 커밋에서 제외됩니다.
// 로컬 전용 SQL 매핑 레이어

export type NewMemberPayload = {
  loginId: string;       // DB 컬럼명 은닉: member_id
  displayName: string;   // DB 컬럼명 은닉: member_name
  roleCode: number;      // DB 컬럼명 은닉: member_code
  passwordHash: string;  // DB 컬럼명 은닉: member_pw
};

export function buildNewMemberPayload(loginId: string, displayName: string, roleCode: number, passwordHash: string): NewMemberPayload {
  return { loginId, displayName, roleCode, passwordHash };
}

export async function insertMember(sql: any, payload: NewMemberPayload) {
  const { loginId, displayName, roleCode, passwordHash } = payload;
  const envSql = process.env.INSERT_MEMBER_SQL;
  if (envSql && envSql.trim().length > 0) {
    return (sql as any).unsafe(envSql, [loginId, displayName, roleCode, passwordHash]);
  }
  throw new Error('INSERT_MEMBER_SQL 환경변수가 설정되지 않았습니다. 운영/개발 환경변수에 SQL을 등록해 주세요.');
}

export async function selectMemberByLoginId(sql: any, loginId: string) {
  const envSql = process.env.SELECT_MEMBER_BY_LOGINID_SQL;
  if (envSql && envSql.trim().length > 0) {
    const rows = await (sql as any).unsafe(envSql, [loginId]);
    return rows;
  }
  throw new Error('SELECT_MEMBER_BY_LOGINID_SQL 환경변수가 설정되지 않았습니다. 운영/개발 환경변수에 SQL을 등록해 주세요.');
}


