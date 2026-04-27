import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { Lead } from '../models/lead.model';
import { trpc } from '../trpc.client';

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

@Injectable({ providedIn: 'root' })
export class ClaudeService {
  scoreBatch(leads: Lead[], offering: string): Observable<ScoreResult[]> {
    const _leads = leads.map(l => ({
      id: l.id,
      name: l.name,
      type: l.type,
      rating: l.rating,
      city: l.city,
      offering: l.offering,
    }));
    return from(trpc.ai.score.mutate({ leads: _leads, offering }));
  }

  draftEmail(params: EmailDraftParams): Observable<{ subject: string; body: string }> {
    return from(
      trpc.ai.draft.mutate({
        leadName: params.lead.name,
        contactName: params.lead.contact_name ?? '',
        website: params.lead.website ?? '',
        tone: params.tone,
        template: params.template,
        senderName: params.senderName,
        senderBiz: params.offering,
        offering: params.offering,
      }),
    );
  }
}
