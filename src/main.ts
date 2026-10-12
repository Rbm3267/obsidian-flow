import { Plugin, WorkspaceLeaf, Notice, TFile } from 'obsidian';
import { ObsidianFlowSettings, DEFAULT_SETTINGS } from './types';
import { AIService } from './ai-service';
import { IngestionProcessor } from './processor';
import { AccountDashboardView, VIEW_TYPE_OBSIDIANFLOW_DASHBOARD } from './dashboard-view';
import { ObsidianFlowSettingTab } from './settings';

export default class ObsidianFlowPlugin extends Plugin {
  settings: ObsidianFlowSettings;
  aiService: AIService;
  processor: IngestionProcessor;

  async onload() {
    await this.loadSettings();
    this.aiService = new AIService(this.settings);
    this.processor = new IngestionProcessor(this.app, this.settings, this.aiService);

    // Register custom view
    this.registerView(
      VIEW_TYPE_OBSIDIANFLOW_DASHBOARD,
      (leaf: WorkspaceLeaf) => new AccountDashboardView(leaf, this.settings)
    );

    // Ribbon icon: quick ingest
    this.addRibbonIcon('git-pull-request', 'VaultFlow: Ingest Inbox', () => {
      void this.processor.processInbox();
    });

    // Commands (Command ID does not repeat plugin ID)
    this.addCommand({
      id: 'ingest-inbox',
      name: 'Ingest and Synthesize Inbox',
      callback: () => {
        void this.processor.processInbox();
      },
    });

    this.addCommand({
      id: 'open-hub',
      name: 'Open Account Intelligence Hub',
      callback: () => {
        void this.activateDashboard();
      },
    });

    this.addCommand({
      id: 'synthesize-active-note',
      name: 'Synthesize Active Note with AI',
      checkCallback: (checking: boolean) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          if (!checking) {
            void this.synthesizeActiveFile(activeFile);
          }
          return true;
        }
        return false;
      },
    });

    // Codeblock processor for embedded card
    this.registerMarkdownCodeBlockProcessor('vaultflow-dashboard', (source, el) => {
      el.empty();
      const wrap = el.createDiv({ cls: 'of-embedded-card' });
      wrap.createEl('h4', { text: 'VaultFlow Intelligence' });
      wrap.createSpan({ text: 'Active intelligence context indexed.' });
    });

    // Settings
    this.addSettingTab(new ObsidianFlowSettingTab(this.app, this));
  }

  onunload() {
    // Leave leaves in place to preserve layout location when reloaded
  }

  async activateDashboard() {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_OBSIDIANFLOW_DASHBOARD);

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getLeaf(false);
      await leaf.setViewState({
        type: VIEW_TYPE_OBSIDIANFLOW_DASHBOARD,
        active: true,
      });
    }

    if (leaf) {
      workspace.setActiveLeaf(leaf, { focus: true });
    }
  }

  async synthesizeActiveFile(file: TFile) {
    new Notice(`VaultFlow: Synthesizing ${file.basename}...`);
    try {
      const content = await this.app.vault.read(file);
      const enriched = await this.aiService.enrichMeeting(content, file.basename);
      
      const frontmatter = [
        '---',
        `title: "${enriched.title}"`,
        `date: "${enriched.date}"`,
        enriched.account ? `account: "[[${enriched.account}]]"` : null,
        `attendees: [${enriched.attendees.map(a => `"${a}"`).join(', ')}]`,
        `tags: [${enriched.tags.join(', ')}]`,
        '---',
      ].filter(Boolean).join('\n');

      const body = `${frontmatter}\n\n## Executive Summary\n${enriched.summary}\n\n## Key Decisions\n${enriched.keyDecisions.map(d => `- ${d}`).join('\n')}\n\n## Action Items\n${enriched.actionItems.map(a => `- [ ] ${a}`).join('\n')}\n`;

      await this.app.vault.modify(file, body);
      new Notice(`VaultFlow: Successfully enriched ${file.basename}!`);
    } catch (err: unknown) {
      new Notice(`VaultFlow Synthesis Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async loadSettings() {
    const loaded = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, (loaded && typeof loaded === 'object') ? loaded : {});
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.aiService?.updateSettings(this.settings);
  }
}
