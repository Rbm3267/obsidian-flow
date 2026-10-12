import { requestUrl } from 'obsidian';
import { ObsidianFlowSettings, MeetingEnrichmentResult } from './types';

interface GeminiCandidate {
  content?: {
    parts?: Array<{ text?: string }>;
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

interface ClaudeContentBlock {
  type: string;
  text?: string;
}

interface ClaudeResponse {
  content?: ClaudeContentBlock[];
}

interface OpenAIChoice {
  message?: {
    content?: string;
  };
}

interface OpenAIResponse {
  choices?: OpenAIChoice[];
}

interface OllamaResponse {
  response?: string;
}

export class AIService {
  private settings: ObsidianFlowSettings;

  constructor(settings: ObsidianFlowSettings) {
    this.settings = settings;
  }

  updateSettings(settings: ObsidianFlowSettings) {
    this.settings = settings;
  }

  async enrichMeeting(rawTranscript: string, filename: string): Promise<MeetingEnrichmentResult> {
    const prompt = `You are an executive intelligence assistant. Analyze this raw meeting notes/transcript and extract key structured information.
Return ONLY valid JSON matching this schema:
{
  "title": "Clear concise meeting title",
  "date": "YYYY-MM-DD",
  "account": "Client or company name if mentioned, or null",
  "attendees": ["Person 1", "Person 2"],
  "summary": "3-4 sentence high-level executive summary",
  "keyDecisions": ["Decision 1", "Decision 2"],
  "actionItems": ["Action item 1 (@Owner)", "Action item 2"],
  "tags": ["meeting", "relevant-topic"]
}

Source Content:
${rawTranscript}`;

    const response = await this.queryAI(prompt);
    return this.parseJSONResponse(response, filename);
  }

  private async queryAI(prompt: string): Promise<string> {
    switch (this.settings.aiProvider) {
      case 'gemini':
        return this.queryGemini(prompt);
      case 'claude':
        return this.queryClaude(prompt);
      case 'openai':
        return this.queryOpenAI(prompt);
      case 'ollama':
        return this.queryOllama(prompt);
      default:
        throw new Error(`Unsupported AI provider: ${this.settings.aiProvider}`);
    }
  }

  private parseJSONResponse(raw: string, fallbackTitle: string): MeetingEnrichmentResult {
    try {
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned) as Record<string, unknown>;
      return {
        title: typeof parsed.title === 'string' ? parsed.title : fallbackTitle.replace(/\.md$/, ''),
        date: typeof parsed.date === 'string' ? parsed.date : new Date().toISOString().slice(0, 10),
        account: typeof parsed.account === 'string' ? parsed.account : undefined,
        attendees: Array.isArray(parsed.attendees) ? (parsed.attendees.filter(a => typeof a === 'string') as string[]) : [],
        summary: typeof parsed.summary === 'string' ? parsed.summary : 'Summary unavailable.',
        actionItems: Array.isArray(parsed.actionItems) ? (parsed.actionItems.filter(a => typeof a === 'string') as string[]) : [],
        keyDecisions: Array.isArray(parsed.keyDecisions) ? (parsed.keyDecisions.filter(d => typeof d === 'string') as string[]) : [],
        tags: Array.isArray(parsed.tags) ? (parsed.tags.filter(t => typeof t === 'string') as string[]) : ['meeting'],
      };
    } catch {
      return {
        title: fallbackTitle.replace(/\.md$/, ''),
        date: new Date().toISOString().slice(0, 10),
        attendees: [],
        summary: raw,
        actionItems: [],
        keyDecisions: [],
        tags: ['meeting'],
      };
    }
  }

  private async queryGemini(prompt: string): Promise<string> {
    const apiKey = this.settings.geminiApiKey.trim();
    if (!apiKey) {
      throw new Error('Gemini API key is not configured in VaultFlow settings.');
    }
    const model = this.settings.geminiModel || 'gemini-1.5-flash';
    const res = await requestUrl({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
    if (res.status !== 200) throw new Error(`Gemini Error (${res.status}): ${res.text}`);
    const data = res.json as GeminiResponse;
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  }

  private async queryClaude(prompt: string): Promise<string> {
    const apiKey = this.settings.claudeApiKey.trim();
    if (!apiKey) {
      throw new Error('Claude API key is not configured in VaultFlow settings.');
    }
    const model = this.settings.claudeModel || 'claude-3-5-sonnet-20241022';
    const res = await requestUrl({
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (res.status !== 200) throw new Error(`Claude Error (${res.status}): ${res.text}`);
    const data = res.json as ClaudeResponse;
    const textPart = data.content?.find(p => p.type === 'text');
    return textPart?.text?.trim() || '';
  }

  private async queryOpenAI(prompt: string): Promise<string> {
    const apiKey = this.settings.openaiApiKey.trim();
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured in VaultFlow settings.');
    }
    const model = this.settings.openaiModel || 'gpt-4o-mini';
    const res = await requestUrl({
      url: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (res.status !== 200) throw new Error(`OpenAI Error (${res.status}): ${res.text}`);
    const data = res.json as OpenAIResponse;
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  private async queryOllama(prompt: string): Promise<string> {
    const endpoint = (this.settings.ollamaEndpoint || 'http://localhost:11434').replace(/\/+$/, '');
    const model = this.settings.ollamaModel || 'llama3';
    const res = await requestUrl({
      url: `${endpoint}/api/generate`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
    });
    if (res.status !== 200) throw new Error(`Ollama Error (${res.status}): ${res.text}`);
    const data = res.json as OllamaResponse;
    return data.response?.trim() || '';
  }
}
