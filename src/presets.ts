/**
 * 터미널 팔레트와 Obsidian CSS 변수 매핑.
 *
 * Obsidian 1.13.7 의 app.css 를 실측해 만든 목록이다. 주의할 점은
 * `--code-normal: var(--text-normal)` 처럼 **파생 변수는 상위 스코프(body)에서 이미
 * 계산되어 상속**되기 때문에, `--text-normal` 만 덮어써도 따라오지 않는다는 것이다.
 * 그래서 파생 변수를 개별로 다시 정의한다.
 */

export type PresetId = 'green' | 'amber' | 'ice' | 'mono';

export interface TerminalPalette {
  /** 뷰 배경 */
  bg: string;
  /** 코드 블록·표 헤더 등 보조 배경 */
  bgAlt: string;
  /** 가장 어두운 전경: 구분선, 주석, 완료된 체크박스 */
  faint: string;
  /** 보조 전경: 목록 마커, 구두점, 인용 테두리 */
  dim: string;
  /** 본문 */
  normal: string;
  /** 강조: 링크, 태그, 키워드 */
  bright: string;
  /** 헤딩 */
  head: string;
}

export const PRESETS: Record<PresetId, { label: string; palette: TerminalPalette }> = {
  green: {
    label: 'Green (P1 인광)',
    palette: {
      bg: '#080c08',
      bgAlt: '#0c120c',
      faint: '#146b2b',
      dim: '#1f9940',
      normal: '#33ff66',
      bright: '#7dffa8',
      head: '#b6ffcd',
    },
  },
  amber: {
    label: 'Amber (호박색 CRT)',
    palette: {
      bg: '#0d0904',
      bgAlt: '#140e05',
      faint: '#6b4410',
      dim: '#a3690f',
      normal: '#ffb642',
      bright: '#ffd489',
      head: '#ffe9c2',
    },
  },
  ice: {
    label: 'Ice (청색 형광)',
    palette: {
      bg: '#05080f',
      bgAlt: '#0a0f18',
      faint: '#14456b',
      dim: '#1f6b99',
      normal: '#4dc8ff',
      bright: '#96e2ff',
      head: '#c6f1ff',
    },
  },
  mono: {
    label: 'Mono (단색 흑백)',
    palette: {
      bg: '#0a0a0a',
      bgAlt: '#101010',
      faint: '#4a4a4a',
      dim: '#7a7a7a',
      normal: '#d8d8d8',
      bright: '#f2f2f2',
      head: '#ffffff',
    },
  },
};

/** hex 색을 alpha 를 붙인 rgba() 로 바꾼다. color-mix 를 쓰지 않아 계산이 예측 가능하다. */
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = Number.parseInt(full, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 팔레트를 CSS 변수 맵으로 펼친다.
 *
 * 반환된 변수는 스킨 스코프 요소(뷰 컨테이너)에 선언된다. 뷰 배경은
 * `.workspace-split.mod-root .view-content { background-color: var(--background-primary) }`
 * 가 이 값을 읽어 따라온다.
 */
export function paletteToVars(p: TerminalPalette): Record<string, string> {
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
    '--text-accent': p.bright,
    '--text-accent-hover': p.head,
    '--text-selection': withAlpha(p.normal, 0.25),
    '--text-highlight-bg': withAlpha(p.bright, 0.22),
    '--caret-color': p.normal,

    // ── 헤딩 (기본값이 inherit 이라 개별 지정이 필요하다) ────
    '--h1-color': p.head,
    '--h2-color': p.head,
    '--h3-color': p.bright,
    '--h4-color': p.bright,
    '--h5-color': p.bright,
    '--h6-color': p.bright,
    '--inline-title-color': p.head,
    '--heading-formatting': p.faint,

    // ── 인라인 서식 ─────────────────────────────────────────
    '--bold-color': p.head,
    '--italic-color': p.bright,
    '--blockquote-color': p.dim,
    '--blockquote-border-color': p.dim,
    '--hr-color': p.faint,
    '--list-marker-color': p.dim,
    '--list-marker-color-hover': p.normal,
    '--list-marker-color-collapsed': p.bright,
    '--checklist-done-color': p.faint,
    '--footnote-id-color': p.dim,
    '--indentation-guide-color': withAlpha(p.normal, 0.12),

    // ── 링크·태그 ───────────────────────────────────────────
    '--link-color': p.bright,
    '--link-color-hover': p.head,
    '--link-external-color': p.bright,
    '--link-external-color-hover': p.head,
    '--link-unresolved-color': p.dim,
    '--tag-color': p.bright,
    '--tag-background': withAlpha(p.bright, 0.12),

    // ── 코드 ────────────────────────────────────────────────
    '--code-normal': p.normal,
    '--code-background': p.bgAlt,
    '--code-border-color': p.faint,
    '--code-comment': p.faint,
    '--code-punctuation': p.dim,
    '--code-operator': p.dim,
    '--code-value': p.dim,
    '--code-string': p.normal,
    '--code-keyword': p.bright,
    '--code-property': p.bright,
    '--code-tag': p.bright,
    '--code-function': p.head,
    '--code-important': p.head,

    // ── 표 ──────────────────────────────────────────────────
    '--table-background': 'transparent',
    '--table-border-color': p.faint,
    '--table-header-color': p.head,
    '--table-header-background': p.bgAlt,

    // ── 속성(frontmatter) UI ────────────────────────────────
    '--metadata-label-text-color': p.dim,
    '--metadata-input-text-color': p.normal,
    '--metadata-divider-color': p.faint,
  };
}
