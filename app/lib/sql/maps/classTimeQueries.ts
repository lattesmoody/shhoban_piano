// 과정별 수업 시간 설정 매핑 (ENV 기반 쿼리)
require('dotenv').config({ path: './.env.development.local' });

function normalizePlaceholders(raw: string | undefined): string {
  const input = (raw || '').trim();
  if (!input) return '';
  let normalized = input.replace(/\\\$(\d+)/g, (_m, d) => `$${d}`);
  normalized = normalized.replace(/`(\$\d+)/g, (_m, g1) => g1);
  return normalized;
}

export type ClassTimeSetting = {
  grade_name: string;
  pt_piano: number;   // 피아노+이론 중 피아노
  pt_theory: number;  // 피아노+이론 중 이론
  pd_piano: number;   // 피아노+드럼 중 피아노
  pd_drum: number;    // 피아노+드럼 중 드럼
  drum_only: number;  // 드럼 단일
  piano_only: number; // 피아노 단일
  practice_only: number; // 연습만
};

// 전체 조회
export async function selectClassTimeSettings(sql: any): Promise<ClassTimeSetting[]> {
  const envSql = normalizePlaceholders(process.env.SELECT_CLASS_TIME_SETTINGS_SQL);
  if (!envSql) throw new Error('SELECT_CLASS_TIME_SETTINGS_SQL 환경변수가 설정되지 않았습니다.');
  const result = await (sql as any).query(envSql);
  const rows: any[] = Array.isArray(result)
    ? result
    : ((result && (result as any).rows) ? (result as any).rows : []);
  return rows as ClassTimeSetting[];
}

// 개별 Upsert (grade_name 단위)
export async function upsertClassTimeSetting(sql: any, setting: ClassTimeSetting): Promise<void> {
  const envSql = normalizePlaceholders(process.env.UPSERT_CLASS_TIME_SETTING_SQL);
  if (!envSql) throw new Error('UPSERT_CLASS_TIME_SETTING_SQL 환경변수가 설정되지 않았습니다.');
  await (sql as any).query(envSql, [
    setting.grade_name,
    setting.pt_piano,
    setting.pt_theory,
    setting.pd_piano,
    setting.pd_drum,
    setting.drum_only,
    setting.piano_only,
    setting.practice_only,
  ]);
}


