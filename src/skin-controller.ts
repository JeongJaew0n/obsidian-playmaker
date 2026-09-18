import { MarkdownView } from 'obsidian';
import type { App } from 'obsidian';
import { SKINS, SKIN_IDS, getSkin, paletteToVars } from './skins';
import type { SkinId } from './skins';
import type { PlaymakerSettings } from './settings';

/** 스킨이 붙은 뷰에 공통으로 들어가는 클래스. 골격 CSS 가 이걸 본다. */
const BASE_CLASS = 'pm-skin';

/** 동적 CSS 변수를 담는 <style> 의 id. */
const STYLE_EL_ID = 'playmaker-skin-vars';

/** 스킨 클래스 전체. 전환할 때 이전 것을 떼는 데 쓴다. */
const ALL_SKIN_CLASSES = SKIN_IDS.map((id) => SKINS[id].className);

/**
 * 스킨의 적용/해제를 담당한다.
 *
 * 1. **DOM 에는 클래스만 붙인다.** 팔레트·글꼴·효과는 전부 CSS 변수로 넘기고,
 *    그 변수는 문서에 하나만 두는 <style> 에서 스킨별 블록으로 선언한다.
 *    그래서 스킨을 바꿔도 클래스 두 개를 갈아 끼우면 끝난다.
 * 2. **모든 작업은 멱등이다.** 이벤트가 겹쳐 여러 번 호출돼도 결과가 같다.
 */
export class SkinController {
  private styleEl: HTMLStyleElement | null = null;
  private rafHandle: number | null = null;

  constructor(
    private readonly app: App,
    private readonly getSettings: () => PlaymakerSettings,
  ) {}

  /** 동적 변수 <style> 을 만들고 현재 설정으로 채운다. */
  refreshStyle(): void {
    if (!this.styleEl) {
      this.styleEl = document.head.createEl('style', { attr: { id: STYLE_EL_ID } });
    }
    this.styleEl.textContent = this.buildCss();
  }

  /**
   * 같은 프레임에 몰린 이벤트를 한 번으로 합쳐 재적용한다.
   * layout-change 와 active-leaf-change 는 함께 발생하는 경우가 많다.
   */
  scheduleReapply(): void {
    if (this.rafHandle !== null) return;
    this.rafHandle = window.requestAnimationFrame(() => {
      this.rafHandle = null;
      this.reapplyAll();
    });
  }

  /**
   * 열려 있는 모든 마크다운 뷰의 클래스를 설정과 일치시킨다.
   *
   * 뷰 하나가 실패해도 나머지는 계속 처리한다.
   */
  reapplyAll(): void {
    for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
      const view = leaf.view;
      if (!(view instanceof MarkdownView)) continue;
      try {
        this.applyTo(view);
      } catch (error) {
        console.error('[playmaker] 뷰 재적용 실패', error);
      }
    }
  }

  /** 열려 있는 모든 마크다운 뷰에서 스킨 클래스를 뗀다. 설정은 건드리지 않는다. */
  removeAllSkin(): void {
    for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
      const view = leaf.view;
      if (!(view instanceof MarkdownView)) continue;
      try {
        view.containerEl.classList.remove(BASE_CLASS, ...ALL_SKIN_CLASSES);
      } catch (error) {
        console.error('[playmaker] 뷰 해제 실패', error);
      }
    }
  }

  /** 플러그인 종료 시 흔적을 남기지 않는다. */
  destroy(): void {
    if (this.rafHandle !== null) {
      window.cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    this.removeAllSkin();
    this.styleEl?.remove();
    this.styleEl = null;
  }

  /**
   * 이 뷰에 붙을 스킨을 정한다. 노트별 지정이 전역보다 항상 우선한다.
   * 붙일 것이 없으면 null.
   */
  resolveSkinFor(path: string | undefined, isPreviewMode: boolean): SkinId | null {
    const settings = this.getSettings();
    if (path === undefined) return null;
    if (isPreviewMode && !settings.applyToReadingMode) return null;

    const perNote = settings.notes[path];
    if (perNote === 'none') return null;
    if (perNote !== undefined) return perNote;

    return settings.applyToAllNotes ? settings.globalSkin : null;
  }

  private applyTo(view: MarkdownView): void {
    const wanted = this.resolveSkinFor(view.file?.path, view.getMode() === 'preview');
    const classList = view.containerEl.classList;

    if (wanted === null) {
      classList.remove(BASE_CLASS, ...ALL_SKIN_CLASSES);
      return;
    }

    const wantedClass = getSkin(wanted).className;
    for (const className of ALL_SKIN_CLASSES) {
      if (className !== wantedClass) classList.remove(className);
    }
    classList.add(BASE_CLASS, wantedClass);
  }

  /** 스킨마다 변수 블록을 하나씩 만든다. 붙어 있지 않은 스킨의 블록은 아무 일도 하지 않는다. */
  private buildCss(): string {
    const settings = this.getSettings();
    const userFont = settings.fontFamily.trim();

    return SKIN_IDS.map((id) => {
      const skin = SKINS[id];
      const variantId = settings.variants[id] ?? skin.defaultVariant;
      const variant = skin.variants[variantId] ?? skin.variants[skin.defaultVariant]!;
      const options = settings.skinOptions[id] ?? skin.defaultOptions;

      const declarations = [
        ...Object.entries(paletteToVars(variant.palette)).map(([name, value]) => `  ${name}: ${value};`),
        ...Object.entries(skin.optionsToVars(options)).map(([name, value]) => `  ${name}: ${value};`),
        ...this.fontDeclarations(skin.resolveFont(options), userFont),
      ];

      return `.${skin.className} {\n${declarations.join('\n')}\n}\n`;
    }).join('\n');
  }

  /**
   * 글꼴 선언.
   *
   * 사용자가 비워뒀을 때 `--font-monospace: var(--font-monospace)` 처럼 자기 참조가 되면
   * 값이 무효화되어 글꼴이 통째로 깨진다. 그래서 사용자가 직접 지정했을 때만
   * `--font-monospace` 를 건드린다.
   */
  private fontDeclarations(skinFont: string | null, userFont: string): string[] {
    if (userFont.length > 0) {
      return [`  --font-text: ${userFont};`, `  --font-monospace: ${userFont};`];
    }
    return skinFont === null ? [] : [`  --font-text: ${skinFont};`];
  }
}
