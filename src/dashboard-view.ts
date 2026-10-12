import { App, ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import { ObsidianFlowSettings } from './types';

export const VIEW_TYPE_OBSIDIANFLOW_DASHBOARD = 'obsidianflow-account-dashboard';

export class AccountDashboardView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private settings: ObsidianFlowSettings) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_OBSIDIANFLOW_DASHBOARD;
  }

  getDisplayText(): string {
    return 'ObsidianFlow Dashboard';
  }

  getIcon(): string {
    return 'network';
  }

  async onOpen(): Promise<void> {
    await this.render();
  }

  async render(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('of-dashboard-container');

    const accounts = await this.getAccounts();
    const meetings = await this.getRecentMeetings();

    // Header
    const header = container.createDiv({ cls: 'of-dashboard-header' });
    const titleGroup = header.createDiv({ cls: 'of-header-title-group' });
    titleGroup.createEl('h1', { text: 'Account Intelligence Hub' });
    titleGroup.createSpan({ cls: 'of-subtitle', text: `${accounts.length} tracked accounts · ${meetings.length} meetings indexed` });

    // Grid of Accounts
    const grid = container.createDiv({ cls: 'of-accounts-grid' });
    for (const acc of accounts) {
      const card = grid.createDiv({ cls: 'of-account-card' });
      
      const cardTop = card.createDiv({ cls: 'of-card-top' });
      cardTop.createEl('h3', { text: acc.name });
      
      const badge = cardTop.createSpan({ cls: `of-health-badge of-health-${acc.health.toLowerCase()}`, text: acc.health });
      
      const statsRow = card.createDiv({ cls: 'of-card-stats' });
      statsRow.createSpan({ text: `${acc.meetingCount} meetings` });
      statsRow.createSpan({ text: '·' });
      statsRow.createSpan({ text: `${acc.taskCount} open tasks` });

      card.addEventListener('click', () => {
        this.app.workspace.openLinkText(acc.path, '', false);
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
        this.app.workspace.openLinkText(mtg.path, '', false);
      });
    }
  }

  private async getAccounts(): Promise<{ name: string; path: string; health: string; meetingCount: number; taskCount: number }[]> {
    const accFolder = this.settings.accountsFolder || 'Accounts';
    const files = this.app.vault.getMarkdownFiles().filter(f => f.path.startsWith(accFolder + '/'));

    const result = [];
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const fm = cache?.frontmatter || {};
      result.push({
        name: fm.company || fm.name || file.basename,
        path: file.path,
        health: fm.health || 'GREEN',
        meetingCount: 0,
        taskCount: 0,
      });
    }
    return result;
  }

  private async getRecentMeetings(): Promise<{ title: string; date: string; path: string }[]> {
    const meetFolder = this.settings.meetingsFolder || 'raw/meetings';
    const files = this.app.vault.getMarkdownFiles().filter(f => f.path.startsWith(meetFolder + '/'));

    return files.slice(0, 15).map(f => {
      const cache = this.app.metadataCache.getFileCache(f);
      const fm = cache?.frontmatter || {};
      return {
        title: fm.title || f.basename,
        date: fm.date || new Date(f.stat.mtime).toISOString().slice(0, 10),
        path: f.path,
      };
    });
  }
}
