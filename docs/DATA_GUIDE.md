# 카페 데이터 관리

`data/venues.json`을 수정하고 `npm run build`로 반영합니다. `public/data.js`는 생성물이므로 직접 수정하지 않습니다.

## 핵심 필드

| 필드 | 의미 / 허용값 |
| --- | --- |
| `id` | 고유 영문 ID. 소문자로 시작하는 영문·숫자·하이픈 |
| `category` | `playground`: 전용 운동장 근거 확인 / `companion`: 일반 동반 카페 |
| `playground` | `true`: 확인 / `false`: 없다는 근거 확인 / `null`: 미확인 |
| `status` | `listed`: 운영 등록·소개 근거 있음 / `closed`: 폐업 확인 / `unverified`: 운영 확인 필요 |
| `checkedAt` | 자료를 실제 확인한 날짜 `YYYY-MM-DD` |
| `petArea` | 실내·테라스·운동장 등 반려견 허용 구역 |
| `indoor`, `outdoor`, `parking`, `terrace` | `true` / `false` / `null`. 미확인은 `null` |
| `weightLimit` | 상한 체중 kg. 미확인은 `null` |
| `exclusive` | `true`: 상한 미만 / `false`: 상한 이하 |
| `lat`, `lng` | 지도 좌표. 정확한 주소 좌표가 없으면 주변 참고 위치와 근거를 명확하게 표시 |
| `position`, `positionNote` | 좌표 확인 상태와 오차·출입구 주의사항 |
| `times` | 출발지별 `[최소 추정 분, 최대 추정 분]` |
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

1. 기존 카페 객체 하나를 복사하고 새 `id`, `number`, 이름·주소를 입력합니다.
2. 운영 근거를 아직 확보하지 못했다면 `status: "unverified"`로 둡니다.
3. 동반 구역과 운동장 여부·주차·체중·영업시간을 출처로 대조합니다.
4. 미확인 값은 `null`로 남기고 `checks`에 확인 질문을 작성합니다.
5. `sources`에 https 링크와 출처 종류를 입력합니다.
6. 출발지 `hagye`, `nowon`, `gongneung`별 수동 계획 범위를 입력합니다.
7. `npm run validate:data`, `npm run build`, `npm test`를 실행합니다.

전국 서비스로 확장할 때는 출발지 선택·실시간 경로 제공·정확한 좌표 확보·정기 데이터 갱신을 별도로 개발해야 합니다. 초기 화면의 출발지는 노원구 3개 역입니다.
