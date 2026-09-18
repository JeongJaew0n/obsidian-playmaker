# Playmaker

노트에 스킨을 입히는 Obsidian 플러그인.

CSS 스니펫과 달리 **노트 단위로 켜고 끈다.** 스킨을 지정한 노트만 바뀌고
나머지 탭은 원래 테마 그대로다. 노트 내용은 한 글자도 바뀌지 않는다 — 색·글꼴·질감만 덮는다.

## 스킨

| 이름 | 분위기 | 성격 |
| --- | --- | --- |
| **나 지금 해커** | 새벽 세시 서버실 · 낡은 관제실 · 빙하 데이터센터 · 흔적 없는 침입 | 발광하는 CRT. 스캔라인·인광·프롬프트 |
| **오래된 편지지** | 다락방에서 찾은 편지 | 빛나지 않는 종이. 넓은 줄간격, 세리프, 종이 결 |

이름은 색이나 기술 용어가 아니라 **장면**으로 짓는다. `Ice` · `Mono` 로는 무엇이 다른지
읽어서 알 수 없다. 저장되는 id 는 영문 그대로 두고 화면에 보이는 이름만 별명을 쓴다.

## 적용 범위

- **노트별** — 노트마다 다른 스킨을 지정할 수 있다
- **전역** — 모든 노트에 한 스킨을 입힌다. **기본은 꺼짐**이고, 켜도 노트별 지정이 우선한다
- 전역을 켠 상태에서 특정 노트만 맨얼굴로 두는 것도 된다

## 명령

| 명령 | 설명 |
| --- | --- |
| `스킨 켜기/끄기 (현재 노트)` | 지금 보이면 끄고, 아니면 활성 스킨을 입힌다 |
| `이 노트에 '나 지금 해커' 입히기` | 스킨을 직접 지정한다 (스킨마다 하나씩 있다) |
| `이 노트만 맨얼굴로` | 전역이 켜져 있어도 이 노트는 제외한다 |
| `스킨 바꾸기` · `분위기 바꾸기` | 차례로 넘긴다 |
| `모든 노트에 적용 켜기/끄기` | 전역 스위치 |
| `노트별 지정 전부 해제` | 지정을 모두 지운다 |

기본 단축키는 없다. 설정 → 단축키에서 직접 지정한다.

## 개발

```bash
npm install
npm run dev        # esbuild watch
npm run build      # 타입 검사 + 프로덕션 번들
npm run typecheck  # 타입 검사만
```

빌드 산출물은 `main.js` 다. vault 에 설치할 때는 `main.js`, `manifest.json`, `styles.css`
세 파일을 `<vault>/.obsidian/plugins/playmaker/` 에 둔다.

## 구조

```
src/main.ts             플러그인 진입점 — 명령, 이벤트 구독, 설정 저장
src/skin-controller.ts  스킨 적용·해제, 동적 CSS 변수 <style> 관리
src/settings.ts         설정 스키마 v2, v1 마이그레이션, 설정 탭
src/skins/index.ts      스킨 레지스트리 — 스킨을 추가할 때 손대는 곳
src/skins/types.ts      스킨 정의 타입
src/skins/palette.ts    팔레트 → Obsidian CSS 변수 매핑
src/skins/terminal.ts   '나 지금 해커'
src/skins/letterpress.ts '오래된 편지지'
styles.css              스킨 골격 (변수를 쓰는 뼈대) + 스킨별 규칙
```

### 설계 메모

Obsidian 1.13.7 의 `app.css` · `app.js` 를 실측해서 정한 것들이다.

- **상태의 정본은 노트별 지정표**(`notes`)다. leaf 는 모드 전환·재배치 때 DOM 이 다시 만들어지고
  id 도 세션을 넘기지 못한다. DOM 클래스는 이 표에서 파생된 결과일 뿐이고,
  `active-leaf-change` · `layout-change` · `file-open` · `css-change` 마다 다시 맞춘다.
- **스캔라인 오버레이는 `.view-content` 에 건다.** 이 요소는 마크다운 뷰에서 `overflow: hidden`
  이라 스크롤하지 않는다. 스크롤 컨테이너(`.markdown-preview-view` / `.cm-scroller`)에 걸면
  오버레이가 콘텐츠와 함께 밀려 올라간다. 단 `position: static` 이므로 `relative` 를 줘야 한다.
- **스킨 스코프에 `color` 를 직접 선언한다.** `body { color: var(--text-normal) }` 가 있어서,
  글자색 규칙이 없는 편집 모드는 body 에서 이미 계산된 색을 상속받는다. 스코프 안에서
  변수만 덮어써도 편집 모드 글자색은 바뀌지 않는다.
- **파생 변수는 개별로 다시 정의한다.** `--code-normal: var(--text-normal)` 처럼 상위 스코프에서
  계산되는 변수는 `--text-normal` 만 덮어써도 따라오지 않는다.
- **질감 오버레이는 스킨끼리 한 자리를 공유한다.** 해커의 스캔라인과 편지지의 종이 결이
  같은 `::after` 를 쓰고 `--pm-overlay` 값만 다르다. 실측으로 맞춘 부분을 두 번 만들지 않는다.
- **글꼴을 비워두면 `--font-monospace` 를 건드리지 않는다.** 자기 참조가 되어 값이 무효화되고
  글꼴이 통째로 깨진다.
- **인쇄·PDF 대응은 필요 없다.** Obsidian 은 `document.body.createDiv("print")` 로 body 직하위에
  새 DOM 을 만들어 다시 렌더한다. 스코프를 뷰 컨테이너에만 두면 스킨이 새지 않는다.
