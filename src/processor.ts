import { App, TFile, Notice } from 'obsidian';
import { ObsidianFlowSettings } from './types';
import { AIService } from './ai-service';

export class IngestionProcessor {
  constructor(private app: App, private settings: ObsidianFlowSettings, private aiService: AIService) {}

  updateSettings(settings: ObsidianFlowSettings) {
    this.settings = settings;
    this.aiService.updateSettings(settings);
  }

  async processInbox(): Promise<number> {
    const inboxFolder = this.settings.inboxFolder || '00_Inbox';
    const folder = this.app.vault.getAbstractFileByPath(inboxFolder);

    if (!folder) {
      new Notice(`Inbox folder "${inboxFolder}" not found in vault.`);
      return 0;
    }

    const files = this.app.vault.getMarkdownFiles().filter(f => f.path.startsWith(inboxFolder + '/'));

    if (files.length === 0) {
      new Notice('Inbox is clear. No notes to process.');
      return 0;
    }

    new Notice(`ObsidianFlow: Processing ${files.length} inbox note(s)...`);
    let processedCount = 0;

    for (const file of files) {
      try {
        await this.processSingleFile(file);
        processedCount++;
      } catch (err: unknown) {
        console.error(`Error processing ${file.path}:`, err);
        new Notice(`Failed to process ${file.basename}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    new Notice(`ObsidianFlow: Successfully processed ${processedCount} note(s)!`);
    return processedCount;
  }

  async processSingleFile(file: TFile): Promise<void> {
    const rawContent = await this.app.vault.read(file);
    const enriched = await this.aiService.synthesizeMeeting(rawContent, file.name);

    // Format final markdown
    const dateStr = enriched.date || new Date().toISOString().slice(0, 10);
    const safeTitle = enriched.title.replace(/[\\/:*?"<>|]/g, '-').trim();
    const destDir = this.settings.meetingsFolder || 'raw/meetings';

    // Ensure target directory exists
    await this.ensureFolder(destDir);

    const destPath = `${destDir}/${dateStr} - ${safeTitle}.md`;

    const attendeesFormatted = enriched.attendees.map(a => {
      return this.settings.autoLinkEntities ? `[[${a}]]` : a;
    }).join(', ');

    const actionItemsFormatted = enriched.actionItems.map(item => `- [ ] ${item}`).join('\n');
    const decisionsFormatted = enriched.keyDecisions.map(d => `- ${d}`).join('\n');

    const body = `---
type: meeting
title: "${enriched.title}"
date: ${dateStr}${enriched.account ? `\naccount: "[[${enriched.account}]]"` : ''}
attendees: [${enriched.attendees.map(a => `"${a}"`).join(', ')}]
tags: [${enriched.tags.map(t => `"${t}"`).join(', ')}]
---

# ${enriched.title}

**Date:** ${dateStr}  
**Attendees:** ${attendeesFormatted || 'None recorded'}  
${enriched.account ? `**Account:** [[${enriched.account}]]  \n` : ''}

## Summary

${enriched.summary}

${enriched.keyDecisions.length > 0 ? `## Key Decisions\n\n${decisionsFormatted}\n\n` : ''}## Action Items

${actionItemsFormatted || '- [ ] Follow up on meeting notes'}

## Raw Notes / Transcript

${rawContent}
`;

    // Create or update destination note
    const existing = this.app.vault.getAbstractFileByPath(destPath);
    if (existing instanceof TFile) {
      await this.app.vault.modify(existing, body);
    } else {
      await this.app.vault.create(destPath, body);
    }

    // Delete processed file from inbox
    await this.app.vault.delete(file);
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
