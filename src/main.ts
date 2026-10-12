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
    this.addRibbonIcon('git-pull-request', 'ObsidianFlow: Ingest Inbox', async () => {
      await this.processor.processInbox();
    });

    // Commands
    this.addCommand({
      id: 'obsidianflow-ingest-inbox',
      name: 'Ingest and Synthesize Inbox',
      callback: async () => {
        await this.processor.processInbox();
      },
    });

    this.addCommand({
      id: 'obsidianflow-open-dashboard',
      name: 'Open Account Intelligence Hub',
      callback: () => {
        this.activateDashboard();
      },
    });

    this.addCommand({
      id: 'obsidianflow-synthesize-active',
      name: 'Synthesize Active Note with AI',
      checkCallback: (checking: boolean) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          if (!checking) {
            this.synthesizeActiveFile(activeFile);
          }
          return true;
        }
        return false;
      },
    });

    // Codeblock processor for embedded card
    this.registerMarkdownCodeBlockProcessor('obsidianflow-dashboard', (source, el, ctx) => {
      el.empty();
      const wrap = el.createDiv({ cls: 'of-embedded-card' });
      wrap.createEl('h4', { text: 'ObsidianFlow Intelligence' });
      wrap.createSpan({ text: 'Active intelligence context indexed.' });
    });

    // Settings
    this.addSettingTab(new ObsidianFlowSettingTab(this.app, this));
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_OBSIDIANFLOW_DASHBOARD);
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
      workspace.revealLeaf(leaf);
    }
  }

  async synthesizeActiveFile(file: TFile) {
    new Notice(`ObsidianFlow: Synthesizing ${file.basename}...`);
    try {
      const content = await this.app.vault.read(file);
      const enriched = await this.aiService.synthesizeMeeting(content, file.name);
      
      const summaryBlock = `\n\n## AI Executive Synthesis\n\n${enriched.summary}\n\n### Key Decisions\n${enriched.keyDecisions.map(d => `- ${d}`).join('\n')}\n\n### Action Items\n${enriched.actionItems.map(a => `- [ ] ${a}`).join('\n')}\n`;
      await this.app.vault.append(file, summaryBlock);
      new Notice(`ObsidianFlow: Synthesis appended to ${file.basename}`);
    } catch (err: unknown) {
      new Notice(`Synthesis failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.aiService?.updateSettings(this.settings);
    this.processor?.updateSettings(this.settings);
  }
}
