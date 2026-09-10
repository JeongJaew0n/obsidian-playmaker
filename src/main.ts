import { MarkdownView, Notice, Plugin, TFolder } from 'obsidian';
import type { TAbstractFile } from 'obsidian';
import { PRESETS } from './presets';
import type { PresetId } from './presets';
import { DEFAULT_SETTINGS, PlaymakerSettingTab } from './settings';
import type { PlaymakerSettings } from './settings';
import { TerminalSkinController } from './skin-controller';

export default class PlaymakerPlugin extends Plugin {
  // Obsidian 1.13.0 의 Plugin 에 settings?: unknown 이 생겨 override 가 필요하다.
  override settings: PlaymakerSettings = { ...DEFAULT_SETTINGS };

  private controller!: TerminalSkinController;
  private statusBarEl: HTMLElement | null = null;

  override async onload(): Promise<void> {
    await this.loadSettings();

    this.controller = new TerminalSkinController(this.app, () => this.settings);
    this.controller.refreshStyle();

    this.registerCommands();
    this.registerWorkspaceEvents();
    this.registerVaultEvents();

    this.addRibbonIcon('terminal', '터미널 스킨 토글 (현재 노트)', () => {
      void this.toggleCurrent();
    });

    this.statusBarEl = this.addStatusBarItem();
    this.addSettingTab(new PlaymakerSettingTab(this.app, this));

    // 시작 직후 한 번 전체 적용. 이 시점 이후로는 이벤트가 상태를 맞춘다.
    this.app.workspace.onLayoutReady(() => {
      this.controller.reapplyAll();
      this.updateStatusBar();
    });
  }

  override onunload(): void {
    // 플러그인을 끄면 화면에 흔적이 남지 않아야 한다.
    this.controller.destroy();
  }

  async loadSettings(): Promise<void> {
    const stored = (await this.loadData()) as Partial<PlaymakerSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
    // 저장된 값이 손상된 경우에도 뒤쪽 로직이 안전하도록 최소한만 보정한다.
    if (!Array.isArray(this.settings.skinnedPaths)) this.settings.skinnedPaths = [];
    if (!(this.settings.preset in PRESETS)) this.settings.preset = DEFAULT_SETTINGS.preset;
  }

  /** 설정 저장 후 화면을 설정과 다시 일치시킨다. */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.controller.refreshStyle();
    this.controller.reapplyAll();
    this.updateStatusBar();
  }

  /** 현재 활성 노트의 스킨을 켜거나 끈다. */
  async toggleCurrent(): Promise<void> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const path = view?.file?.path;
    if (path === undefined) {
      new Notice('Playmaker: 활성 노트가 없다.');
      return;
    }

    const index = this.settings.skinnedPaths.indexOf(path);
    if (index >= 0) {
      this.settings.skinnedPaths.splice(index, 1);
    } else {
      this.settings.skinnedPaths.push(path);
    }
    await this.saveSettings();
  }

  /** 스킨을 켜둔 노트 목록을 비운다. */
  async clearAll(): Promise<void> {
    if (this.settings.skinnedPaths.length === 0) return;
    this.settings.skinnedPaths = [];
    await this.saveSettings();
  }

  private registerCommands(): void {
    this.addCommand({
      id: 'toggle-current-note',
      name: '터미널 스킨 토글 (현재 노트)',
      callback: () => {
        void this.toggleCurrent();
      },
    });

    this.addCommand({
      id: 'clear-all',
      name: '터미널 스킨 전체 해제',
      callback: () => {
        void this.clearAll();
      },
    });

    this.addCommand({
      id: 'cycle-preset',
      name: '터미널 스킨 프리셋 순환',
      callback: () => {
        const ids = Object.keys(PRESETS) as PresetId[];
        const next = ids[(ids.indexOf(this.settings.preset) + 1) % ids.length];
        if (next === undefined) return;
        this.settings.preset = next;
        new Notice(`Playmaker: ${PRESETS[next].label}`);
        void this.saveSettings();
      },
    });
  }

  private registerWorkspaceEvents(): void {
    const { workspace } = this.app;

    // 활성 탭이 바뀌면 그 뷰에 스킨이 필요한지 다시 판단한다.
    this.registerEvent(workspace.on('active-leaf-change', () => this.controller.scheduleReapply()));
    // 분할·이동·모드 전환 후에는 뷰 DOM 이 새로 만들어져 클래스가 사라진다.
    this.registerEvent(workspace.on('layout-change', () => this.controller.scheduleReapply()));
    // 같은 leaf 안에서 파일만 교체된 경우.
    this.registerEvent(workspace.on('file-open', () => this.controller.scheduleReapply()));
    // 테마 교체 후 변수 <style> 이 뒤로 밀릴 수 있어 다시 써준다.
    this.registerEvent(
      workspace.on('css-change', () => {
        this.controller.refreshStyle();
        this.controller.scheduleReapply();
      }),
    );
  }

  private registerVaultEvents(): void {
    const { vault } = this.app;

    this.registerEvent(
      vault.on('rename', (file: TAbstractFile, oldPath: string) => {
        // 폴더 이름이 바뀌면 그 아래 경로를 접두사째 갱신한다.
        // 파일 하나만 바뀐 경우는 정확히 일치하는 항목만 갱신한다.
        const isFolder = file instanceof TFolder;
        let changed = false;

        this.settings.skinnedPaths = this.settings.skinnedPaths.map((path) => {
          if (path === oldPath) {
            changed = true;
            return file.path;
          }
          if (isFolder && path.startsWith(`${oldPath}/`)) {
            changed = true;
            return `${file.path}${path.slice(oldPath.length)}`;
          }
          return path;
        });

        if (changed) void this.saveSettings();
      }),
    );

    this.registerEvent(
      vault.on('delete', (file: TAbstractFile) => {
        // 유령 경로가 쌓이지 않게 지운다. 폴더면 그 아래 전부.
        const isFolder = file instanceof TFolder;
        const before = this.settings.skinnedPaths.length;

        this.settings.skinnedPaths = this.settings.skinnedPaths.filter((path) => {
          if (path === file.path) return false;
          if (isFolder && path.startsWith(`${file.path}/`)) return false;
          return true;
        });

        if (this.settings.skinnedPaths.length !== before) void this.saveSettings();
      }),
    );
  }

  private updateStatusBar(): void {
    if (!this.statusBarEl) return;
    const count = this.settings.skinnedPaths.length;
    this.statusBarEl.setText(
      this.settings.showStatusBar && count > 0 ? `TERM ${count}` : '',
    );
  }
}
