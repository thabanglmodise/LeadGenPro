import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { resolveKey } from '../lib/resolve-key.js';

const LeadInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().optional().default(''),
  rating: z.number().nullable().optional(),
  city: z.string().optional().default(''),
  offering: z.string().optional().default(''),
});

const EmailDraftSchema = z.object({
  leadName: z.string(),
  contactName: z.string(),
  website: z.string(),
  tone: z.string(),
  template: z.string(),
  senderName: z.string(),
  senderBiz: z.string(),
  offering: z.string(),
});

export const aiRouter = router({
  score: protectedProcedure
    .input(z.object({ leads: z.array(LeadInputSchema), offering: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const clKey = await resolveKey(ctx.db, ctx.user.id, 'cl');
      const prompt = buildScoringPrompt(input.leads, input.offering);
      const text = await callClaude(prompt, 400, clKey);
      try {
        return JSON.parse(text.replace(/```json|```/g, '').trim()) as Array<{
          id: string;
          score: 'hot' | 'warm' | 'cold';
          reason: string;
        }>;
      } catch {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Claude returned invalid JSON for scoring' });
      }
    }),

  draft: protectedProcedure
    .input(EmailDraftSchema)
    .mutation(async ({ ctx, input }) => {
      const clKey = await resolveKey(ctx.db, ctx.user.id, 'cl');
      const prompt = buildEmailPrompt(input);
      const text = await callClaude(prompt, 700, clKey);
      const subjMatch = text.match(/SUBJECT:\s*(.+)/);
      const bodyMatch = text.match(/BODY:\s*([\s\S]+)/);
      return {
        subject: subjMatch?.[1]?.trim() ?? 'A quick introduction',
        body: bodyMatch?.[1]?.trim() ?? text,
      };
    }),
});

async function callClaude(prompt: string, maxTokens: number, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json() as { content?: Array<{ text: string }>; error?: { message: string } };
  if (data.error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: data.error.message });
  return data.content![0].text;
}

function buildScoringPrompt(leads: z.infer<typeof LeadInputSchema>[], offering: string): string {
  const list = leads
    .map(l => `ID:${l.id} | ${l.name} | Type:${l.type} | Rating:${l.rating ?? 'N/A'} | City:${l.city}`)
    .join('\n');
  return `Score these leads for someone selling "${offering}". Return ONLY a JSON array with no markdown, each item: {"id":"...","score":"hot"|"warm"|"cold","reason":"one sentence"}\n\n${list}`;
}

function buildEmailPrompt(p: z.infer<typeof EmailDraftSchema>): string {
  return `Write a cold outreach email for the following context:
- Sender: ${p.senderName} at ${p.senderBiz}
- Offering: ${p.offering}
- Prospect company: ${p.leadName}
- Contact name: ${p.contactName || 'the decision maker'}
- Their website: ${p.website || 'unknown'}
- Tone: ${p.tone}
- Template style: ${p.template}

Format your response exactly as:
SUBJECT: [subject line]
BODY: [email body]`;
}
