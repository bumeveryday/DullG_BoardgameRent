# 🎲 덜지니어스 보드게임 대여소 (DullG BoardGameRent) - Frontend

이 프로젝트는 덜지니어스 부원들이 보드게임을 대여/반납하고 관리할 수 있는 웹 서비스의 **프론트엔드(React)** 부분입니다.

## 🚀 시작하기 (Getting Started)

이 프로젝트를 로컬 컴퓨터에서 실행하려면 다음 단계가 필요합니다.

### 1. 필수 설치 프로그램
*   [Node.js](https://nodejs.org/) (LTS 버전 권장)

### 2. 프로젝트 실행
터미널(cmd, powershell, vscode 터미널 등)에서 프로젝트 폴더로 이동한 후 아래 명령어를 순서대로 입력하세요.

```bash
# 1. 라이브러리 설치 (최초 1회만 필요)
npm install

# 2. 개발 서버 시작
npm start
```
명령어를 입력하면 자동으로 브라우저가 열리며 `http://localhost:3000` 주소로 접속됩니다.

## ⚙️ 환경 설정 (.env)

API 서버 주소 등은 `.env` 파일에서 관리합니다. 프로젝트 루트에 `.env` 파일이 있어야 정상 작동합니다.

```ini
# .env 예시
REACT_APP_API_BASE_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```
*   `REACT_APP_API_BASE_URL`: Google Apps Script 배포 URL

## 📂 백엔드 (Server)

백엔드 로직(Google Apps Script)과 데이터베이스(Google Sheet)에 대한 설명은 `server` 폴더 안의 문서를 참고하세요.

👉 [**백엔드 설명서 보러가기**](./server/README.md)

## 📦 배포 (Build)

웹 사이트를 실제 서버에 올리기 위해 빌드하려면 다음 명령어를 사용합니다.

```bash
npm run build
```
`build` 폴더에 생성된 파일들을 정적 호스팅 서비스(GitHub Pages, Vercel, Netlify 등)에 업로드하여 배포합니다.
