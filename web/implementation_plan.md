# 🏗️ 웹 프론트엔드 리팩토링 구현 계획서

## 🎯 목표

현재 1,500줄에 달하는 `index.html` 파일을 역할별로 분리(HTML, CSS, JS)하여 가독성을 높이고 유지보수 효율성을 개선합니다.

## 📦 폴더 구조 계획

```
web/
├── index.html          (HTML 구조)
├── css/
│   └── style.css       (디자인 스타일)
└── js/
    ├── neural-viz.js   (신경망 시각화 로직)
    └── main.js         (로또 생성 및 공통 로직)
```

## 📅 단계별 실행 계획 (완료)

- [x] **Step 1: CSS 스타일 분리**
  - `web/css/style.css` 생성 및 스타일 이동.
  - `index.html`에서 `<link>` 태그 연결.
  - 브라우저 디자인 동일성 검증.

- [x] **Step 2: 신경망 시각화 JS 분리**
  - `web/js/neural-viz.js` 생성 및 관련 로직 이동.
  - `index.html`에서 `<script>` 태그 연결.
  - 시각화 기능(색상 변경, 오토 플로우 등) 검증.

- [x] **Step 3: 메인 로직 JS 분리 및 UI 고도화**
  - `web/js/main.js` 생성 (로또 로직, 탭 기능 포함).
  - `index.html` UI 구조 변경 (탭 메뉴 도입).
  - 기능 통합 및 검증.

- [x] **Step 4: 최종 정리 (Cleanup)**
  - `index.html` 정리 및 포맷팅.
  - 리팩토링 및 고도화 완료!
