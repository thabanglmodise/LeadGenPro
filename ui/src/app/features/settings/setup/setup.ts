import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { ConfigService } from '../../../core/services/config.service';

@Component({
  selector: 'app-setup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './setup.html',
})
export class SetupComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  protected readonly config = inject(ConfigService);
  private readonly http = inject(HttpClient);

  readonly form = this.fb.group({
    gp_key: [''],
    cl_key: [''],
    gm_email: [''],
  });

  readonly saving = signal(false);
  readonly testingGoogle = signal(false);
  readonly testingClaude = signal(false);
  readonly googleStatus = signal('');
  readonly claudeStatus = signal('');

  async ngOnInit() {
    const userId = this.auth.user()?.id;
    if (userId) {
      await this.config.load(userId);
      const cfg = this.config.config();
      if (cfg) {
        this.form.patchValue({ gp_key: cfg.gp_key, cl_key: cfg.cl_key, gm_email: cfg.gm_email });
      }
    }
  }

  async save() {
    const userId = this.auth.user()?.id;
    if (!userId) return;
    this.saving.set(true);
    await this.config.save({
      gp_key: this.form.value.gp_key ?? '',
      cl_key: this.form.value.cl_key ?? '',
      gm_email: this.form.value.gm_email ?? '',
    }, userId);
    this.saving.set(false);
  }

  testGoogle() {
    const key = this.form.value.gp_key;
    if (!key) { this.googleStatus.set('❌ No key entered'); return; }
    this.testingGoogle.set(true);
    this.googleStatus.set('');
    const query = encodeURIComponent('coffee shop in New York');
    const target = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${key}`;
    this.http.get<{ status: string }>(`https://corsproxy.io/?${encodeURIComponent(target)}`).subscribe({
      next: (res) => {
        this.googleStatus.set(res.status === 'OK' || res.status === 'ZERO_RESULTS' ? '✓ Connected' : `❌ ${res.status}`);
        this.testingGoogle.set(false);
      },
      error: () => { this.googleStatus.set('❌ Request failed'); this.testingGoogle.set(false); },
    });
  }

  testClaude() {
    const key = this.form.value.cl_key;
    if (!key) { this.claudeStatus.set('❌ No key entered'); return; }
    this.testingClaude.set(true);
    this.claudeStatus.set('');
    this.http.post<{ content: { text: string }[] }>(
      'https://api.anthropic.com/v1/messages',
      { model: 'claude-haiku-4-5-20251001', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] },
      { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' } }
    ).subscribe({
      next: () => { this.claudeStatus.set('✓ Connected'); this.testingClaude.set(false); },
      error: () => { this.claudeStatus.set('❌ Invalid key'); this.testingClaude.set(false); },
    });
  }
}
