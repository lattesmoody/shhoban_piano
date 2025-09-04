# README_RENEWAL (리뉴얼 홈페이지용)

## 1. 프로그램 설명
### 1-1. [개인PC 개발환경구축]
    - visual studio code 설치
      - 버전: 1.100.3
      - 설치 사이트: https://code.visualstudio.com/docs/?dv=win64user

    - node.js 설치 
      - 버전: 22.19.0 (LTS)
      - 설치 사이트: https://nodejs.org/dist/v22.19.0/node-v22.19.0-x64.msi

    - npm install 진행 (vscode 터미널에서)

    - npm run dev 명령어 인식 여부 확인.

    - Neon serverless driver 설치 
      - npm install @neondatabase/serverless
  
    - bcrypt 설치 (`2025.09.04)
      - npm install bcrypt
      - npm install --save-dev @types/bcrypt

### 1-2. [프로그램 기술 선정]
    - 프레임워크 : next.js 
    - 배포 및 호스팅 : Vercel 
    - (빌드 + 배포 + 호스팅까지 모두 가능한 클라우드 플랫폼) 
    - DB : Neon (Serverless Postgres) 
    - vercel에서 extension으로 제공.

### 1-3 [프로그램 다루는 방법]
    - 서버 테스트 방법 (로컬PC):
      - ```bash (윈도우 기준)
        npm run dev 
        ```
    - Deploy on Vercel

## 2. 기존 홈페이지 개선 필요 사항
### 2-1. [기능추가] 
    - 개선 요청자    : 심희준
    - 관련   기능    : Manage - 수강생 관리 
    - 개선 필요 내용 : 수강생을 통합으로 검색하는 기능 필요.
    - 개선 필요 사유 : 현재는 CTRL+F로 직접 확인 필요.

### 2-2. [기능개선] 
    - 개선 요청자    : 심희준
    - 관련   기능    : Manage - 수강생 관리 - 수강생 추가
    - 개선 필요 내용 : 고유번호는 휴대폰 8자리 + 예비숫자 1자리 => 숫자 8 ~ 9자리로 관리
    - 개선 필요 사유 : 휴대폰 뒷자리가 같은 사람인 경우?

### 2-3. [sample] 
    - 개선 요청자    : sample
    - 관련   기능    : sample
    - 개선 필요 내용 : sample
    - 개선 필요 사유 : sample

## 3-1. 기능 점검 필요 사항
    - 메인 화면 >> 이론실 버튼
      - 수강생이 "피아노" 연습 시간이 종료되었을 때 , "이론실"로 자동으로 넘어가는지 기능 확인 필요.



## 80-1 회의록
### [회의_00] 2025.00.00
      - 1. 
  
### [회의_00] 2025.00.00
      - 1. 
  
## 99. 프로그램 개발 간 오류 기록
### 99-1. test
    - 오류 발생 시간대 : 
    - 오류 원인 :
    - 오류 해결 방법 : 

---