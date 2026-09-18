# obsidian-playmaker 작업 지침

전역 지침(`~/.claude/CLAUDE.md`)을 따르되, **아래 항목은 이 저장소에서 전역 규칙을 대체한다.**

---

## 1. Git — 작업하면 바로 커밋·푸시한다

전역 규칙 두 개를 이 저장소에서는 다음으로 바꾼다.

| 전역 규칙 | 이 저장소 |
| --- | --- |
| 요청하지 않으면 커밋·푸시하지 않는다 | **작업이 끝나면 요청 없이 바로 커밋하고 푸시한다** |
| 기본 브랜치에 직접 커밋하지 않는다 | **`main` 에 직접 커밋하고 `main` 으로 푸시한다** |

개인 프로젝트라 PR 리뷰 단계가 없다. 브랜치를 파거나 PR 을 열지 않는다.

바뀌지 않는 것:

- **커밋은 원자적 단위로 나눈다.** 스캐폴딩·기능·문서를 한 커밋에 섞지 않는다.
- **되돌릴 수 없는 일은 여전히 먼저 확인한다.** `push --force`, 히스토리 재작성, 태그 삭제,
  릴리스 발행은 자동으로 하지 않는다.
- **검증하지 않은 것을 "동작합니다"라고 쓰지 않는다.** 커밋했다는 것과 동작한다는 것은 다르다.

커밋 메시지는 conventional commits 에 한국어 요약을 쓴다.

```
feat: 노트 단위 터미널 스킨 추가
fix: 글꼴 미지정 시 CSS 변수 자기 참조 수정
chore: esbuild 설정 정리
docs: README 설계 메모 보강
```

---

## 2. 스택과 명령

TypeScript + esbuild. Obsidian 플러그인 API.

```bash
npm run dev        # esbuild watch
npm run build      # tsc --noEmit + 프로덕션 번들
npm run typecheck  # 타입 검사만
```

`main.js` 는 빌드 산출물이고 git 추적하지 않는다.

## 3. 로컬 배포 — 고칠 때마다 함께 한다

**코드를 고쳤으면 묻지 말고 재배포까지 한다.** 커밋·푸시와 한 묶음이다.
확인을 받고 배포하는 게 아니라, 배포하고 나서 결과를 보고한다.

순서는 항상 이렇다.

```
빌드 → 커밋 → 푸시 → 재배포 → 보고
```

`/obsidian-plugin-local-deployment` 스킬을 쓴다. 세 파일(`main.js` · `manifest.json` · `styles.css`)을
`/Users/jjw/my/Dev/obsidian/.obsidian/plugins/playmaker/` 로 복사한다.

- **복사만으로는 반영되지 않는다.** 설정 → 커뮤니티 플러그인에서 껐다 켜야 한다.
  이건 사용자가 직접 해야 하므로 보고에 항상 적는다.
- 배포 전 빌드를 건너뛰지 않는다. 낡은 `main.js` 를 배포하면 "고친 게 반영 안 된다" 로 이어진다.
- vault 의 `data.json`(사용자 플러그인 설정)은 건드리지 않는다.
- 배포 후 세 파일의 해시를 소스와 대조한다. esbuild 가 한글을 `\uXXXX` 로 이스케이프하므로,
  번들 안 문자열을 확인할 때는 디코드해서 봐야 한다. 그냥 grep 하면 없는 것처럼 보인다.

문서만 고쳤을 때는 배포하지 않는다. 배포 대상은 `src/` 와 `styles.css` 뿐이다.

## 4. Obsidian API 는 추측하지 말고 실측한다

이 저장소의 CSS 선택자·CSS 변수·DOM 구조는 전부 실제 설치본에서 확인한 값이다.
새로 뭔가를 건드릴 때도 같은 방법을 쓴다.

- **타입·API 시그니처** — `node_modules/obsidian/obsidian.d.ts`
- **CSS 변수·선택자·레이아웃** — 설치본 asar 에서 `app.css` 추출
- **DOM 생성 방식·인라인 스타일** — 같은 asar 의 `app.js` 문자열 검색

```bash
ls ~/Library/Application\ Support/obsidian/obsidian-*.asar   # 설치된 버전 확인
```

asar 는 8바이트 헤더 + JSON 인덱스 + 파일 본문이라 Node 로 직접 파싱해 꺼낼 수 있다.
`npx asar` 없이 된다.

**CSS 동작(스크롤 고정, 상속, 특이성)은 브라우저에서 재현해 측정한다.** 추출한 `app.css` 를
그대로 로드하고 실제 DOM 구조를 재현하면 실물에 가깝게 검증된다. Obsidian 은 Electron 이라
원격 디버깅 없이는 런타임 DOM 을 볼 수 없으므로, 이 방법이 현실적인 최대치다.
그리고 **여기서 검증한 것과 실제 앱에서 확인한 것을 보고할 때 섞지 않는다.**

주의할 함정 세 개 (모두 실측으로 확인됨, 자세한 내용은 README):

1. `body { color: var(--text-normal) }` 때문에 스코프 안에서 변수만 덮어써도 편집 모드
   글자색은 안 바뀐다. 스코프에 `color` 를 직접 선언해야 한다.
2. `--code-normal: var(--text-normal)` 같은 파생 변수는 상위 스코프에서 이미 계산되므로
   개별로 다시 정의해야 한다.
3. 스크롤 컨테이너(`.markdown-preview-view` / `.cm-scroller`)에 오버레이를 걸면 콘텐츠와
   함께 밀려 올라간다. 앵커는 `.view-content` 다.
