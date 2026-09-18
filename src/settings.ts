import { PluginSettingTab, Setting } from 'obsidian';
import type { App } from 'obsidian';
import { PRESETS } from './presets';
import type { PresetId } from './presets';
import type PlaymakerPlugin from './main';

export interface PlaymakerSettings {
  /**
   * 스킨을 켜둔 노트의 vault 상대 경로.
   *
   * leaf 는 모드 전환·재배치 때 DOM 이 다시 만들어지고 id 도 세션을 넘기지 못하므로
   * 상태의 정본은 항상 이 경로 목록이다. DOM 클래스는 여기서 파생된 결과일 뿐이다.
   */
  skinnedPaths: string[];
  preset: PresetId;
  /** 빈 문자열이면 Obsidian 의 기본 고정폭 글꼴(--font-monospace)을 그대로 쓴다. */
  fontFamily: string;
  /** 0 이면 인광 효과를 끈다. */
  glow: number;
  scanlines: boolean;
  flicker: boolean;
  /** CodeMirror 기본 커서 깜빡임(cm-blink)을 유지할지. 끄면 커서가 상시 표시된다. */
  blinkCursor: boolean;
  showPrompt: boolean;
  promptSymbol: string;
  /** 읽기 모드에도 스킨을 적용할지. 끄면 편집 모드에서만 나타난다. */
  applyToReadingMode: boolean;
  showStatusBar: boolean;
}

export const DEFAULT_SETTINGS: PlaymakerSettings = {
  skinnedPaths: [],
  preset: 'green',
  fontFamily: '',
  glow: 0.4,
  scanlines: true,
  flicker: false,
  blinkCursor: true,
  showPrompt: false,
  promptSymbol: '>',
  applyToReadingMode: true,
  showStatusBar: false,
};

export class PlaymakerSettingTab extends PluginSettingTab {
  private readonly plugin: PlaymakerPlugin;

  constructor(app: App, plugin: PlaymakerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName('모양').setHeading();

    new Setting(containerEl)
      .setName('분위기')
      .setDesc("'기업을 해킹하는 해커' 스킨의 분위기를 고른다.")
      .addDropdown((dd) => {
        for (const [id, preset] of Object.entries(PRESETS)) {
          dd.addOption(id, preset.label);
        }
        dd.setValue(this.plugin.settings.preset).onChange(async (value) => {
          this.plugin.settings.preset = value as PresetId;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('글꼴')
      .setDesc('비워두면 Obsidian 의 고정폭 글꼴 설정을 그대로 쓴다. 예: SF Mono, Menlo, monospace')
      .addText((text) => {
        text
          .setPlaceholder('(기본 고정폭 글꼴)')
          .setValue(this.plugin.settings.fontFamily)
          .onChange(async (value) => {
            this.plugin.settings.fontFamily = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('인광 세기')
      .setDesc('글자 주변 발광. 0 이면 끈다. 값이 크면 그리기 비용도 올라간다.')
      .addSlider((slider) => {
        slider
          .setLimits(0, 1, 0.05)
          .setValue(this.plugin.settings.glow)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.glow = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('스캔라인')
      .setDesc('CRT 주사선을 겹친다.')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.scanlines).onChange(async (value) => {
          this.plugin.settings.scanlines = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('플리커')
      .setDesc('화면이 미세하게 떨린다. 상시 애니메이션이라 기본은 꺼져 있다.')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.flicker).onChange(async (value) => {
          this.plugin.settings.flicker = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('커서 깜빡임')
      .setDesc('끄면 편집 모드 커서가 깜빡이지 않고 계속 보인다.')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.blinkCursor).onChange(async (value) => {
          this.plugin.settings.blinkCursor = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl).setName('동작').setHeading();

    new Setting(containerEl)
      .setName('프롬프트 기호')
      .setDesc('각 줄 앞에 기호를 덧그린다. 노트 내용은 바뀌지 않고, 복사할 때도 따라가지 않는다.')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.showPrompt).onChange(async (value) => {
          this.plugin.settings.showPrompt = value;
          await this.plugin.saveSettings();
        });
      })
      .addText((text) => {
        text
          .setPlaceholder('>')
          .setValue(this.plugin.settings.promptSymbol)
          .onChange(async (value) => {
            this.plugin.settings.promptSymbol = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('읽기 모드에도 적용')
      .setDesc('끄면 편집 모드에서만 스킨이 보인다.')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.applyToReadingMode).onChange(async (value) => {
          this.plugin.settings.applyToReadingMode = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('상태 바에 개수 표시')
      .setDesc('스킨이 켜진 노트 수를 상태 바에 보여준다.')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.showStatusBar).onChange(async (value) => {
          this.plugin.settings.showStatusBar = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl).setName('상태').setHeading();

    const count = this.plugin.settings.skinnedPaths.length;
    new Setting(containerEl)
      .setName('스킨이 켜진 노트')
      .setDesc(count === 0 ? '없다.' : `${count}개`)
      .addButton((button) => {
        button
          .setButtonText('전체 해제')
          .setDisabled(count === 0)
          .onClick(async () => {
            await this.plugin.clearAll();
            this.display();
          });
      });
  }
}
