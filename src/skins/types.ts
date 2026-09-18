import type { Setting } from 'obsidian';
import type { Palette } from './palette';

export type SkinId = 'terminal' | 'letterpress';

/** 스킨 안에서 색만 다른 것. 화면에는 label 만 보인다. */
export interface SkinVariant {
  label: string;
  palette: Palette;
}

/** 스킨 옵션 한 개를 설정 화면에 어떻게 그릴지. */
export type SkinOptionControl =
  | { kind: 'toggle'; key: string; name: string; desc: string }
  | { kind: 'slider'; key: string; name: string; desc: string; min: number; max: number; step: number }
  | { kind: 'text'; key: string; name: string; desc: string; placeholder: string };

export interface SkinDefinition {
  id: SkinId;
  /** 화면에 보이는 이름. 장면이 떠오르는 별명으로 짓는다. */
  label: string;
  /** 설정 화면에서 스킨 아래에 한 줄로 붙는 설명 */
  description: string;
  /** 이 스킨의 스코프 클래스. 예: 'pm-skin-terminal' */
  className: string;
  /**
   * 사용자가 글꼴을 비워뒀을 때 이 스킨이 쓸 글꼴.
   * null 을 돌려주면 글꼴을 건드리지 않고 Obsidian 설정을 그대로 쓴다.
   */
  resolveFont(options: Record<string, unknown>): string | null;
  variants: Record<string, SkinVariant>;
  defaultVariant: string;
  /** 이 스킨이 갖는 옵션의 기본값 */
  defaultOptions: Record<string, unknown>;
  /** 설정 화면에 그릴 옵션 목록 */
  optionControls: SkinOptionControl[];
  /** 옵션 → CSS 변수. 효과(질감·발광·애니메이션)를 여기서 켜고 끈다. */
  optionsToVars(options: Record<string, unknown>): Record<string, string>;
}

/** 옵션 값을 안전하게 꺼내는 도우미. 저장된 값이 손상돼도 기본값으로 떨어진다. */
export function boolOpt(options: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = options[key];
  return typeof value === 'boolean' ? value : fallback;
}

export function numOpt(options: Record<string, unknown>, key: string, fallback: number): number {
  const value = options[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function strOpt(options: Record<string, unknown>, key: string, fallback: string): string {
  const value = options[key];
  return typeof value === 'string' ? value : fallback;
}

/** settings 탭이 Setting 을 만들어 넘겨줄 때 쓰는 타입 별칭 */
export type SettingFactory = () => Setting;
