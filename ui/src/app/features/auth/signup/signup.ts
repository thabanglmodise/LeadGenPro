import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

function confirmPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.parent?.get('password')?.value;
  return control.value === password ? null : { mismatch: true };
}

@Component({
  selector: 'app-signup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup.html',
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, confirmPasswordValidator]],
  });

  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal(false);

  async onSubmit() {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.value;
    const { error } = await this.auth.signUp(email!, password!);
    if (error) {
      this.error.set(error.message);
      this.loading.set(false);
    } else {
      this.success.set(true);
    }
  }
}
