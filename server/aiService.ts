import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';

export interface AISegment {
  start: number;
  end: number;
  title: string;
  hook: string;
  reason: string;
  aiHookScore: number; // Renamed from retentionScore to clearly denote AI estimation
  tags: string[];
}

export interface AIAnalysisResult {
  title: string;
  summary: string;
  keyTopics: string[];
  suggestedClips: AISegment[];
}

export interface GeneratedHookResult {
  id: string;
  style: string;
  hookText: string;
  aiHookScore: number;
  characterCount: number;
}

export class GeminiAIService {
  private readonly MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

  private getClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in server environment.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-creatorai-build',
        },
      },
    });
  }

  private async generateWithFallback(ai: GoogleGenAI, params: any) {
    let lastError: any;
    for (const model of this.MODELS) {
      try {
        return await ai.models.generateContent({
          ...params,
          model,
        });
      } catch (err: any) {
        lastError = err;
        if (err.status === 503 || err.status === 429 || String(err).includes('429') || String(err).includes('503') || String(err).includes('RESOURCE_EXHAUSTED')) {
          console.warn(`Model ${model} returned ${err.status || 'rate-limit'}, falling back to next available model...`);
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  /**
   * Transcribe extracted audio file using Gemini audio model
   */
  public async transcribeAudio(audioFilePath: string): Promise<string> {
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    try {
      const ai = this.getClient();
      const audioBuffer = fs.readFileSync(audioFilePath);
      const base64Audio = audioBuffer.toString('base64');

      const response = await this.generateWithFallback(ai, {
        contents: [
          {
            inlineData: {
              mimeType: 'audio/mp3',
              data: base64Audio,
            },
          },
          {
            text: 'Transcribe this spoken dialogue verbatim. Include approximate speaker cues (e.g. Speaker 1, Speaker 2) and timestamps if detectable. Output clean paragraphs.',
          },
        ],
      });

      return response.text?.trim() || 'No audible dialogue detected.';
    } catch (err: any) {
      console.error('Gemini audio transcription error:', err);
      throw new Error(`Gemini transcription failed: ${err.message}`);
    }
  }

  /**
   * Deep analysis of video content & transcript for high-impact segments
   */
  public async analyzeContent(options: {
    videoTitle: string;
    duration: number;
    transcript?: string;
  }): Promise<AIAnalysisResult> {
    const duration = Math.max(10, options.duration || 30);
    const title = options.videoTitle || 'Uploaded Video';
    const transcriptText = options.transcript?.trim() || 'General discussion regarding content creation and audience engagement.';

    try {
      const ai = this.getClient();
      const prompt = `You are an expert video content strategist.
Analyze this video:
- Title: "${title}"
- Duration: ${duration.toFixed(1)} seconds
- Transcript / Outline:
"""${transcriptText}"""

Suggest 3 to 4 viral video clips from this timeline.
Requirements:
1. start: must be a number >= 0 and < ${duration.toFixed(1)}
2. end: must be a number > start and <= ${duration.toFixed(1)} (clip length between 5 and 60 seconds)
3. title: punchy, compelling title
4. hook: provocative first 3 seconds opening statement
5. reason: psychological reason this hook works
6. aiHookScore: integer between 70 and 99 (AI Estimated Hook Strength)
7. tags: array of 2 to 4 hashtag style keywords

Return strictly valid JSON with this exact structure:
{
  "title": "${title}",
  "summary": "Brief summary of the video content",
  "keyTopics": ["topic 1", "topic 2"],
  "suggestedClips": [
    {
      "start": 0.0,
      "end": 15.0,
      "title": "Clip Title",
      "hook": "Opening hook line",
      "reason": "Why it grabs attention",
      "aiHookScore": 88,
      "tags": ["AI", "Creators"]
    }
  ]
}`;

      const response = await this.generateWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Compelling title for the video',
              },
              summary: {
                type: Type.STRING,
                description: 'Brief summary of the video content',
              },
              keyTopics: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Key themes or topics in the video',
              },
              suggestedClips: {
                type: Type.ARRAY,
                description: 'Suggested viral short-form clips extracted from the timeline',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    start: {
                      type: Type.NUMBER,
                      description: 'Start timestamp in seconds',
                    },
                    end: {
                      type: Type.NUMBER,
                      description: 'End timestamp in seconds',
                    },
                    title: {
                      type: Type.STRING,
                      description: 'Punchy clip title',
                    },
                    hook: {
                      type: Type.STRING,
                      description: 'Opening hook statement',
                    },
                    reason: {
                      type: Type.STRING,
                      description: 'Why this hook captures viewer attention',
                    },
                    aiHookScore: {
                      type: Type.INTEGER,
                      description: 'Estimated hook strength from 70 to 99',
                    },
                    tags: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: '2 to 4 hashtag style keywords',
                    },
                  },
                  required: ['start', 'end', 'title', 'hook', 'reason', 'aiHookScore', 'tags'],
                },
              },
            },
            required: ['title', 'summary', 'keyTopics', 'suggestedClips'],
          },
        },
      });

      const rawText = response.text || '';
      console.log(`[Gemini] Raw analyzeContent response length: ${rawText.length}`);

      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch (firstErr: any) {
        // Strip Markdown code fences if present (```json ... ``` or ``` ... ```)
        const trimmed = rawText.trim();
        let stripped = trimmed;
        if (stripped.startsWith('```')) {
          stripped = stripped.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
        }
        try {
          parsed = JSON.parse(stripped);
        } catch (secondErr: any) {
          console.error('[Gemini] JSON parsing error:', secondErr.message);
          console.error('[Gemini] Raw response snippet:', rawText.slice(0, 1000));
          throw new Error(`AI content analysis returned invalid JSON: ${secondErr.message}`);
        }
      }

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('AI content analysis returned an empty or invalid payload structure.');
      }

      const clips: AISegment[] = (parsed.suggestedClips || []).map((c: any) => ({
        start: Math.max(0, Math.min(duration - 2, parseFloat(c.start) || 0)),
        end: Math.max(parseFloat(c.start) + 2, Math.min(duration, parseFloat(c.end) || duration)),
        title: String(c.title || 'Key Moment'),
        hook: String(c.hook || ''),
        reason: String(c.reason || 'High emotional resonance'),
        aiHookScore: Math.min(99, Math.max(60, parseInt(c.aiHookScore || c.retentionScore || '85', 10))),
        tags: Array.isArray(c.tags) ? c.tags.map(String) : ['Viral', 'Shorts'],
      }));

      return {
        title: parsed.title || title,
        summary: parsed.summary || 'Video content analysis complete.',
        keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : ['Content Strategy'],
        suggestedClips: clips.length > 0 ? clips : this.generateSafeSegments(duration),
      };
    } catch (err: any) {
      console.error('Gemini content analysis error:', err);
      throw new Error(`AI content analysis failed: ${err.message}`);
    }
  }

  /**
   * AI Hook Generation
   */
  public async generateHooks(options: {
    clipTitle: string;
    transcriptSnippet?: string;
    tone?: string;
    count?: number;
  }): Promise<GeneratedHookResult[]> {
    const tone = options.tone || 'contrarian';
    const clipTitle = options.clipTitle || 'Video Clip';
    const count = options.count || 4;

    try {
      const ai = this.getClient();
      const prompt = `You are a world-class viral short-form copywriter.
Generate ${count} distinct, scroll-stopping hooks for this video clip:
Clip Topic: "${clipTitle}"
Snippet / Context: "${options.transcriptSnippet || 'The biggest secret to high-performing creator workflows'}"
Target Tone: ${tone}

Styles to produce:
1. Contrarian Premise (challenges an accepted industry myth)
2. Negative Framing / Loss Aversion (fear of being left behind)
3. The Curious Case / Mystery Gap (unresolved paradox)
4. Direct Bold Action / Hard Truth

Return strictly JSON array:
[
  {
    "style": "Contrarian Premise",
    "hookText": "Opening 1-2 sentence hook designed for immediate pause",
    "aiHookScore": 92
  }
]`;

      const response = await this.generateWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '[]');
      return parsed.map((item: any, idx: number) => ({
        id: `hook-${Date.now()}-${idx}`,
        style: String(item.style || 'Viral Hook'),
        hookText: String(item.hookText || '').trim(),
        aiHookScore: Math.min(99, Math.max(65, parseInt(item.aiHookScore || '88', 10))),
        characterCount: String(item.hookText || '').length,
      }));
    } catch (err: any) {
      console.error('Gemini hook generation error:', err);
      throw new Error(`AI hook generation failed: ${err.message}`);
    }
  }

  /**
   * Regenerate a single hook with a specific angle
   */
  public async regenerateSingleHook(options: {
    clipTitle: string;
    style: string;
    tone?: string;
  }): Promise<GeneratedHookResult> {
    const hooks = await this.generateHooks({
      clipTitle: options.clipTitle,
      tone: options.tone || 'contrarian',
      count: 1,
    });
    return hooks[0];
  }

  /**
   * AI Caption Generation for specific social platforms
   */
  public async generateCaptions(options: {
    clipTitle: string;
    platform: string;
    tone?: string;
    hook?: string;
  }): Promise<{ caption: string; hashtags: string[] }> {
    const platform = options.platform || 'linkedin';
    const hook = options.hook || '';
    const clipTitle = options.clipTitle || 'Video Clip';

    try {
      const ai = this.getClient();
      const prompt = `Write a high-converting social media caption for ${platform.toUpperCase()}.
Clip Title: "${clipTitle}"
Primary Hook: "${hook}"
Tone: ${options.tone || 'authoritative'}

Platform Requirements:
- If TikTok/Reels: punchy, under 30 words, 3-5 trending hashtags.
- If LinkedIn: professional storytelling, line breaks between thoughts, 3 relevant industry tags.
- If YouTube Shorts: search-optimized summary, 3 hashtags including #Shorts.
- If X/Twitter: concise hook-first tweet under 250 characters.

Return strictly JSON:
{
  "caption": "Full formatted caption text with appropriate emojis and linebreaks",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}`;

      const response = await this.generateWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return {
        caption: parsed.caption || hook,
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : ['#CreatorAi', '#VideoProduction'],
      };
    } catch (err: any) {
      console.error('Gemini caption generation error:', err);
      throw new Error(`AI caption generation failed: ${err.message}`);
    }
  }

  private generateSafeSegments(duration: number): AISegment[] {
    const segmentLength = Math.max(5, Math.min(20, Math.floor(duration / 3)));
    return [
      {
        start: 0,
        end: Math.min(duration, segmentLength),
        title: 'Core Thesis Introduction',
        hook: 'What 99% of creators get completely wrong from day one.',
        reason: 'Immediate hook addresses common misconception',
        aiHookScore: 92,
        tags: ['Strategy', 'Foundations'],
      },
      {
        start: Math.min(duration - 2, segmentLength),
        end: Math.min(duration, segmentLength * 2),
        title: 'The Breakthrough Moment',
        hook: 'This one subtle shift changed our entire distribution engine.',
        reason: 'Curiosity gap drives middle-duration engagement',
        aiHookScore: 89,
        tags: ['Tactics', 'Growth'],
      },
    ];
  }
}

export const aiService = new GeminiAIService();
