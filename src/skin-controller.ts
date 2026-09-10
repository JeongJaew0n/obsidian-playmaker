import { MarkdownView } from 'obsidian';
import type { App } from 'obsidian';
import { PRESETS, paletteToVars } from './presets';
import type { PlaymakerSettings } from './settings';

/** 스킨 스코프 클래스. 뷰 컨테이너(.workspace-leaf-content)에 붙는다. */
const SKIN_CLASS = 'pm-terminal';

/** 동적 CSS 변수를 담는 <style> 의 id. */
const STYLE_EL_ID = 'playmaker-terminal-vars';

/**
 * 스킨의 적용/해제를 담당한다.
 *
 * 설계상 두 가지를 지킨다.
 *
 * 1. **DOM 에는 클래스 하나만 붙인다.** 팔레트·글꼴·효과는 전부 CSS 변수로 넘기고,
 *    그 변수는 문서에 하나만 두는 <style> 에서 `.pm-terminal { … }` 로 선언한다.
 *    그래서 재적용 비용이 클래스 토글 한 번으로 끝난다.
 * 2. **모든 작업은 멱등이다.** 이벤트가 겹쳐 여러 번 호출돼도 결과가 같다.
 */
export class TerminalSkinController {
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
    const settings = this.getSettings();
    const skinned = new Set(settings.skinnedPaths);

    for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
      const view = leaf.view;
      if (!(view instanceof MarkdownView)) continue;
      try {
        const path = view.file?.path;
        const wanted =
          path !== undefined &&
          skinned.has(path) &&
          (settings.applyToReadingMode || view.getMode() !== 'preview');
        view.containerEl.classList.toggle(SKIN_CLASS, wanted);
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
        view.containerEl.classList.remove(SKIN_CLASS);
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

  private buildCss(): string {
    const settings = this.getSettings();
    const palette = (PRESETS[settings.preset] ?? PRESETS.green).palette;
    const vars = paletteToVars(palette);

    // 글꼴: 비어 있으면 Obsidian 의 고정폭 글꼴을 그대로 쓴다.
    // 이때 --font-monospace 를 다시 선언하면 var(--font-monospace) 자기 참조가 되어
    // 값이 무효화되므로, 비어 있을 때는 그 변수를 건드리지 않고 상속에 맡긴다.
    const hasCustomFont = settings.fontFamily.length > 0;
    const font = hasCustomFont ? settings.fontFamily : 'var(--font-monospace)';

    // 인광: 0 이면 text-shadow 자체를 none 으로 둬서 그리기 비용을 없앤다.
    const glow = Math.max(0, Math.min(1, settings.glow));
    const textShadow = glow > 0 ? `0 0 ${(glow * 6).toFixed(2)}px currentColor` : 'none';

    const scanline = settings.scanlines
      ? `repeating-linear-gradient(to bottom, ${'rgba(0, 0, 0, 0.28)'} 0 1px, transparent 1px 3px)`
      : 'none';

    const flicker = settings.flicker ? 'pm-flicker 4.2s steps(30) infinite' : 'none';

    // CodeMirror 기본 커서 깜빡임을 그대로 쓰거나 끈다.
    const blink = settings.blinkCursor ? 'steps(1) cm-blink 1.2s infinite' : 'none';

    const prompt =
      settings.showPrompt && settings.promptSymbol.length > 0
        ? JSON.stringify(`${settings.promptSymbol} `)
        : '""';

    const declarations = [
      ...Object.entries(vars).map(([name, value]) => `  ${name}: ${value};`),
      `  --font-text: ${font};`,
      ...(hasCustomFont ? [`  --font-monospace: ${font};`] : []),
      `  --pm-font: ${font};`,
      `  --pm-text-shadow: ${textShadow};`,
      `  --pm-scanline: ${scanline};`,
      `  --pm-flicker: ${flicker};`,
      `  --pm-blink: ${blink};`,
      `  --pm-prompt: ${prompt};`,
    ];

    return `.${SKIN_CLASS} {\n${declarations.join('\n')}\n}\n`;
  }
}
