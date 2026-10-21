# CHOCHO — 반려견 카페 찾기

Dog-cafe-finder

업체 등록 요청은 FormSubmit의 AJAX 엔드포인트를 통해 `ay_lee@naver.com`으로 전달합니다. 업체명, 업종, 사용자가 선택한 건물 주소·좌표, 동반 및 전송 동의를 보내며, 공개 업체 목록에는 자동 추가하지 않습니다. 최초 요청 후 수신함(스팸함 포함)에 도착하는 FormSubmit 인증 메일의 링크를 운영자가 클릭해야 메일 수신이 활성화됩니다. 서비스 접수 성공은 실제 메일 도착을 보장하지 않으므로 활성화 후 실제 사이트에서 수신을 확인하세요. 브라우저 코드에 메일 계정 비밀번호는 사용하지 않습니다.

**CHOCHO는 ‘댕댕’을 풀어 쓴 영어 이름입니다.** 반려견과 함께 갈 카페를 찾는 서비스 이름으로 사용합니다.

반려견 운동장 카페와 일반 반려견 동반 카페를 **유형·시설·입장 조건으로 구분해 검색하고 지도에서 비교**하는 초기 웹사이트입니다. 기존 노원 근교 운동장 지도를 바탕으로 개발했습니다.

2026-10-16 공개 자료 기준 서울 25개 구 194곳과 기존 근교 6곳, 총 200곳을 등록했습니다. 식품안전나라 서울 반려동물 동반 업소 536곳에서 카페·디저트 업소를 선별하고 별도 확인한 운동장 카페를 보완했습니다. 서울의 모든 카페를 빠짐없이 조사한 전수 목록이나 실시간 영업 조회 서비스는 아닙니다.

## 기능

- 전체 / 운동장 카페 / 일반 동반 카페 전환
- 이름·주소·지역 검색, 서울 전체/25개 구·출발지·이동 범위 필터
- 페이지 접속 시 현재 위치 권한 요청, 허용 시 지도·출발지 자동 적용
- 기본 시간 제한 없음, 확인된 좌표의 직선거리 정렬, 미확인 좌표/전화/시간을 그대로 표시
- 조건필터: 주차가능 / 실내 동반 / 테라스 동반
- 주소·장소 직접 입력 → 검색 결과 선택 → 지도 중심/직선거리 정렬 반영
- 지역·체중·운영요일 등 추가 옵션 접기/펼치기
- 빨간 지도 번호 핀과 선택 상태 강조
- 카드와 지도 선택 연동, 지도 이동·확대·축소
- 최대 3곳 비교표, 브라우저 즐겨찾기
- 출처·확인일·미확인 시설·시간 충돌·방문 전 재확인 항목 표시
- 모바일 목록↔지도 전환
- 폐업(`closed`)과 운영 미확인(`unverified`) 데이터는 검색에서 제외

## 실행 방법

### 네이버 지도와 엑셀 업체 검색

지도 배경은 네이버 Maps Dynamic Map을 사용합니다. `public/app.js`의 지도 설정에 Client ID를 지정하고, 네이버 클라우드 Maps Application의 Web 서비스 URL에 배포 도메인을 등록합니다. 로컬 미리보기에는 `http://localhost`도 등록해야 합니다. Client Secret은 브라우저 코드에 넣지 않습니다.

업체 검색은 `업체정보/업체정보_간편입력.xlsx`에서 반영한 등록 업체만 대상으로 합니다. 엑셀 저장만으로 공개 사이트가 갱신되지는 않습니다. 수정 후 다음 순서로 반영하고 배포합니다.

```powershell
python scripts/import-workbook.py
node scripts/apply-registered-coordinates.cjs
node scripts/validate-data.cjs
node scripts/build.mjs
npm test
python tests/workbook.py
```

엑셀에서 삭제한 업체는 반영 시 목록에서 제외됩니다. 새 업체나 주소를 바꾼 업체는 좌표 확인 전까지 검색 목록에만 표시되며, 위치를 임의로 추정해 핀을 만들지 않습니다. 확인 후 변경 파일을 커밋하고 `main`에 푸시하면 Pages 배포가 시작됩니다.

장소 목록 검색은 등록 업체만 사용합니다. 업체명 검색에 등록되지 않은 주소·장소(예: 구리시 공설묘지)를 입력하면 Photon으로 기준 위치를 찾습니다. 결과가 하나면 바로 적용하고, 여러 곳이면 사용자가 선택합니다. 출발지 검색도 동일하게 동작합니다.

직접 검색한 기준 위치와 '내 위치'는 동일하게 10km 이내의 주소 좌표가 확인된 등록 업체만 직선거리 순으로 나열합니다. 지도는 기준 위치를 중심에 유지하면서 목록의 모든 업체 핀이 들어오도록 범위를 맞춥니다. 기준 위치를 새로 적용하면 이전 업체명 검색어는 해제합니다. 위치 권한을 거부하거나 주소 검색이 실패하면 적용 중인 위치를 유지합니다.

현재 등록 업체 36곳의 도로명·건물번호와 일치하는 건물 주소 좌표를 `data/registered-kakao-address-cache.json`에 보관합니다. 이 캐시는 업체 목록을 추가하지 않습니다. 새 주소는 `node scripts/locate-registered-kakao-addresses.mjs`로 확인 후 `node scripts/apply-registered-coordinates.cjs`로 반영합니다. 웹사이트 방문 시 이 주소 확인 API를 호출하지 않습니다. 엑셀에서 주소를 바꾸면 기존 좌표는 제거하고 새 주소를 확인해야 합니다.

지도 인증 또는 연결 실패 시에도 업체 목록·필터·비교 기능은 이용할 수 있습니다.

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

GitHub Pages: https://ahyoung-lee.github.io/CHOCHO/

GitHub Actions 워크플로(`.github/workflows/pages.yml`)가 `main`에 푸시될 때 테스트와 빌드를 실행하고 `dist/`를 GitHub Pages에 배포합니다. 저장소 Settings → Pages의 Source는 GitHub Actions로 설정합니다.

`npm run build` 후 `dist/`를 정적 웹 호스팅에 배포할 수 있습니다. API 키 없이 OpenStreetMap 배경 지도를 이용합니다. 기존 Sites 비공개 지도는 이 프로젝트와 별도로 유지됩니다.

**GitHub 저장소를 비공개로 만드는 것과 웹사이트 방문을 제한하는 것은 별개입니다.** 이 코드 자체에는 로그인 기능이 없습니다. 실제 사이트를 비공개로 운영하려면 배포 서비스의 접근 제한을 설정해야 합니다. `noindex,nofollow`는 검색 색인 설정이며 인증 기능이 아닙니다.

업체 카드의 리뷰 작성 버튼은 준비 중인 비활성 버튼입니다. 회원가입·리뷰 작성·관리자 게시·전국 데이터 자동 수집·실시간 경로 API는 이 초기 버전에 포함되지 않습니다. 장소 정보는 JSON 수정 후 다시 빌드하는 방식입니다.

## 검증

기능·DOM 기반 49개 시나리오 및 JavaScript 문법·200곳 데이터 검증이 통과했습니다. 로컬 실제 브라우저에서 서울 지역/유형 필터와 상세 정보 화면을 확인했습니다. 실제 GPS 응답과 모바일 터치 제스처는 별도 검증하지 않았습니다. 상세한 내용은 `docs/VALIDATION.md`를 참고하세요.

## 출처·지도

각 카페의 `sources`에 실제 정보 확인 링크를 기록했습니다.

- [한국관광공사 대한민국 구석구석](https://korean.visitkorea.or.kr/)
- [식품안전나라 반려동물 동반 업소 목록](https://www.foodsafetykorea.go.kr/portal/petKorea.do)
- [OpenStreetMap 저작권·출처 표시](https://www.openstreetmap.org/copyright)
- [OpenStreetMap 지도 타일 이용 규칙](https://operations.osmfoundation.org/policies/tiles/)

현재 화면의 타일만 불러오며 오프라인 저장이나 지도 영역 사전 다운로드는 제공하지 않습니다. 방문 전 동반 조건·영업시간·운동장 개방을 재확인하세요.
