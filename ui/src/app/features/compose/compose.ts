import {
  ChangeDetectionStrategy, Component, OnInit, inject, signal
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Lead } from '../../core/models/lead.model';
import { ActivityService } from '../../core/services/activity.service';
import { AuthService } from '../../core/services/auth.service';
import { ClaudeService } from '../../core/services/claude.service';
import { ConfigService } from '../../core/services/config.service';
import { EmailService } from '../../core/services/email.service';
import { LeadsService } from '../../core/services/leads.service';
import { ProfileService } from '../../core/services/profile.service';
import { trpc } from '../../core/trpc.client';

const FALLBACK_SUBJECT = 'Quick introduction from {senderName}';
const FALLBACK_BODY = `Hi {contactName},

I wanted to reach out about {company}. We offer {offering} that could help your business.

Would you be open to a quick call?

Best,
{senderName}`;

@Component({
  selector: 'app-compose',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './compose.html',
})
export class ComposeComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  protected readonly leadsService = inject(LeadsService);
  protected readonly config = inject(ConfigService);
  private readonly profile = inject(ProfileService);
  private readonly claude = inject(ClaudeService);
  private readonly emailService = inject(EmailService);
  private readonly activityService = inject(ActivityService);
  private readonly auth = inject(AuthService);

  readonly form = this.fb.group({
    leadId: [''],
    contactName: [''],
    jobTitle: [''],
    company: [''],
    website: [''],
    tone: ['Professional'],
    template: ['Cold Intro'],
    to: [''],
    from: [''],
    subject: [''],
    body: [''],
  });

  readonly drafting = signal(false);
  readonly sending = signal(false);
  readonly error = signal('');
  readonly sent = signal(false);
  readonly smtpConfigured = signal(false);

  readonly tones = ['Professional', 'Friendly', 'Consultative', 'Urgent'];
  readonly templates = ['Cold Intro', 'Value Prop', 'Problem-Solution', 'Follow-Up'];

  async ngOnInit() {
    if (!this.auth.user()?.id) return;
    await Promise.all([
      this.leadsService.loadLeads(),
      this.config.load(),
      this.profile.load(),
    ]);
    this.form.patchValue({ from: this.config.gmEmail() });
    const _status = await trpc.userApiKeys.load.query();
    this.smtpConfigured.set(_status.has_smtp);
    const _leadId = this.route.snapshot.queryParamMap.get('leadId');
    if (_leadId) {
      this.form.patchValue({ leadId: _leadId });
      this.onLeadSelect(_leadId);
    }
  }

  onLeadSelect(id: string) {
    const _lead = this.leadsService.leads().find((l: Lead) => l.id === id);
    if (!_lead) return;
    this.form.patchValue({
      contactName: _lead.contact_name,
      company: _lead.name,
      website: _lead.website,
      to: _lead.contact_email,
    });
  }

  async draftEmail() {
    if (!this.config.hasClaudeKey()) {
      this.applyFallback();
      return;
    }
    const _leadId = this.form.value.leadId;
    const _lead = this.leadsService.leads().find((l: Lead) => l.id === _leadId);
    if (!_lead) { this.applyFallback(); return; }

    this.drafting.set(true);
    const _p = this.profile.profile();
    this.claude.draftEmail({
      lead: _lead,
      senderName: _p?.full_name ?? '',
      senderRole: _p?.role ?? '',
      offering: _p?.offering ?? '',
      benefits: _p?.benefits ?? '',
      tone: this.form.value.tone ?? 'Professional',
      template: this.form.value.template ?? 'Cold Intro',
    }).subscribe({
      next: (draft) => {
        this.form.patchValue({ subject: draft.subject, body: draft.body });
        this.drafting.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.applyFallback();
        this.drafting.set(false);
      },
    });
  }

  private applyFallback() {
    const _v = this.form.value;
    const _p = this.profile.profile();
    this.form.patchValue({
      subject: FALLBACK_SUBJECT.replace('{senderName}', _p?.full_name ?? 'us'),
      body: FALLBACK_BODY
        .replace('{contactName}', _v.contactName || 'there')
        .replace('{company}', _v.company || 'your company')
        .replace('{offering}', _p?.offering || 'our services')
        .replace('{senderName}', _p?.full_name || 'the team'),
    });
  }

  async sendViaSMTP() {
    const _v = this.form.value;
    if (!_v.to || !_v.subject || !_v.body) {
      this.error.set('TO, SUBJECT, and body are required.');
      return;
    }
    this.sending.set(true);
    this.error.set('');
    try {
      await trpc.email.sendSmtp.mutate({
        to_email: _v.to!,
        subject: _v.subject!,
        body: _v.body!,
      });
      if (_v.leadId) {
        await this.leadsService.updateLead(_v.leadId!, { status: 'contacted' });
        await this.activityService.add(`Email sent (SMTP) to ${_v.to} (${_v.company})`);
      }
      this.sent.set(true);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Send failed');
    } finally {
      this.sending.set(false);
    }
  }

  async copyToClipboard() {
    const _v = this.form.value;
    const _text = `Subject: ${_v.subject ?? ''}\n\n${_v.body ?? ''}`;
    await navigator.clipboard.writeText(_text);
    await this.emailService.logSent(_v.to ?? '', _v.subject ?? '', _v.body ?? '', 'clipboard');
    if (_v.leadId) {
      await this.leadsService.updateLead(_v.leadId!, { status: 'contacted' });
    }
    this.sent.set(true);
  }

  openMailto() {
    const _v = this.form.value;
    const _url = `mailto:${encodeURIComponent(_v.to ?? '')}?subject=${encodeURIComponent(_v.subject ?? '')}&body=${encodeURIComponent(_v.body ?? '')}`;
    window.open(_url, '_blank');
    this.emailService.logSent(_v.to ?? '', _v.subject ?? '', _v.body ?? '', 'mailto');
    if (_v.leadId) {
      this.leadsService.updateLead(_v.leadId!, { status: 'contacted' });
    }
    this.sent.set(true);
  }
}
