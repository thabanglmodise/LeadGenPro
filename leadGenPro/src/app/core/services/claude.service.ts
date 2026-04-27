import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Lead } from '../models/lead.model';

interface ScoreResult {
  id: string;
  score: 'hot' | 'warm' | 'cold';
  reason: string;
}

interface EmailDraftParams {
  lead: Lead;
  senderName: string;
  senderRole: string;
  offering: string;
  benefits: string;
  tone: string;
  template: string;
}

interface AnthropicResponse {
  content: { text: string }[];
  error?: { message: string };
}

@Injectable({ providedIn: 'root' })
export class ClaudeService {
  private readonly http = inject(HttpClient);

  scoreBatch(leads: Lead[], offering: string, apiKey: string): Observable<ScoreResult[]> {
    const prompt = buildScoringPrompt(leads, offering);
    return this.callClaude(prompt, 400, apiKey).pipe(
      map(text => JSON.parse(text.replace(/```json|```/g, '').trim()) as ScoreResult[])
    );
  }

  draftEmail(params: EmailDraftParams, apiKey: string): Observable<{ subject: string; body: string }> {
    const prompt = buildEmailPrompt(params);
    return this.callClaude(prompt, 700, apiKey).pipe(
      map(text => {
        const subjMatch = text.match(/SUBJECT:\s*(.+)/);
        const bodyMatch = text.match(/BODY:\s*([\s\S]+)/);
        return {
          subject: subjMatch?.[1]?.trim() ?? 'A quick introduction',
          body: bodyMatch?.[1]?.trim() ?? text,
        };
      })
    );
  }

  private callClaude(prompt: string, maxTokens: number, apiKey: string): Observable<string> {
    return this.http.post<AnthropicResponse>(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
    ).pipe(
      map(res => {
        if (res.error) throw new Error(res.error.message);
        return res.content[0].text;
      })
    );
  }
}

function buildScoringPrompt(leads: Lead[], offering: string): string {
  const list = leads.map(l => `- id: ${l.id}, name: "${l.name}", type: "${l.type}", rating: ${l.rating ?? 'N/A'}`).join('\n');
  return `You are a B2B lead scoring assistant. Score these businesses for the offering: "${offering}".

Businesses:
${list}

Return ONLY a JSON array (no markdown) in this exact format:
[{"id":"<id>","score":"hot"|"warm"|"cold","reason":"<1 sentence>"}]`;
}

function buildEmailPrompt(params: EmailDraftParams): string {
  return `Write a cold outreach email with tone: ${params.tone}, template: ${params.template}.

Sender: ${params.senderName}, ${params.senderRole}
Offering: ${params.offering}
Benefits: ${params.benefits}
Prospect company: ${params.lead.name} (${params.lead.type}, ${params.lead.city})

Return in this exact format:
SUBJECT: <subject line>
BODY: <email body>`;
}
