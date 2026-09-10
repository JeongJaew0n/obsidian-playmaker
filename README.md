# Playmaker

현재 열린 노트를 터미널 화면처럼 꾸미는 Obsidian 플러그인.

CSS 스니펫과 달리 **노트 단위로 켜고 끈다.** 스킨이 켜진 노트만 터미널이 되고,
나머지 탭은 원래 테마 그대로다. 노트 내용은 한 글자도 바뀌지 않는다 — 색·글꼴·질감만 덮는다.

## 기능

- 활성 노트에 터미널 스킨 토글 (명령 팔레트 / 리본 아이콘 / 핫키)
- 프리셋 4종: Green(P1 인광), Amber, Ice, Mono
- CRT 질감: 스캔라인, 인광(글자 발광), 플리커
- 프롬프트 기호를 각 줄 앞에 덧그리기 (`::before` 로만 그리므로 복사에는 따라가지 않는다)
- 읽기 모드 · 라이브 프리뷰 · 소스 모드 전부 지원
- 파일 이동·이름변경·삭제를 따라간다

## 명령

| 명령 | 설명 |
| --- | --- |
| `터미널 스킨 토글 (현재 노트)` | 활성 노트의 스킨을 켜거나 끈다 |
| `터미널 스킨 전체 해제` | 켜둔 노트를 모두 해제한다 |
| `터미널 스킨 프리셋 순환` | 프리셋을 차례로 바꾼다 |

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
src/settings.ts         설정 정의와 설정 탭
src/presets.ts          팔레트 → Obsidian CSS 변수 매핑
styles.css              스킨 구조 규칙 (변수를 쓰는 골격)
```

### 설계 메모

Obsidian 1.13.7 의 `app.css` · `app.js` 를 실측해서 정한 것들이다.

- **상태의 정본은 파일 경로 목록**이다. leaf 는 모드 전환·재배치 때 DOM 이 다시 만들어지고
  id 도 세션을 넘기지 못한다. DOM 클래스는 경로 목록에서 파생된 결과일 뿐이고,
  `active-leaf-change` · `layout-change` · `file-open` · `css-change` 마다 다시 맞춘다.
- **스캔라인 오버레이는 `.view-content` 에 건다.** 이 요소는 마크다운 뷰에서 `overflow: hidden`
  이라 스크롤하지 않는다. 스크롤 컨테이너(`.markdown-preview-view` / `.cm-scroller`)에 걸면
  오버레이가 콘텐츠와 함께 밀려 올라간다. 단 `position: static` 이므로 `relative` 를 줘야 한다.
- **스킨 스코프에 `color` 를 직접 선언한다.** `body { color: var(--text-normal) }` 가 있어서,
  글자색 규칙이 없는 편집 모드는 body 에서 이미 계산된 색을 상속받는다. 스코프 안에서
  변수만 덮어써도 편집 모드 글자색은 바뀌지 않는다.
- **파생 변수는 개별로 다시 정의한다.** `--code-normal: var(--text-normal)` 처럼 상위 스코프에서
  계산되는 변수는 `--text-normal` 만 덮어써도 따라오지 않는다.
- **인쇄·PDF 대응은 필요 없다.** Obsidian 은 `document.body.createDiv("print")` 로 body 직하위에
  새 DOM 을 만들어 다시 렌더한다. 스코프를 뷰 컨테이너에만 두면 스킨이 새지 않는다.
