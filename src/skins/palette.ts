/**
 * 팔레트 → Obsidian CSS 변수 매핑.
 *
 * 스킨이 달라도 Obsidian 변수 이름은 같으므로 이 변환은 공유한다.
 *
 * 주의: `--code-normal: var(--text-normal)` 같은 **파생 변수는 상위 스코프(body)에서
 * 이미 계산되어 상속**되기 때문에, `--text-normal` 만 덮어써도 따라오지 않는다.
 * 그래서 파생 변수를 개별로 다시 정의한다. (Obsidian 1.13.7 실측)
 */

export interface Palette {
  /** 뷰 배경 */
  bg: string;
  /** 코드 블록·표 머리 등 보조 배경 */
  bgAlt: string;
  /** 가장 흐린 전경: 구분선, 주석, 목록 마커 */
  faint: string;
  /** 보조 전경 */
  dim: string;
  /** 본문 */
  normal: string;
  /** 강조 */
  bright: string;
  /** 헤딩 */
  head: string;

  // 아래는 선택 항목이다. 지정하지 않으면 위 7색에서 끌어온다.
  // 편지지처럼 헤딩·링크·코드가 서로 다른 잉크색인 스킨을 위한 것이다.
  /** 헤딩 색 (없으면 head) */
  heading?: string;
  /** 링크·태그 색 (없으면 bright) */
  link?: string;
  /** 코드 색 (없으면 normal) */
  code?: string;
  /** 굵게·강조 색 (없으면 head) */
  accent?: string;
}

/** hex 를 alpha 를 붙인 rgba() 로 바꾼다. color-mix 를 쓰지 않아 계산이 예측 가능하다. */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = Number.parseInt(full, 16);
  return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha})`;
}

export function paletteToVars(p: Palette): Record<string, string> {
  const heading = p.heading ?? p.head;
  const link = p.link ?? p.bright;
  const code = p.code ?? p.normal;
  const accent = p.accent ?? p.head;

  return {
    // ── 기본 색 ─────────────────────────────────────────────
    '--background-primary': p.bg,
    '--background-primary-alt': p.bgAlt,
    '--background-secondary': p.bgAlt,
    '--background-secondary-alt': p.bgAlt,
    '--background-modifier-border': p.faint,
    '--background-modifier-border-hover': p.dim,
    '--background-modifier-border-focus': p.dim,
    '--background-modifier-hover': withAlpha(p.normal, 0.08),
    '--text-normal': p.normal,
    '--text-muted': p.dim,
    '--text-faint': p.faint,
    '--text-accent': link,
    '--text-accent-hover': heading,
    '--text-selection': withAlpha(link, 0.25),
    '--text-highlight-bg': withAlpha(accent, 0.22),
    '--caret-color': p.normal,

    // ── 헤딩 (기본값이 inherit 이라 개별 지정이 필요하다) ────
    '--h1-color': heading,
    '--h2-color': heading,
    '--h3-color': heading,
    '--h4-color': heading,
    '--h5-color': heading,
    '--h6-color': heading,
    '--inline-title-color': heading,
    '--heading-formatting': p.faint,

    // ── 인라인 서식 ─────────────────────────────────────────
    '--bold-color': accent,
    '--italic-color': accent,
    '--blockquote-color': p.dim,
    '--blockquote-border-color': p.dim,
    '--hr-color': p.faint,
    '--list-marker-color': p.dim,
    '--list-marker-color-hover': p.normal,
    '--list-marker-color-collapsed': link,
    '--checklist-done-color': p.faint,
    '--footnote-id-color': p.dim,
    '--indentation-guide-color': withAlpha(p.normal, 0.12),

    // ── 링크·태그 ───────────────────────────────────────────
    '--link-color': link,
    '--link-color-hover': heading,
    '--link-external-color': link,
    '--link-external-color-hover': heading,
    '--link-unresolved-color': p.dim,
    '--tag-color': link,
    '--tag-background': withAlpha(link, 0.12),

    // ── 코드 ────────────────────────────────────────────────
    '--code-normal': code,
    '--code-background': p.bgAlt,
    '--code-border-color': p.faint,
    '--code-comment': p.faint,
    '--code-punctuation': p.dim,
    '--code-operator': p.dim,
    '--code-value': p.dim,
    '--code-string': code,
    '--code-keyword': link,
    '--code-property': link,
    '--code-tag': link,
    '--code-function': accent,
    '--code-important': accent,

    // ── 표 ──────────────────────────────────────────────────
    '--table-background': 'transparent',
    '--table-border-color': p.faint,
    '--table-header-color': heading,
    '--table-header-background': p.bgAlt,

    // ── 속성(frontmatter) UI ────────────────────────────────
    '--metadata-label-text-color': p.dim,
    '--metadata-input-text-color': p.normal,
    '--metadata-divider-color': p.faint,
  };
}
