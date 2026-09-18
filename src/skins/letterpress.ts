import type { SkinDefinition } from './types';
import { boolOpt } from './types';

/**
 * '오래된 편지지' — 빛을 내지 않는 종이.
 *
 * 해커 스킨과 정반대로 잡는다. 인광도 애니메이션도 없다.
 * 색은 이 컴퓨터의 cmux 팔레트(ghostty 기본 = Tomorrow Night 계열)에서 채도를 낮춰
 * 잉크로 쓰고, 바탕만 크림지로 뒤집은 것이다.
 *
 * 본문 #3a3226 과 바탕 #f2e8d5 의 명암비는 약 9:1 로, 본문 가독성 기준(WCAG AA 4.5:1)을
 * 넘기면서 순흑/순백 조합(21:1)보다 눈이 덜 피로하다.
 */
export const letterpressSkin: SkinDefinition = {
  id: 'letterpress',
  label: '오래된 편지지',
  description: '빛을 내지 않는 종이. 발광도 애니메이션도 없다.',
  className: 'pm-skin-letterpress',
  // 한글은 산세리프로 둔다. 시스템의 한글 세리프가 AppleMyungjo 하나뿐이고
  // 본문 크기에서 읽기 편한 편이 아니다. 바꾸고 싶으면 설정의 글꼴을 쓴다.
  resolveFont: (options) =>
    boolOpt(options, 'serif', true)
      ? '"Iowan Old Style", Charter, Palatino, "Apple SD Gothic Neo", serif'
      : null,
  defaultVariant: 'cream',

  variants: {
    cream: {
      label: '다락방에서 찾은 편지',
      palette: {
        bg: '#f2e8d5',
        bgAlt: '#e9dcc4',
        faint: '#c9bda4',
        dim: '#6b6051',
        normal: '#3a3226',
        bright: '#8a6a2f',
        head: '#8a4a42',
        heading: '#8a4a42', // cmux #cc6666 채도 낮춤
        link: '#4a6b85', //    cmux #81a2be
        code: '#6b6a3f', //    cmux #b5bd68
        accent: '#8a6a2f', //  cmux #f0c674
      },
    },
  },

  defaultOptions: {
    grain: true,
    vignette: false,
    ruled: false,
    serif: true,
  },

  optionControls: [
    { kind: 'toggle', key: 'grain', name: '종이 결', desc: '아주 옅은 얼룩을 깐다.' },
    { kind: 'toggle', key: 'vignette', name: '가장자리 그늘', desc: '네 귀퉁이를 살짝 어둡게 한다.' },
    { kind: 'toggle', key: 'ruled', name: '괘선', desc: '편지지 줄을 긋는다. 본문 줄높이와 어긋나 보일 수 있다.' },
    { kind: 'toggle', key: 'serif', name: '세리프 글꼴', desc: '끄면 Obsidian 의 본문 글꼴을 그대로 쓴다.' },
  ],

  optionsToVars(options) {
    const layers: string[] = [];

    // 종이 결: 방향이 다른 아주 옅은 줄 두 겹을 겹쳐 규칙적인 무늬로 보이지 않게 한다.
    if (boolOpt(options, 'grain', true)) {
      layers.push(
        'repeating-linear-gradient(103deg, rgba(120, 96, 56, 0.028) 0 2px, transparent 2px 5px)',
        'repeating-linear-gradient(11deg, rgba(120, 96, 56, 0.022) 0 3px, transparent 3px 7px)',
      );
    }

    // 괘선: 본문 줄높이와 무관한 고정 간격이라 기본은 꺼둔다.
    if (boolOpt(options, 'ruled', false)) {
      layers.push('repeating-linear-gradient(to bottom, transparent 0 27px, rgba(74, 107, 133, 0.16) 27px 28px)');
    }

    // 가장자리 그늘
    if (boolOpt(options, 'vignette', false)) {
      layers.push('radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(90, 70, 40, 0.13) 100%)');
    }

    return {
      '--pm-overlay': layers.length > 0 ? layers.join(', ') : 'none',
      // 종이는 빛나지 않는다. 이 스킨에서는 전부 끈다.
      '--pm-text-shadow': 'none',
      '--pm-flicker': 'none',
      '--pm-blink': 'steps(1) cm-blink 1.2s infinite',
      '--pm-prompt': '""',
    };
  },
};
