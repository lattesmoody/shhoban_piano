/*
  수정일자: 2025.09.10
  작 성 자: SHIM
  최근수정: "외부 접근 명시 허용."
*/
import type { NextConfig } from 'next';

const config: NextConfig = {
  // 'experimental' 대신 'devServer'를 사용
  devServer: {
    allowedDevOrigins: process.env.ALLOWED_DEV_ORIGIN
      ? [process.env.ALLOWED_DEV_ORIGIN]
      : [],
  },
};

export default config;