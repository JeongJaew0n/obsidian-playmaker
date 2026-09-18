import type { SkinDefinition } from './types';
import { boolOpt, numOpt, strOpt } from './types';

/**
 * '나 지금 해커' — 발광하는 CRT 화면.
 *
 * 변형 이름은 색 이름이 아니라 **장면**으로 짓는다. green·amber 같은 이름은
 * 무엇이 다른지 읽어서 알 수 없다. id 는 data.json 에 저장되므로 그대로 둔다.
 */
export const terminalSkin: SkinDefinition = {
  id: 'terminal',
  label: '나 지금 해커',
  description: '발광하는 CRT 화면. 스캔라인과 인광이 깔린다.',
  className: 'pm-skin-terminal',
  resolveFont: () => 'var(--font-monospace)',
  defaultVariant: 'green',

  variants: {
    green: {
      label: '새벽 세시 서버실',
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
      label: '낡은 관제실',
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
      label: '빙하 데이터센터',
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
      label: '흔적 없는 침입',
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
  },

  defaultOptions: {
    glow: 0.4,
    scanlines: true,
    flicker: false,
    blinkCursor: true,
    showPrompt: false,
    promptSymbol: '>',
  },

  optionControls: [
    { kind: 'slider', key: 'glow', name: '인광 세기', desc: '글자 주변 발광. 0 이면 끈다.', min: 0, max: 1, step: 0.05 },
    { kind: 'toggle', key: 'scanlines', name: '스캔라인', desc: 'CRT 주사선을 겹친다.' },
    { kind: 'toggle', key: 'flicker', name: '플리커', desc: '화면이 미세하게 떨린다. 상시 애니메이션이라 기본은 꺼져 있다.' },
    { kind: 'toggle', key: 'blinkCursor', name: '커서 깜빡임', desc: '끄면 편집 모드 커서가 깜빡이지 않고 계속 보인다.' },
    { kind: 'toggle', key: 'showPrompt', name: '프롬프트 기호', desc: '각 줄 앞에 기호를 덧그린다. 노트 내용은 바뀌지 않는다.' },
    { kind: 'text', key: 'promptSymbol', name: '프롬프트 문자', desc: '프롬프트 기호로 쓸 문자.', placeholder: '>' },
  ],

  optionsToVars(options) {
    const glow = Math.max(0, Math.min(1, numOpt(options, 'glow', 0.4)));
    const symbol = strOpt(options, 'promptSymbol', '>');

    return {
      // 0 이면 text-shadow 자체를 none 으로 둬서 그리기 비용을 없앤다.
      '--pm-text-shadow': glow > 0 ? `0 0 ${(glow * 6).toFixed(2)}px currentColor` : 'none',
      '--pm-overlay': boolOpt(options, 'scanlines', true)
        ? 'repeating-linear-gradient(to bottom, rgba(0, 0, 0, 0.28) 0 1px, transparent 1px 3px)'
        : 'none',
      '--pm-flicker': boolOpt(options, 'flicker', false) ? 'pm-flicker 4.2s steps(30) infinite' : 'none',
      // CodeMirror 가 .cm-cursorLayer 에 넣어둔 기본 애니메이션을 그대로 쓰거나 끈다.
      '--pm-blink': boolOpt(options, 'blinkCursor', true) ? 'steps(1) cm-blink 1.2s infinite' : 'none',
      '--pm-prompt': boolOpt(options, 'showPrompt', false) && symbol.length > 0 ? JSON.stringify(`${symbol} `) : '""',
    };
  },
};
