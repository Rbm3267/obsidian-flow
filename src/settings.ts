import { App, PluginSettingTab, SettingDefinitionItem } from 'obsidian';
import type ObsidianFlowPlugin from './main';

export class ObsidianFlowSettingTab extends PluginSettingTab {
  plugin: ObsidianFlowPlugin;

  constructor(app: App, plugin: ObsidianFlowPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      // ── Workflow directories ─────────────────────────────
      {
        type: 'group',
        heading: 'Workflow directories',
        items: [
          {
            name: 'Inbox folder',
            desc: 'Folder where unparsed transcripts or quick notes land for processing.',
            control: {
              type: 'folder',
              key: 'inboxFolder',
              placeholder: '00_Inbox',
            },
          },
          {
            name: 'Meetings destination folder',
            desc: 'Directory where enriched, structured meeting notes are saved.',
            control: {
              type: 'folder',
              key: 'meetingsFolder',
              placeholder: 'raw/meetings',
            },
          },
          {
            name: 'Accounts folder',
            desc: 'Directory containing customer or account profile pages.',
            control: {
              type: 'folder',
              key: 'accountsFolder',
              placeholder: 'Accounts',
            },
          },
          {
            name: 'Auto-link entities',
            desc: 'Automatically wrap attendee names and account names in [[WikiLinks]] during synthesis.',
            control: {
              type: 'toggle',
              key: 'autoLinkEntities',
            },
          },
        ],
      },

      // ── AI engine ────────────────────────────────────────
      {
        type: 'group',
        heading: 'AI engine',
        items: [
          {
            name: 'Default AI provider',
            desc: 'Select the LLM that will analyze and structure meeting notes.',
            control: {
              type: 'dropdown',
              key: 'aiProvider',
              options: {
                gemini: 'Google Gemini',
                claude: 'Anthropic Claude',
                openai: 'OpenAI',
                ollama: 'Ollama (Local)',
              },
            },
          },

          // ── Gemini ───────────────────────────────────────
          {
            name: 'Gemini API key',
            desc: 'Google AI Studio API key.',
            visible: () => this.plugin.settings.aiProvider === 'gemini',
            control: {
              type: 'text',
              key: 'geminiApiKey',
              placeholder: 'AIzaSy...',
            },
          },
          {
            name: 'Gemini model',
            desc: 'Select Gemini model.',
            visible: () => this.plugin.settings.aiProvider === 'gemini',
            control: {
              type: 'dropdown',
              key: 'geminiModel',
              options: {
                'gemini-1.5-flash': 'Gemini 1.5 Flash (Fast)',
                'gemini-1.5-pro': 'Gemini 1.5 Pro (Deep Reasoning)',
                'gemini-2.0-flash-exp': 'Gemini 2.0 Flash',
              },
            },
          },

          // ── Claude ───────────────────────────────────────
          {
            name: 'Anthropic API key',
            desc: 'Anthropic Console API key.',
            visible: () => this.plugin.settings.aiProvider === 'claude',
            control: {
              type: 'text',
              key: 'claudeApiKey',
              placeholder: 'sk-ant-...',
            },
          },
          {
            name: 'Claude model',
            desc: 'Select Anthropic Claude model.',
            visible: () => this.plugin.settings.aiProvider === 'claude',
            control: {
              type: 'dropdown',
              key: 'claudeModel',
              options: {
                'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
                'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
              },
            },
          },

          // ── OpenAI ───────────────────────────────────────
          {
            name: 'OpenAI API key',
            desc: 'OpenAI Platform API key.',
            visible: () => this.plugin.settings.aiProvider === 'openai',
            control: {
              type: 'text',
              key: 'openaiApiKey',
              placeholder: 'sk-...',
            },
          },
          {
            name: 'OpenAI model',
            desc: 'Select OpenAI model.',
            visible: () => this.plugin.settings.aiProvider === 'openai',
            control: {
              type: 'dropdown',
              key: 'openaiModel',
              options: {
                'gpt-4o-mini': 'GPT-4o Mini (Default)',
                'gpt-4o': 'GPT-4o',
              },
            },
          },

          // ── Ollama ───────────────────────────────────────
          {
            name: 'Ollama endpoint',
            desc: 'Base URL for local Ollama instance.',
            visible: () => this.plugin.settings.aiProvider === 'ollama',
            control: {
              type: 'text',
              key: 'ollamaEndpoint',
              placeholder: 'http://localhost:11434',
            },
          },
          {
            name: 'Ollama model',
            desc: 'Model name pulled into Ollama (e.g. llama3).',
            visible: () => this.plugin.settings.aiProvider === 'ollama',
            control: {
              type: 'text',
              key: 'ollamaModel',
              placeholder: 'llama3',
            },
          },
        ],
      },
    ];
  }
}
