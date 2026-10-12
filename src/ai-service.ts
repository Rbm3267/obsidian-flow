import { requestUrl } from 'obsidian';
import { ObsidianFlowSettings, MeetingEnrichmentResult } from './types';

export class AIService {
  constructor(private settings: ObsidianFlowSettings) {}

  updateSettings(settings: ObsidianFlowSettings) {
    this.settings = settings;
  }

  async synthesizeMeeting(rawText: string, filename: string): Promise<MeetingEnrichmentResult> {
    const prompt = `You are ObsidianFlow, an intelligent executive meeting assistant.
Analyze the following meeting transcript/notes and extract structured intelligence in valid JSON format.

Meeting Source: ${filename}
Meeting Notes/Transcript:
${rawText}

Return ONLY a valid JSON object with EXACTLY this structure (no markdown fences, no explanatory text):
{
  "title": "Concise Descriptive Title",
  "date": "YYYY-MM-DD",
  "account": "Client/Account/Project Name if mentioned, or null",
  "attendees": ["Full Name 1", "Full Name 2"],
  "summary": "2-3 paragraph executive summary of the discussion",
  "actionItems": ["Action item 1 with owner if specified", "Action item 2"],
  "keyDecisions": ["Key strategic decision 1", "Key decision 2"],
  "tags": ["meeting", "relevant-topic-tag"]
}`;

    const response = await this.queryAI(prompt);
    return this.parseJSONResponse(response, filename);
  }

  async queryAI(prompt: string): Promise<string> {
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
      const parsed = JSON.parse(cleaned);
      return {
        title: parsed.title || fallbackTitle.replace(/\.md$/, ''),
        date: parsed.date || new Date().toISOString().slice(0, 10),
        account: parsed.account || undefined,
        attendees: Array.isArray(parsed.attendees) ? parsed.attendees : [],
        summary: parsed.summary || 'Summary unavailable.',
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags : ['meeting'],
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
      throw new Error('Gemini API key is not configured in ObsidianFlow settings.');
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
    return res.json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  }

  private async queryClaude(prompt: string): Promise<string> {
    const apiKey = this.settings.claudeApiKey.trim();
    if (!apiKey) {
      throw new Error('Claude API key is not configured in ObsidianFlow settings.');
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
    const textPart = res.json.content?.find((p: { type: string; text?: string }) => p.type === 'text');
    return textPart?.text?.trim() || '';
  }

  private async queryOpenAI(prompt: string): Promise<string> {
    const apiKey = this.settings.openaiApiKey.trim();
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured in ObsidianFlow settings.');
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
    return res.json.choices?.[0]?.message?.content?.trim() || '';
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
    return res.json.response?.trim() || '';
  }
}
