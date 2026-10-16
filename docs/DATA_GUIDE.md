# 카페 데이터 관리

`data/venues.json`을 수정하고 `npm run build`로 반영합니다. `public/data.js`는 생성물이므로 직접 수정하지 않습니다.

## 핵심 필드

| 필드 | 의미 / 허용값 |
| --- | --- |
| `id` | 고유 영문 ID. 소문자로 시작하는 영문·숫자·하이픈 |
| `category` | `playground`: 전용 운동장 근거 확인 / `companion`: 일반 동반 카페 |
| `companionModes` | 동반 카페의 확인된 동반 방식. `packing`: 이동가방·캐리어 / `harness`: 하네스. 둘 다 가능하면 둘 다 입력, 미확인은 `[]` 또는 생략 |
| `playground` | `true`: 확인 / `false`: 없다는 근거 확인 / `null`: 미확인 |
| `status` | `listed`: 운영 등록·소개 근거 있음 / `closed`: 폐업 확인 / `unverified`: 운영 확인 필요 |
| `checkedAt` | 자료를 실제 확인한 날짜 `YYYY-MM-DD` |
| `petArea` | 실내·테라스·운동장 등 반려견 허용 구역 |
| `indoor`, `outdoor`, `parking`, `terrace` | `true` / `false` / `null`. 미확인은 `null` |
| `weightLimit` | 상한 체중 kg. 미확인은 `null` |
| `exclusive` | `true`: 상한 미만 / `false`: 상한 이하 |
| `playgroundWeightLimit` | 운동장에만 적용되는 별도 kg 상한. 운동장 유형 검색에서만 체중 필터에 적용하며 카페 전체 허용 조건과 구분 |
| `playgroundWeightExclusive` | 운동장 별도 상한의 미만 여부. 생략/false는 이하 |
| `phone` | 확인된 전화번호 문자열. 미확인은 `null`이며 전화 링크를 만들지 않음 |
| `lat`, `lng` | 지도 좌표. 좌표가 미확인이면 둘 다 `null`; 목록에는 표시하되 지도 핀·거리 계산에서는 제외 |
| `position`, `positionNote` | 좌표 확인 상태와 오차·출입구 주의사항 |
| `times` | 출발지별 `[최소 추정 분, 최대 추정 분]`. 미확인은 `null`이며 시간 제한 필터를 켜면 제외 |
| `schedule` | 일~토 7개 배열. 영업일 `[개장 분, 마감 분]`, 휴무 `null`. 전체 미확인은 `null` |
| `hoursConflict` | 출처 간 시간·요일 차이 여부 |
| `sources` | `name`, `url`, `type`을 가진 출처 배열 |
| `checks` | 방문 전 재확인해야 할 사항 |

## 분류 원칙

- 테라스나 일반 실내석을 전용 운동장으로 표시하지 않습니다.
- 시설이 확인되지 않았다는 이유로 `false`를 넣지 않습니다. `null`로 남깁니다.
- `closed`, `unverified` 장소는 검색 결과에 표시하지 않습니다.
- `listed`는 온라인 등록 근거가 있다는 뜻이며, 당일 영업 여부를 보장하지 않습니다.
- 공식 관광 자료에 있다고 영업시간까지 최신이라고 단정하지 않습니다.
- 수동 이동시간을 실시간 자동차 길찾기 결과처럼 표시하지 않습니다.
- 과거 정보를 새 확인일로 덮어쓰지 않습니다. 실제로 재확인한 장소만 확인일을 갱신합니다.
- 브라우저 즐겨찾기·개인 메모·인증 정보는 카페 공용 데이터에 넣지 않습니다.

## 카페 추가 순서

현재 관리자 등록 화면은 없습니다. 카페 이름, 주소, 운동장 여부, 이동가방·하네스 허용 규정과 정보 출처 링크를 전달해 데이터 파일에 추가하거나, 아래 순서로 직접 수정합니다.

동반 카페 분류 예시(실제 허용 규정을 확인한 값만 입력):

```json
"category": "companion",
"companionModes": ["packing", "harness"]
```

위 예시는 두 필터에 모두 표시됩니다. 가방만 허용하면 `["packing"]`, 하네스만 허용하면 `["harness"]`로 입력합니다. 방식 미확인 장소는 전체 카페에만 표시되며, 빈 배열은 동반 불가를 뜻하지 않습니다. 구역별 조건과 확인 출처는 `dogRule`, `petArea`, `sources`, `checks`에 기록합니다.

1. 기존 카페 객체 하나를 복사하고 새 `id`, `number`, 이름·주소를 입력합니다.
2. 운영 근거를 아직 확보하지 못했다면 `status: "unverified"`로 둡니다.
3. 동반 구역과 운동장 여부·주차·체중·영업시간을 출처로 대조합니다.
4. 미확인 값은 `null`로 남기고 `checks`에 확인 질문을 작성합니다.
5. `sources`에 https 링크와 출처 종류를 입력합니다.
6. 출발지 `hagye`, `nowon`, `gongneung`별 수동 계획 범위를 입력합니다.
7. `npm run validate:data`, `npm run build`, `npm test`를 실행합니다.
8. 데이터와 생성된 `public/data.js`를 함께 커밋하고 `main`에 푸시합니다. GitHub Actions가 검증과 빌드를 거쳐 GitHub Pages에 자동 배포합니다.

테스트는 초기 7곳의 고정 회귀 사례와 전체 운영 데이터의 지역·출처·미확인 값·상세/비교 화면 검증을 함께 실행합니다.

기본 이동 범위는 ‘시간 제한 없음’입니다. 현재 위치 또는 시간 제한 없음에서는 확인된 좌표로 직선거리를 계산하고 좌표 미확인 장소는 뒤에 표시합니다. 시간 필터를 선택하면 해당 출발지의 수동 추정이 있는 장소만 표시합니다. 서울 전체 및 25개 구 선택을 지원합니다.

전국 서비스로 확장할 때는 출발지 선택·실시간 경로 제공·정확한 좌표 확보·정기 데이터 갱신을 별도로 개발해야 합니다. 위치를 허용하면 현재 위치에서 시작하고, 실패하면 노원구 3개 역 중 선택한 출발지를 사용합니다.

## 서울 공개 등록 현황 반영 (2026-10-16)

`data/seoul-official-register.json`은 식품안전나라에서 실제 조회한 서울 업소 536곳의 상호·업종·주소 스냅샷입니다. 식당·편의점 등이 포함되어 있어 모든 행을 카페로 취급하지 않습니다. `scripts/import-seoul-cafes.cjs`는 휴게음식점 중 제외 대상, 상호의 카페/커피/디저트 표기, 별도 카페 소개 확인 목록을 적용하고 같은 상호·도로명 주소의 중복을 제거합니다. `data/seoul-import-audit.json`에 536행 각각의 반영/보류/중복 사유를 남깁니다. 반영 보류가 반려견 동반 불가를 뜻하지 않습니다. 일반음식점 중 카페 유형 미확인 업소와 공식 현황 미등록 업소는 누락될 수 있으므로 `coverage.complete`는 `false`입니다.

`data/seoul-cafe-supplements.json`에 운영자/업체 소개로 확인한 운동장·체중·카페 개방일 등을 보완합니다. 운동장은 헤이더그린, 멍뭉다방, 펫타리움 청담, 브릭독 플레이그라운드를 추가 확인했습니다. 오래된 블로그만 남아 현재 운영을 확인하기 어려운 곳은 임의로 등록하지 않습니다.

위치 수집은 웹사이트 방문자의 API 호출과 별개인 일회성 데이터 작업입니다. `scripts/locate-seoul-cafes.mjs`는 [Nominatim 이용 규칙](https://operations.osmfoundation.org/policies/nominatim/)에 맞게 단일 프로세스·1.2초 간격·식별 User-Agent·결과 캐시를 사용합니다. 주기 실행하거나 병렬 실행하지 마세요. 전체 지역 POI 수집이나 자동완성에는 사용하지 않습니다. `data/seoul-coordinate-cache.json`은 OpenStreetMap ODbL 출처와 검색 결과를 보존합니다.

`scripts/apply-seoul-coordinates.cjs`는 자치구·도로명·건물번호가 모두 일치하고 법정동 불일치나 넓은 단지 내 복수 건물의 모호성이 없는 좌표만 반영합니다. 도로 중심·동 중심 좌표는 매장 좌표로 사용하지 않습니다. 주소가 같아도 카페 층·출입구나 영업 여부를 보증하지 않으며 각 카드의 `positionNote`에 명시합니다.

스냅샷을 다시 반영하려면 `node scripts/import-seoul-cafes.cjs`, `node scripts/apply-seoul-coordinates.cjs`, `node scripts/build.mjs`, `node tests/verify.cjs` 순으로 실행합니다. 좌표 검색 결과가 없으면 좌표는 `null`로 유지합니다. 출처의 최신 자료를 실제로 다시 조회하기 전에는 스냅샷 확인일을 변경하지 않습니다.

## 직접 입력 출발지

출발지 입력에서 하계역·노원역·공릉역은 기존 좌표를 사용하고, 좌표가 확인된 등록 카페 이름/전체 주소는 로컬 데이터로 검색합니다. 그 밖의 주소·장소는 [Photon 공개 API](https://github.com/komoot/photon)로 검색하고 사용자가 결과를 선택해야 적용됩니다. 현재 위치 버튼과 페이지 초기 GPS 요청은 유지합니다.

현재 위치와 직접 입력 출발지는 수동 역별 이동시간 추정을 재사용하지 않습니다. 직선거리로 정렬하고 시간 필터를 비활성화합니다. 출발지 입력 내용과 검색 캐시는 페이지 메모리에서만 유지하며, 저장소/즐겨찾기에 기록하지 않습니다. 외부 검색에는 사용자가 제출한 검색어만 전송하고 GPS 좌표는 첨부하지 않습니다. 요청 취소·버전 검사·시간 초과를 적용하며 검색 실패 시 현재 적용된 출발지를 유지합니다.

## 음식점·술집 분류

`restaurant`와 `bar`는 동반 방식(`companionModes`)과 별도 업종입니다. 2026-10-16 공식 반려동물 동반 업소 스냅샷 중 일반음식점 등록과 상호의 명시적 음식·주점 표기를 함께 사용합니다. `scripts/classify-dining.cjs`에서 분류하며 업종이 모호한 상호는 제외합니다. 공식 등록만으로 술 판매나 주점 여부를 추측하지 않습니다. 최신 메뉴·동반 조건은 현장 미확인입니다.

재생성 순서: `node scripts/import-seoul-cafes.cjs`, `node scripts/apply-seoul-coordinates.cjs`, `npm run build`. 메인 소개 문구는 `public/index.html`에서 수정하며 JavaScript가 덮어쓰지 않습니다.
