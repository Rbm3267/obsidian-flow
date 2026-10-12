export type AIProvider = 'gemini' | 'claude' | 'openai' | 'ollama';

export interface ObsidianFlowSettings {
  aiProvider: AIProvider;
  geminiApiKey: string;
  geminiModel: string;
  claudeApiKey: string;
  claudeModel: string;
  openaiApiKey: string;
  openaiModel: string;
  ollamaEndpoint: string;
  ollamaModel: string;
  inboxFolder: string;
  meetingsFolder: string;
  accountsFolder: string;
  templatesFolder: string;
  autoLinkEntities: boolean;
  autoExtractTasks: boolean;
}

export const DEFAULT_SETTINGS: ObsidianFlowSettings = {
  aiProvider: 'gemini',
  geminiApiKey: '',
  geminiModel: 'gemini-1.5-flash',
  claudeApiKey: '',
  claudeModel: 'claude-3-5-sonnet-20241022',
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3',
  inboxFolder: '00_Inbox',
  meetingsFolder: 'raw/meetings',
  accountsFolder: 'Accounts',
  templatesFolder: 'Templates',
  autoLinkEntities: true,
  autoExtractTasks: true,
};

export interface MeetingEnrichmentResult {
  title: string;
  date: string;
  account?: string;
  attendees: string[];
  summary: string;
  actionItems: string[];
  keyDecisions: string[];
  tags: string[];
}
