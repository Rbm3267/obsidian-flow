import { App, TFile, Notice } from 'obsidian';
import { ObsidianFlowSettings, MeetingEnrichmentResult } from './types';
import { AIService } from './ai-service';

export class IngestionProcessor {
  private app: App;
  private settings: ObsidianFlowSettings;
  private aiService: AIService;

  constructor(app: App, settings: ObsidianFlowSettings, aiService: AIService) {
    this.app = app;
    this.settings = settings;
    this.aiService = aiService;
  }

  async processInbox(): Promise<number> {
    const inboxFolder = this.settings.inboxFolder || '00_Inbox';
    const folder = this.app.vault.getAbstractFileByPath(inboxFolder);

    if (!folder) {
      new Notice(`VaultFlow: Inbox folder "${inboxFolder}" does not exist.`);
      return 0;
    }

    const files = this.app.vault.getMarkdownFiles().filter(f => f.path.startsWith(inboxFolder + '/'));
    if (files.length === 0) {
      new Notice('VaultFlow: Inbox is clear. No notes to process.');
      return 0;
    }

    new Notice(`VaultFlow: Processing ${files.length} inbox notes...`);
    let count = 0;

    for (const file of files) {
      try {
        await this.processSingleNote(file);
        count++;
      } catch (err: unknown) {
        console.error(`Error processing note ${file.path}:`, err);
        new Notice(`Failed to process ${file.basename}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    new Notice(`VaultFlow: Successfully processed ${count} notes.`);
    return count;
  }

  private async processSingleNote(file: TFile): Promise<void> {
    const content = await this.app.vault.read(file);
    const enriched: MeetingEnrichmentResult = await this.aiService.enrichMeeting(content, file.basename);

    // Format destination path
    const meetFolder = this.settings.meetingsFolder || 'raw/meetings';
    await this.ensureFolder(meetFolder);

    const destPath = `${meetFolder}/${file.name}`;

    // Format synthesized note
    const frontmatter = [
      '---',
      `title: "${enriched.title}"`,
      `date: "${enriched.date}"`,
      enriched.account ? `account: "[[${enriched.account}]]"` : null,
      `attendees: [${enriched.attendees.map(a => `"${a}"`).join(', ')}]`,
      `tags: [${enriched.tags.join(', ')}]`,
      '---',
    ].filter(Boolean).join('\n');

    let body = `${frontmatter}\n\n## Executive Summary\n${enriched.summary}\n\n`;
    
    if (enriched.keyDecisions.length > 0) {
      body += `## Key Decisions\n${enriched.keyDecisions.map(d => `- ${d}`).join('\n')}\n\n`;
    }

    if (enriched.actionItems.length > 0) {
      body += `## Action Items\n${enriched.actionItems.map(a => `- [ ] ${a}`).join('\n')}\n\n`;
    }

    body += `## Original Source Transcript\n${content}\n`;

    const existing = this.app.vault.getAbstractFileByPath(destPath);
    if (existing instanceof TFile) {
      await this.app.vault.modify(existing, body);
    } else {
      await this.app.vault.create(destPath, body);
    }

    // Trash processed file from inbox respecting user deletion settings
    await this.app.fileManager.trashFile(file);
  }

  private async ensureFolder(path: string): Promise<void> {
    const parts = path.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      const exists = this.app.vault.getAbstractFileByPath(current);
      if (!exists) {
        await this.app.vault.createFolder(current);
      }
    }
  }
}
