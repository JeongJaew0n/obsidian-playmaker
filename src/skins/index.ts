import type { SkinDefinition, SkinId } from './types';
import { terminalSkin } from './terminal';
import { letterpressSkin } from './letterpress';

/** 스킨을 추가할 때 손대는 곳은 여기 하나다. */
export const SKINS: Record<SkinId, SkinDefinition> = {
  terminal: terminalSkin,
  letterpress: letterpressSkin,
};

export const SKIN_IDS = Object.keys(SKINS) as SkinId[];

export const DEFAULT_SKIN: SkinId = 'terminal';

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === 'string' && value in SKINS;
}

/** 저장된 값이 손상됐거나 없어진 스킨을 가리켜도 안전하게 떨어진다. */
export function getSkin(id: unknown): SkinDefinition {
  return isSkinId(id) ? SKINS[id] : SKINS[DEFAULT_SKIN];
}

export type { SkinDefinition, SkinId, SkinVariant, SkinOptionControl } from './types';
export type { Palette } from './palette';
export { paletteToVars, withAlpha } from './palette';
