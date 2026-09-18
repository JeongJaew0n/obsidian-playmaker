import { MarkdownView, Notice, Plugin, TFolder } from 'obsidian';
import type { TAbstractFile } from 'obsidian';
import { SKINS, SKIN_IDS, getSkin } from './skins';
import type { SkinId } from './skins';
import { PlaymakerSettingTab, createDefaultSettings, migrateSettings } from './settings';
import type { PlaymakerSettings } from './settings';
import { SkinController } from './skin-controller';

export default class PlaymakerPlugin extends Plugin {
  // Obsidian 1.13.0 의 Plugin 에 settings?: unknown 이 생겨 override 가 필요하다.
  override settings: PlaymakerSettings = createDefaultSettings();

  private controller!: SkinController;
  private statusBarEl: HTMLElement | null = null;

  override async onload(): Promise<void> {
    await this.loadSettings();

    this.controller = new SkinController(this.app, () => this.settings);
    this.controller.refreshStyle();

    this.registerCommands();
    this.registerWorkspaceEvents();
    this.registerVaultEvents();

    this.addRibbonIcon('palette', '스킨 켜기/끄기 (현재 노트)', () => {
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
    this.settings = migrateSettings(await this.loadData());
  }

  /** 설정 저장 후 화면을 설정과 다시 일치시킨다. */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.controller.refreshStyle();
    this.controller.reapplyAll();
    this.updateStatusBar();
  }

  /**
   * 현재 노트의 스킨을 켜거나 끈다.
   *
   * 지금 실제로 스킨이 보이는 상태면 끄고, 아니면 활성 스킨을 입힌다.
   * 전역이 켜진 상태에서 끄면 그 노트만 'none' 으로 빼둔다.
   */
  async toggleCurrent(): Promise<void> {
    const path = this.currentPath();
    if (path === null) return;

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const isPreview = view?.getMode() === 'preview';
    const showing = this.controller.resolveSkinFor(path, isPreview) !== null;

    if (showing) {
      if (this.settings.applyToAllNotes && this.settings.notes[path] === undefined) {
        this.settings.notes[path] = 'none';
      } else {
        delete this.settings.notes[path];
      }
    } else {
      this.settings.notes[path] = this.settings.activeSkin;
    }
    await this.saveSettings();
  }

  /** 현재 노트에 특정 스킨을 입힌다. 활성 스킨도 그것으로 바꾼다. */
  async applySkinToCurrent(id: SkinId): Promise<void> {
    const path = this.currentPath();
    if (path === null) return;

    this.settings.notes[path] = id;
    this.settings.activeSkin = id;
    await this.saveSettings();
    new Notice(`Playmaker: ${SKINS[id].label}`);
  }

  /** 노트별 지정을 모두 지운다. 전역 스위치는 건드리지 않는다. */
  async clearAllNotes(): Promise<void> {
    if (Object.keys(this.settings.notes).length === 0) return;
    this.settings.notes = {};
    await this.saveSettings();
  }

  private currentPath(): string | null {
    const path = this.app.workspace.getActiveViewOfType(MarkdownView)?.file?.path;
    if (path === undefined) {
      new Notice('Playmaker: 활성 노트가 없다.');
      return null;
    }
    return path;
  }

  private registerCommands(): void {
    this.addCommand({
      id: 'toggle-current-note',
      name: '스킨 켜기/끄기 (현재 노트)',
      callback: () => void this.toggleCurrent(),
    });

    // 스킨마다 명령을 하나씩 둔다. 핫키를 따로 줄 수 있고, 명령 팔레트에서 이름으로 찾힌다.
    for (const id of SKIN_IDS) {
      this.addCommand({
        id: `apply-skin-${id}`,
        name: `이 노트에 '${SKINS[id].label}' 입히기`,
        callback: () => void this.applySkinToCurrent(id),
      });
    }

    this.addCommand({
      id: 'exclude-current-note',
      name: '이 노트만 맨얼굴로',
      callback: () => {
        const path = this.currentPath();
        if (path === null) return;
        this.settings.notes[path] = 'none';
        void this.saveSettings();
      },
    });

    this.addCommand({
      id: 'cycle-skin',
      name: '스킨 바꾸기',
      callback: () => {
        const next = SKIN_IDS[(SKIN_IDS.indexOf(this.settings.activeSkin) + 1) % SKIN_IDS.length];
        if (next === undefined) return;
        this.settings.activeSkin = next;
        new Notice(`Playmaker: ${SKINS[next].label}`);
        void this.saveSettings();
      },
    });

    this.addCommand({
      id: 'cycle-variant',
      name: '분위기 바꾸기',
      callback: () => {
        const skin = getSkin(this.settings.activeSkin);
        const ids = Object.keys(skin.variants);
        if (ids.length < 2) {
          new Notice(`Playmaker: '${skin.label}' 은 분위기가 하나뿐이다.`);
          return;
        }
        const current = this.settings.variants[skin.id] ?? skin.defaultVariant;
        const next = ids[(ids.indexOf(current) + 1) % ids.length];
        if (next === undefined) return;
        this.settings.variants[skin.id] = next;
        new Notice(`Playmaker: ${skin.variants[next]!.label}`);
        void this.saveSettings();
      },
    });

    this.addCommand({
      id: 'toggle-global',
      name: '모든 노트에 적용 켜기/끄기',
      callback: () => {
        this.settings.applyToAllNotes = !this.settings.applyToAllNotes;
        new Notice(
          this.settings.applyToAllNotes
            ? `Playmaker: 모든 노트에 '${getSkin(this.settings.globalSkin).label}' 적용`
            : 'Playmaker: 모든 노트 적용 해제',
        );
        void this.saveSettings();
      },
    });

    this.addCommand({
      id: 'clear-all',
      name: '노트별 지정 전부 해제',
      callback: () => void this.clearAllNotes(),
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
        const isFolder = file instanceof TFolder;
        const next: typeof this.settings.notes = {};
        let changed = false;

        for (const [path, skin] of Object.entries(this.settings.notes)) {
          if (path === oldPath) {
            next[file.path] = skin;
            changed = true;
          } else if (isFolder && path.startsWith(`${oldPath}/`)) {
            next[`${file.path}${path.slice(oldPath.length)}`] = skin;
            changed = true;
          } else {
            next[path] = skin;
          }
        }

        if (changed) {
          this.settings.notes = next;
          void this.saveSettings();
        }
      }),
    );

    this.registerEvent(
      vault.on('delete', (file: TAbstractFile) => {
        // 유령 경로가 쌓이지 않게 지운다. 폴더면 그 아래 전부.
        const isFolder = file instanceof TFolder;
        let changed = false;

        for (const path of Object.keys(this.settings.notes)) {
          if (path === file.path || (isFolder && path.startsWith(`${file.path}/`))) {
            delete this.settings.notes[path];
            changed = true;
          }
        }

        if (changed) void this.saveSettings();
      }),
    );
  }

  private updateStatusBar(): void {
    if (!this.statusBarEl) return;
    const count = Object.keys(this.settings.notes).length;
    this.statusBarEl.setText(this.settings.showStatusBar && count > 0 ? `SKIN ${count}` : '');
  }
}
