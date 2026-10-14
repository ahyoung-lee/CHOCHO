# CHOCHO — 반려견 카페 찾기

Dog-cafe-finder

**CHOCHO는 ‘댕댕’을 풀어 쓴 영어 이름입니다.** 반려견과 함께 갈 카페를 찾는 서비스 이름으로 사용합니다.

반려견 운동장 카페와 일반 반려견 동반 카페를 **유형·시설·입장 조건으로 구분해 검색하고 지도에서 비교**하는 초기 웹사이트입니다. 기존 노원 근교 운동장 지도를 바탕으로 개발했습니다.

초기 데이터는 노원·서울 북부·남양주 중심 7곳입니다. 전국 전체 목록이나 실시간 영업 조회 서비스는 아닙니다.

## 기능

- 전체 / 운동장 카페 / 일반 동반 카페 전환
- 이름·주소·지역 검색, 지역·출발지·이동 범위 필터
- 천연잔디 / 인조잔디 / 주차 / 실내 동반 / 테라스 / 체중 / 운영요일 필터
- 카드와 지도 선택 연동, 지도 이동·확대·축소
- 최대 3곳 비교표, 브라우저 즐겨찾기
- 출처·확인일·미확인 시설·시간 충돌·방문 전 재확인 항목 표시
- 모바일 목록↔지도 전환
- 폐업(`closed`)과 운영 미확인(`unverified`) 데이터는 검색에서 제외

## 실행 방법

[Node.js 공식 사이트](https://nodejs.org/)에서 Node.js 20 이상을 설치합니다. 별도 npm 패키지 설치는 필요하지 않습니다.

```bash
npm run build
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 종료는 터미널에서 `Ctrl+C`입니다.

```bash
npm test                 # 기능과 DOM 렌더링 검증
npm run validate:data    # 카페 정보 검증
npm run build            # dist/ 생성
npm run preview          # dist/ 로컬 확인
```

## 파일 구조

| 경로 | 역할 |
| --- | --- |
| `public/index.html` | 페이지 구조·카페 유형·필터·모달 |
| `public/styles.css` | 모바일/데스크톱 화면 스타일 |
| `public/app.js` | 검색·지도·즐겨찾기·비교 기능 |
| `public/data.js` | JSON에서 생성된 브라우저 데이터 |
| `public/icon.svg` | 사이트 아이콘 |
| `data/venues.json` | 수정할 원본 카페 정보 |
| `scripts/build.mjs` | 데이터 검증·생성·정적 빌드 |
| `scripts/serve.mjs` | 로컬 개발 서버 |
| `scripts/validate-data.cjs` | 데이터 규칙 검사 |
| `tests/verify.cjs` | 필터·표시·비교·좌표 검증 |
| `docs/DATA_GUIDE.md` | 카페 추가와 확인 규칙 |
| `docs/VALIDATION.md` | 검증 결과와 한계 |

## 초기 데이터

운동장 카페: 니멍내멍, 리블링코코, 몽글브라운, 어반밸리, 개떼놀이터 남양주점.

일반 동반 카페: 200퍼센트, 카페바이브. 이 2곳은 동반 구역 근거를 확인했지만 전용 야외 운동장을 확인하지 못해 운동장 카페로 표시하지 않습니다.

기존 5곳은 2026-10-13, 추가 2곳은 2026-10-14 공개 자료 확인 기준입니다. 각 항목의 `checkedAt`을 보존합니다. 전화·현장 확인은 하지 않았습니다. 다니맘은 현재 운영 근거가 부족해 초기 목록에서 제외했습니다.

## 배포

`npm run build` 후 `dist/`를 정적 웹 호스팅에 배포할 수 있습니다. API 키 없이 OpenStreetMap 배경 지도를 이용합니다. 기존 Sites 비공개 지도는 이 프로젝트와 별도로 유지됩니다.

**GitHub 저장소를 비공개로 만드는 것과 웹사이트 방문을 제한하는 것은 별개입니다.** 이 코드 자체에는 로그인 기능이 없습니다. 실제 사이트를 비공개로 운영하려면 배포 서비스의 접근 제한을 설정해야 합니다. `noindex,nofollow`는 검색 색인 설정이며 인증 기능이 아닙니다.

회원가입·리뷰 작성·관리자 게시·전국 데이터 자동 수집·실시간 경로 API는 이 초기 버전에 포함되지 않습니다. 장소 정보는 JSON 수정 후 다시 빌드하는 방식입니다.

## 검증

기능·DOM 기반 26개 시나리오 및 JavaScript 문법·데이터 검증이 통과했습니다. 지원 브라우저 도구가 없는 환경에서 작업하여 실제 모바일 화면과 외부 지도 타일 로딩은 별도 검증하지 못했습니다. 상세한 내용은 `docs/VALIDATION.md`를 참고하세요.

## 출처·지도

각 카페의 `sources`에 실제 정보 확인 링크를 기록했습니다.

- [한국관광공사 대한민국 구석구석](https://korean.visitkorea.or.kr/)
- [식품안전나라 반려동물 동반 업소 목록](https://www.foodsafetykorea.go.kr/portal/petKorea.do)
- [OpenStreetMap 저작권·출처 표시](https://www.openstreetmap.org/copyright)
- [OpenStreetMap 지도 타일 이용 규칙](https://operations.osmfoundation.org/policies/tiles/)

현재 화면의 타일만 불러오며 오프라인 저장이나 지도 영역 사전 다운로드는 제공하지 않습니다. 방문 전 동반 조건·영업시간·운동장 개방을 재확인하세요.
