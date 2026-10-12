import { App, PluginSettingTab, Setting } from 'obsidian';
import type ObsidianFlowPlugin from './main';
import { AIProvider } from './types';

export class ObsidianFlowSettingTab extends PluginSettingTab {
  plugin: ObsidianFlowPlugin;

  constructor(app: App, plugin: ObsidianFlowPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('VaultFlow Configuration')
      .setHeading();

    // ── Pipeline Folder Paths ─────────────────────────────
    new Setting(containerEl)
      .setName('Workflow Directories')
      .setHeading();

    new Setting(containerEl)
      .setName('Inbox Folder')
      .setDesc('Folder where unparsed transcripts or quick notes land for processing.')
      .addText(text =>
        text
          .setPlaceholder('00_Inbox')
          .setValue(this.plugin.settings.inboxFolder)
          .onChange(async val => {
            this.plugin.settings.inboxFolder = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Meetings Destination Folder')
      .setDesc('Directory where enriched, structured meeting notes are saved.')
      .addText(text =>
        text
          .setPlaceholder('raw/meetings')
          .setValue(this.plugin.settings.meetingsFolder)
          .onChange(async val => {
            this.plugin.settings.meetingsFolder = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Accounts Folder')
      .setDesc('Directory containing customer or account profile pages.')
      .addText(text =>
        text
          .setPlaceholder('Accounts')
          .setValue(this.plugin.settings.accountsFolder)
          .onChange(async val => {
            this.plugin.settings.accountsFolder = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Auto-Link Entities')
      .setDesc('Automatically wrap attendee names and account names in [[WikiLinks]] during synthesis.')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.autoLinkEntities)
          .onChange(async val => {
            this.plugin.settings.autoLinkEntities = val;
            await this.plugin.saveSettings();
          })
      );

    // ── AI Engine Provider ────────────────────────────────
    new Setting(containerEl)
      .setName('AI Synthesis Engine')
      .setHeading();

    new Setting(containerEl)
      .setName('Default AI Provider')
      .setDesc('Select the LLM that will analyze and structure meeting notes.')
      .addDropdown(drop =>
        drop
          .addOption('gemini', 'Google Gemini')
          .addOption('claude', 'Anthropic Claude')
          .addOption('openai', 'OpenAI')
          .addOption('ollama', 'Ollama (Local)')
          .setValue(this.plugin.settings.aiProvider)
          .onChange(async (val: AIProvider) => {
            this.plugin.settings.aiProvider = val;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    // ── Gemini ───────────────────────────────────────────
    if (this.plugin.settings.aiProvider === 'gemini') {
      new Setting(containerEl)
        .setName('Gemini API Key')
        .setDesc('Google AI Studio API Key.')
        .addText(text => {
          text.inputEl.type = 'password';
          text
            .setPlaceholder('AIzaSy...')
            .setValue(this.plugin.settings.geminiApiKey)
            .onChange(async val => {
              this.plugin.settings.geminiApiKey = val;
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName('Gemini Model')
        .setDesc('Select Gemini Model.')
        .addDropdown(drop =>
          drop
            .addOption('gemini-1.5-flash', 'Gemini 1.5 Flash (Fast)')
            .addOption('gemini-1.5-pro', 'Gemini 1.5 Pro (Deep Reasoning)')
            .setValue(this.plugin.settings.geminiModel)
            .onChange(async val => {
              this.plugin.settings.geminiModel = val;
              await this.plugin.saveSettings();
            })
        );
    }

    // ── Claude ───────────────────────────────────────────
    if (this.plugin.settings.aiProvider === 'claude') {
      new Setting(containerEl)
        .setName('Anthropic API Key')
        .setDesc('Anthropic Console API Key.')
        .addText(text => {
          text.inputEl.type = 'password';
          text
            .setPlaceholder('sk-ant-...')
            .setValue(this.plugin.settings.claudeApiKey)
            .onChange(async val => {
              this.plugin.settings.claudeApiKey = val;
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName('Claude Model')
        .setDesc('Select Anthropic Claude Model.')
        .addDropdown(drop =>
          drop
            .addOption('claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet')
            .addOption('claude-3-5-haiku-20241022', 'Claude 3.5 Haiku')
            .setValue(this.plugin.settings.claudeModel)
            .onChange(async val => {
              this.plugin.settings.claudeModel = val;
              await this.plugin.saveSettings();
            })
        );
    }

    // ── OpenAI ───────────────────────────────────────────
    if (this.plugin.settings.aiProvider === 'openai') {
      new Setting(containerEl)
        .setName('OpenAI API Key')
        .setDesc('OpenAI Platform API Key.')
        .addText(text => {
          text.inputEl.type = 'password';
          text
            .setPlaceholder('sk-...')
            .setValue(this.plugin.settings.openaiApiKey)
            .onChange(async val => {
              this.plugin.settings.openaiApiKey = val;
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName('OpenAI Model')
        .setDesc('Select OpenAI Model.')
        .addDropdown(drop =>
          drop
            .addOption('gpt-4o-mini', 'GPT-4o Mini (Default)')
            .addOption('gpt-4o', 'GPT-4o')
            .setValue(this.plugin.settings.openaiModel)
            .onChange(async val => {
              this.plugin.settings.openaiModel = val;
              await this.plugin.saveSettings();
            })
        );
    }

    // ── Ollama ───────────────────────────────────────────
    if (this.plugin.settings.aiProvider === 'ollama') {
      new Setting(containerEl)
        .setName('Ollama Endpoint')
        .setDesc('Base URL for local Ollama instance.')
        .addText(text =>
          text
            .setPlaceholder('http://localhost:11434')
            .setValue(this.plugin.settings.ollamaEndpoint)
            .onChange(async val => {
              this.plugin.settings.ollamaEndpoint = val;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName('Ollama Model')
        .setDesc('Model name pulled into Ollama (e.g. llama3).')
        .addText(text =>
          text
            .setPlaceholder('llama3')
            .setValue(this.plugin.settings.ollamaModel)
            .onChange(async val => {
              this.plugin.settings.ollamaModel = val;
              await this.plugin.saveSettings();
            })
        );
    }
  }
}
