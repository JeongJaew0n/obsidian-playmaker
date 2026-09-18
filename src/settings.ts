import { PluginSettingTab, Setting } from 'obsidian';
import type { App } from 'obsidian';
import { DEFAULT_SKIN, SKINS, SKIN_IDS, getSkin, isSkinId } from './skins';
import type { SkinId } from './skins';
import type PlaymakerPlugin from './main';

/** 노트별 지정 값. 'none' 은 "전역이 켜져 있어도 이 노트는 맨얼굴" 이라는 뜻이다. */
export type NoteSkin = SkinId | 'none';

export interface PlaymakerSettings {
  version: 2;

  // ── 적용 범위 ───────────────────────────────────────────
  /**
   * 노트별 지정. 상태의 정본이다.
   *
   * leaf 는 모드 전환·재배치 때 DOM 이 다시 만들어지고 id 도 세션을 넘기지 못하므로,
   * 화면에 붙는 클래스는 이 표에서 파생된 결과로만 다룬다.
   */
  notes: Record<string, NoteSkin>;
  /** 모든 노트에 적용. 켜는 순간 vault 전체 외형이 바뀌므로 기본은 꺼짐이다. */
  applyToAllNotes: boolean;
  globalSkin: SkinId;

  // ── 스킨 상태 ───────────────────────────────────────────
  /** 토글 명령이 새로 켤 때 쓰는 스킨 */
  activeSkin: SkinId;
  /** 스킨마다 마지막으로 고른 변형 */
  variants: Record<string, string>;
  /** 스킨마다의 옵션 */
  skinOptions: Record<string, Record<string, unknown>>;

  // ── 공통 ────────────────────────────────────────────────
  /** 비어 있으면 스킨이 정한 기본 글꼴을 쓴다. */
  fontFamily: string;
  applyToReadingMode: boolean;
  showStatusBar: boolean;
}

function defaultVariants(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of SKIN_IDS) out[id] = SKINS[id].defaultVariant;
  return out;
}

function defaultSkinOptions(): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const id of SKIN_IDS) out[id] = { ...SKINS[id].defaultOptions };
  return out;
}

export function createDefaultSettings(): PlaymakerSettings {
  return {
    version: 2,
    notes: {},
    applyToAllNotes: false,
    globalSkin: DEFAULT_SKIN,
    activeSkin: DEFAULT_SKIN,
    variants: defaultVariants(),
    skinOptions: defaultSkinOptions(),
    fontFamily: '',
    applyToReadingMode: true,
    showStatusBar: false,
  };
}

/** v1 설정의 모양. 마이그레이션에만 쓴다. */
interface LegacySettings {
  skinnedPaths?: unknown;
  preset?: unknown;
  glow?: unknown;
  scanlines?: unknown;
  flicker?: unknown;
  blinkCursor?: unknown;
  showPrompt?: unknown;
  promptSymbol?: unknown;
  fontFamily?: unknown;
  applyToReadingMode?: unknown;
  showStatusBar?: unknown;
}

/**
 * 저장된 값을 현재 스키마로 올린다.
 *
 * 값이 손상됐거나 없어진 스킨을 가리켜도 기본값으로 떨어질 뿐 예외를 던지지 않는다.
 * 업데이트했더니 모든 노트가 바뀌어 있는 상황을 만들지 않기 위해,
 * 마이그레이션 결과의 applyToAllNotes 는 항상 false 다.
 */
export function migrateSettings(stored: unknown): PlaymakerSettings {
  const base = createDefaultSettings();
  if (stored === null || typeof stored !== 'object') return base;

  const raw = stored as Record<string, unknown>;

  if (raw.version === 2) {
    const notes: Record<string, NoteSkin> = {};
    if (raw.notes !== null && typeof raw.notes === 'object') {
      for (const [path, value] of Object.entries(raw.notes as Record<string, unknown>)) {
        if (value === 'none' || isSkinId(value)) notes[path] = value;
      }
    }
    return {
      version: 2,
      notes,
      applyToAllNotes: typeof raw.applyToAllNotes === 'boolean' ? raw.applyToAllNotes : false,
      globalSkin: isSkinId(raw.globalSkin) ? raw.globalSkin : base.globalSkin,
      activeSkin: isSkinId(raw.activeSkin) ? raw.activeSkin : base.activeSkin,
      variants: mergeVariants(raw.variants),
      skinOptions: mergeSkinOptions(raw.skinOptions),
      fontFamily: typeof raw.fontFamily === 'string' ? raw.fontFamily : '',
      applyToReadingMode: typeof raw.applyToReadingMode === 'boolean' ? raw.applyToReadingMode : true,
      showStatusBar: typeof raw.showStatusBar === 'boolean' ? raw.showStatusBar : false,
    };
  }

  // ── v1 → v2 ─────────────────────────────────────────────
  // 터미널 외형 하나뿐이던 시절의 설정이다. 경로 목록은 전부 terminal 로 옮긴다.
  const legacy = raw as LegacySettings;

  if (Array.isArray(legacy.skinnedPaths)) {
    for (const path of legacy.skinnedPaths) {
      if (typeof path === 'string' && path.length > 0) base.notes[path] = 'terminal';
    }
  }

  if (typeof legacy.preset === 'string' && legacy.preset in SKINS.terminal.variants) {
    base.variants.terminal = legacy.preset;
  }

  const terminalOptions = base.skinOptions.terminal ?? {};
  if (typeof legacy.glow === 'number') terminalOptions.glow = legacy.glow;
  if (typeof legacy.scanlines === 'boolean') terminalOptions.scanlines = legacy.scanlines;
  if (typeof legacy.flicker === 'boolean') terminalOptions.flicker = legacy.flicker;
  if (typeof legacy.blinkCursor === 'boolean') terminalOptions.blinkCursor = legacy.blinkCursor;
  if (typeof legacy.showPrompt === 'boolean') terminalOptions.showPrompt = legacy.showPrompt;
  if (typeof legacy.promptSymbol === 'string') terminalOptions.promptSymbol = legacy.promptSymbol;

  if (typeof legacy.fontFamily === 'string') base.fontFamily = legacy.fontFamily;
  if (typeof legacy.applyToReadingMode === 'boolean') base.applyToReadingMode = legacy.applyToReadingMode;
  if (typeof legacy.showStatusBar === 'boolean') base.showStatusBar = legacy.showStatusBar;

  return base;
}

function mergeVariants(stored: unknown): Record<string, string> {
  const out = defaultVariants();
  if (stored === null || typeof stored !== 'object') return out;
  for (const [id, value] of Object.entries(stored as Record<string, unknown>)) {
    if (isSkinId(id) && typeof value === 'string' && value in SKINS[id].variants) out[id] = value;
  }
  return out;
}

function mergeSkinOptions(stored: unknown): Record<string, Record<string, unknown>> {
  const out = defaultSkinOptions();
  if (stored === null || typeof stored !== 'object') return out;
  for (const [id, value] of Object.entries(stored as Record<string, unknown>)) {
    if (!isSkinId(id) || value === null || typeof value !== 'object') continue;
    out[id] = { ...out[id], ...(value as Record<string, unknown>) };
  }
  return out;
}

export class PlaymakerSettingTab extends PluginSettingTab {
  private readonly plugin: PlaymakerPlugin;

  constructor(app: App, plugin: PlaymakerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();

    this.renderSkinSection(containerEl);
    this.renderScopeSection(containerEl);
    this.renderCommonSection(containerEl);
    this.renderStatusSection(containerEl);
  }

  /** 스킨 → 그 스킨의 분위기 → 그 스킨의 옵션 순으로 접는다. */
  private renderSkinSection(containerEl: HTMLElement): void {
    const settings = this.plugin.settings;
    const skin = getSkin(settings.activeSkin);

    new Setting(containerEl).setName('스킨').setHeading();

    new Setting(containerEl)
      .setName('스킨')
      .setDesc(skin.description)
      .addDropdown((dd) => {
        for (const id of SKIN_IDS) dd.addOption(id, SKINS[id].label);
        dd.setValue(skin.id).onChange(async (value) => {
          if (!isSkinId(value)) return;
          settings.activeSkin = value;
          await this.plugin.saveSettings();
          // 스킨이 바뀌면 아래에 달린 분위기·옵션이 통째로 달라진다.
          this.display();
        });
      });

    const variantIds = Object.keys(skin.variants);
    if (variantIds.length > 1) {
      new Setting(containerEl)
        .setName('분위기')
        .setDesc(`'${skin.label}' 스킨의 분위기를 고른다.`)
        .addDropdown((dd) => {
          for (const id of variantIds) dd.addOption(id, skin.variants[id]!.label);
          dd.setValue(settings.variants[skin.id] ?? skin.defaultVariant).onChange(async (value) => {
            settings.variants[skin.id] = value;
            await this.plugin.saveSettings();
          });
        });
    }

    const options = settings.skinOptions[skin.id] ?? {};
    for (const control of skin.optionControls) {
      const setting = new Setting(containerEl).setName(control.name).setDesc(control.desc);

      if (control.kind === 'toggle') {
        setting.addToggle((toggle) => {
          toggle.setValue(options[control.key] === true).onChange(async (value) => {
            options[control.key] = value;
            settings.skinOptions[skin.id] = options;
            await this.plugin.saveSettings();
          });
        });
      } else if (control.kind === 'slider') {
        const current = typeof options[control.key] === 'number' ? (options[control.key] as number) : control.min;
        setting.addSlider((slider) => {
          slider
            .setLimits(control.min, control.max, control.step)
            .setValue(current)
            .setDynamicTooltip()
            .onChange(async (value) => {
              options[control.key] = value;
              settings.skinOptions[skin.id] = options;
              await this.plugin.saveSettings();
            });
        });
      } else {
        const current = typeof options[control.key] === 'string' ? (options[control.key] as string) : '';
        setting.addText((text) => {
          text
            .setPlaceholder(control.placeholder)
            .setValue(current)
            .onChange(async (value) => {
              options[control.key] = value;
              settings.skinOptions[skin.id] = options;
              await this.plugin.saveSettings();
            });
        });
      }
    }
  }

  private renderScopeSection(containerEl: HTMLElement): void {
    const settings = this.plugin.settings;

    new Setting(containerEl).setName('적용 범위').setHeading();

    new Setting(containerEl)
      .setName('모든 노트에 적용')
      .setDesc('켜면 vault 의 모든 노트에 스킨이 붙는다. 노트별 지정이 이보다 우선한다.')
      .addToggle((toggle) => {
        toggle.setValue(settings.applyToAllNotes).onChange(async (value) => {
          settings.applyToAllNotes = value;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    if (settings.applyToAllNotes) {
      new Setting(containerEl)
        .setName('전역 스킨')
        .setDesc('모든 노트에 쓸 스킨.')
        .addDropdown((dd) => {
          for (const id of SKIN_IDS) dd.addOption(id, SKINS[id].label);
          dd.setValue(settings.globalSkin).onChange(async (value) => {
            if (!isSkinId(value)) return;
            settings.globalSkin = value;
            await this.plugin.saveSettings();
          });
        });
    }

    new Setting(containerEl)
      .setName('읽기 모드에도 적용')
      .setDesc('끄면 편집 모드에서만 스킨이 보인다.')
      .addToggle((toggle) => {
        toggle.setValue(settings.applyToReadingMode).onChange(async (value) => {
          settings.applyToReadingMode = value;
          await this.plugin.saveSettings();
        });
      });
  }

  private renderCommonSection(containerEl: HTMLElement): void {
    const settings = this.plugin.settings;

    new Setting(containerEl).setName('공통').setHeading();

    new Setting(containerEl)
      .setName('글꼴')
      .setDesc('비워두면 스킨이 정한 글꼴을 쓴다. 해커는 고정폭, 편지지는 세리프다.')
      .addText((text) => {
        text
          .setPlaceholder('(스킨 기본 글꼴)')
          .setValue(settings.fontFamily)
          .onChange(async (value) => {
            settings.fontFamily = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('상태 바에 개수 표시')
      .setDesc('스킨을 지정한 노트 수를 상태 바에 보여준다.')
      .addToggle((toggle) => {
        toggle.setValue(settings.showStatusBar).onChange(async (value) => {
          settings.showStatusBar = value;
          await this.plugin.saveSettings();
        });
      });
  }

  private renderStatusSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName('상태').setHeading();

    const entries = Object.entries(this.plugin.settings.notes);
    const desc =
      entries.length === 0
        ? '노트별로 지정한 것이 없다.'
        : entries
            .slice(0, 8)
            .map(([path, value]) => `${path} → ${value === 'none' ? '제외' : getSkin(value).label}`)
            .join('\n') + (entries.length > 8 ? `\n… 그 밖 ${entries.length - 8}개` : '');

    new Setting(containerEl)
      .setName('노트별 지정')
      .setDesc(desc)
      .addButton((button) => {
        button
          .setButtonText('전체 해제')
          .setDisabled(entries.length === 0)
          .onClick(async () => {
            await this.plugin.clearAllNotes();
            this.display();
          });
      });
  }
}
