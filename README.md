# 내면아이 클리닉 (Inner Child Clinic)

내면아이 치유를 위한 대화형 웹 애플리케이션입니다. 사용자가 트라우마 상황을 설명하고 내면아이와 대화하며 치유의 과정을 경험할 수 있습니다.

## 주요 기능

- **트라우마 맞춤형 대화**: 사용자가 설명한 트라우마 상황에 맞춰 내면아이가 공감적인 응답을 제공합니다.
- **대화 기반 치유 과정**: 대화를 통해 치유 게이지가 채워지며, 사용자의 내면아이 치유 과정을 시각화합니다.
- **대화 이력 관리**: 대화 컨텍스트를 유지하여 더 자연스럽고 일관된 상호작용을 제공합니다.
- **반응형 디자인**: 모든 디바이스에서 최적의 사용자 경험을 제공합니다.

## 기술 스택

- **프레임워크**: Next.js (React)
- **스타일링**: CSS
- **AI 통합**: OpenAI API (GPT-4o)
- **배포**: Vercel

## 로컬 개발 환경 설정

### 사전 요구사항

- Node.js 18.x 이상
- npm 또는 yarn

### 설치 및 실행 방법

1. **리포지토리 클론 (해당되는 경우):**
   ```bash
   git clone <repository_url>
   cd nextjs-inner-child-clinic
   ```

2. **의존성 설치:**
   ```bash
   npm install
   # 또는
   yarn install
   ```

3. **환경 변수 설정:**
   - `.env.local` 파일 편집:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     ```

4. **개발 서버 실행:**
   ```bash
   npm run dev
   # 또는
   yarn dev
   ```

5. **애플리케이션 접속:**
   웹 브라우저에서 다음 주소로 접속:
   [http://localhost:3000](http://localhost:3000)

## Vercel 배포 방법

### 1. Vercel CLI를 통한 배포

1. **Vercel CLI 설치:**
   ```bash
   npm install -g vercel
   # 또는
   yarn global add vercel
   ```

2. **Vercel에 로그인:**
   ```bash
   vercel login
   ```

3. **프로젝트 배포:**
   ```bash
   vercel
   ```

4. **환경 변수 설정:**
   배포 과정에서 환경 변수를 설정하거나, Vercel 대시보드에서 설정할 수 있습니다.

### 2. Vercel 대시보드를 통한 배포

1. [Vercel](https://vercel.com)에 가입하고 로그인합니다.

2. "New Project" 버튼을 클릭합니다.

3. 프로젝트 리포지토리를 가져옵니다 (GitHub, GitLab, Bitbucket 등에서).

4. 프로젝트 설정을 구성합니다:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `next build`
   - Output Directory: .next

5. "Environment Variables" 섹션에서 다음 환경 변수를 추가합니다:
   - `OPENAI_API_KEY`: OpenAI API 키

6. "Deploy" 버튼을 클릭하여 배포를 시작합니다.

7. 배포가 완료되면 제공된 URL로 애플리케이션에 접속할 수 있습니다.

## 프로젝트 구조

```
nextjs-inner-child-clinic/
├── pages/
│   ├── _app.tsx           # 앱 컴포넌트
│   ├── index.tsx          # 홈페이지 (트라우마 입력)
│   ├── chat.tsx           # 대화 페이지
│   └── api/
│       └── chat.ts        # 채팅 API 엔드포인트
├── styles/
│   └── globals.css        # 전역 스타일
├── public/                # 정적 파일
├── package.json           # 프로젝트 의존성
├── tsconfig.json          # TypeScript 설정
├── .env.local             # 환경 변수 (git에 포함되지 않음)
└── README.md              # 이 파일
```

## 참고 사항

- 유효한 `OPENAI_API_KEY`가 `.env.local` 파일에 제공되지 않으면 AI 응답은 모의(mock) 응답을 사용합니다.
- 이 서비스는 전문적인 심리 상담을 대체하지 않습니다. 심각한 정신 건강 문제가 있다면 전문가와 상담하세요.
