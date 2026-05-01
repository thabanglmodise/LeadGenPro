import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { ComposeComponent } from './compose';
import { AuthService } from '../../core/services/auth.service';
import { LeadsService } from '../../core/services/leads.service';
import { ProfileService } from '../../core/services/profile.service';
import { ConfigService } from '../../core/services/config.service';
import { ClaudeService } from '../../core/services/claude.service';
import { EmailService } from '../../core/services/email.service';
import { ActivityService } from '../../core/services/activity.service';

function setup() {
  TestBed.configureTestingModule({
    imports: [ReactiveFormsModule],
    providers: [
      { provide: AuthService, useValue: { user: signal(null), tier: signal('basic'), role: signal(null) } },
      { provide: LeadsService, useValue: { leads: signal([]), totalLeads: signal(0), loadLeads: vi.fn(), updateLead: vi.fn() } },
      { provide: ProfileService, useValue: { load: vi.fn(), profile: signal(null) } },
      { provide: ConfigService, useValue: { load: vi.fn(), hasGoogleKey: signal(false), hasClaudeKey: signal(false), gmEmail: signal('') } },
      { provide: ClaudeService, useValue: {} },
      { provide: EmailService, useValue: { logSent: vi.fn() } },
      { provide: ActivityService, useValue: { add: vi.fn() } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
    ],
  });
  const _fixture = TestBed.createComponent(ComposeComponent);
  return _fixture;
}

describe('ComposeComponent', () => {
  describe('send buttons — smtpConfigured=false', () => {
    it('does not render "Send via SMTP" button', () => {
      const _fixture = setup();
      _fixture.componentInstance.smtpConfigured.set(false);
      _fixture.detectChanges();
      expect(_fixture.nativeElement.querySelector('.compose__send-btn--smtp')).toBeNull();
    });

    it('always renders "Copy to clipboard" button', () => {
      const _fixture = setup();
      _fixture.componentInstance.smtpConfigured.set(false);
      _fixture.detectChanges();
      expect(_fixture.nativeElement.textContent).toContain('Copy to clipboard');
    });

    it('always renders "Open in mail app" button', () => {
      const _fixture = setup();
      _fixture.componentInstance.smtpConfigured.set(false);
      _fixture.detectChanges();
      expect(_fixture.nativeElement.textContent).toContain('Open in mail app');
    });
  });

  describe('send buttons — smtpConfigured=true', () => {
    it('renders "Send via SMTP" button when smtpConfigured is true', () => {
      const _fixture = setup();
      _fixture.componentInstance.smtpConfigured.set(true);
      _fixture.detectChanges();
      expect(_fixture.nativeElement.querySelector('.compose__send-btn--smtp')).toBeTruthy();
    });

    it('still renders copy and mailto buttons when SMTP is configured', () => {
      const _fixture = setup();
      _fixture.componentInstance.smtpConfigured.set(true);
      _fixture.detectChanges();
      const _text: string = _fixture.nativeElement.textContent;
      expect(_text).toContain('Copy to clipboard');
      expect(_text).toContain('Open in mail app');
    });
  });
});
