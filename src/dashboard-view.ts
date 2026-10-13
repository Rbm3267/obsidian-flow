import { ItemView, WorkspaceLeaf } from 'obsidian';
import { ObsidianFlowSettings } from './types';
import { getMarkdownFilesUnderFolder } from './vault-utils';

export const VIEW_TYPE_OBSIDIANFLOW_DASHBOARD = 'vaultflow-dashboard';

export class AccountDashboardView extends ItemView {
  private settings: ObsidianFlowSettings;

  constructor(leaf: WorkspaceLeaf, settings: ObsidianFlowSettings) {
    super(leaf);
    this.settings = settings;
  }

  getViewType(): string {
    return VIEW_TYPE_OBSIDIANFLOW_DASHBOARD;
  }

  getDisplayText(): string {
    return 'VaultFlow Intelligence Hub';
  }

  getIcon(): string {
    return 'layout-grid';
  }

  async onOpen(): Promise<void> {
    await this.render();
  }

  async render(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('of-dashboard-container');

    const [accounts, meetings] = await Promise.all([
      this.getAccounts(),
      this.getRecentMeetings(),
    ]);

    // Header
    const header = container.createDiv({ cls: 'of-dashboard-header' });
    header.createEl('h1', { text: 'Account Intelligence' });
    header.createSpan({ cls: 'of-header-subtitle', text: `${accounts.length} active customer profiles indexed` });

    // Grid of Accounts
    const grid = container.createDiv({ cls: 'of-accounts-grid' });
    for (const acc of accounts) {
      const card = grid.createDiv({ cls: 'of-account-card' });
      
      const cardTop = card.createDiv({ cls: 'of-card-top' });
      cardTop.createEl('h3', { text: acc.name });
      
      cardTop.createSpan({ cls: `of-health-badge of-health-${acc.health.toLowerCase()}`, text: acc.health });
      
      const statsRow = card.createDiv({ cls: 'of-card-stats' });
      statsRow.createSpan({ text: `${acc.meetingCount} meetings` });
      statsRow.createSpan({ text: '·' });
      statsRow.createSpan({ text: `${acc.taskCount} open tasks` });

      card.addEventListener('click', () => {
        void this.app.workspace.openLinkText(acc.path, '', false);
      });
    }

    // Recent Ingestion Activity
    const activitySection = container.createDiv({ cls: 'of-activity-section' });
    activitySection.createEl('h2', { text: 'Recent Synthesized Meetings' });

    const activityList = activitySection.createDiv({ cls: 'of-activity-list' });
    for (const mtg of meetings.slice(0, 10)) {
      const row = activityList.createDiv({ cls: 'of-activity-row' });
      row.createSpan({ cls: 'of-activity-date', text: mtg.date });
      row.createSpan({ cls: 'of-activity-title', text: mtg.title });
      row.addEventListener('click', () => {
        void this.app.workspace.openLinkText(mtg.path, '', false);
      });
    }
  }

  private async getAccounts(): Promise<{ name: string; path: string; health: string; meetingCount: number; taskCount: number }[]> {
    const accFolder = this.settings.accountsFolder || 'Accounts';
    const files = getMarkdownFilesUnderFolder(this.app.vault, accFolder);

    const result: { name: string; path: string; health: string; meetingCount: number; taskCount: number }[] = [];
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const fm = (cache?.frontmatter && typeof cache.frontmatter === 'object') ? cache.frontmatter : {};
      result.push({
        name: String(fm.company || fm.name || file.basename),
        path: file.path,
        health: String(fm.health || 'GREEN'),
        meetingCount: 0,
        taskCount: 0,
      });
    }
    return result;
  }

  private async getRecentMeetings(): Promise<{ title: string; date: string; path: string }[]> {
    const meetFolder = this.settings.meetingsFolder || 'raw/meetings';
    const files = getMarkdownFilesUnderFolder(this.app.vault, meetFolder);

    return files.slice(0, 15).map(f => {
      const cache = this.app.metadataCache.getFileCache(f);
      const fm = (cache?.frontmatter && typeof cache.frontmatter === 'object') ? cache.frontmatter : {};
      return {
        title: String(fm.title || f.basename),
        date: String(fm.date || new Date(f.stat.mtime).toISOString().slice(0, 10)),
        path: f.path,
      };
    });
  }
}
