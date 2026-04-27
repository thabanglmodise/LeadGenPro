import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './profile.html',
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  protected readonly profileService = inject(ProfileService);

  readonly form = this.fb.group({
    biz_name: [''],
    full_name: [''],
    role: [''],
    offering: [''],
    benefits: [''],
    website: [''],
    phone: [''],
  });

  readonly saving = signal(false);
  readonly saved = signal(false);

  readonly formValues = toSignal(this.form.valueChanges, { initialValue: this.form.value });
  readonly signature = computed(() => {
    const v = this.formValues();
    if (!v.full_name && !v.biz_name) return '';
    return `Best regards,\n${v.full_name || ''}\n${v.role || ''}\n${v.biz_name || ''}\n${v.website || ''}\n${v.phone || ''}`.trim();
  });

  async ngOnInit() {
    const userId = this.auth.user()?.id;
    if (!userId) return;
    await this.profileService.load(userId);
    const p = this.profileService.profile();
    if (p) {
      this.form.patchValue({
        biz_name: p.biz_name,
        full_name: p.full_name,
        role: p.role,
        offering: p.offering,
        benefits: p.benefits,
        website: p.website,
        phone: p.phone,
      });
    }
  }

  async save() {
    const userId = this.auth.user()?.id;
    if (!userId) return;
    this.saving.set(true);
    this.saved.set(false);
    await this.profileService.save(this.form.value as any, userId);
    this.saving.set(false);
    this.saved.set(true);
  }
}
