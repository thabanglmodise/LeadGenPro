import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type SkeletonVariant = 'text' | 'title' | 'stat' | 'block' | 'circle';

// Shimmering placeholder. Host element is the skeleton (styles: .skeleton in styles.css).
// Wrap groups in a container with aria-busy="true" for screen readers.
@Component({
  selector: 'app-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: {
    'aria-hidden': 'true',
    '[class]': 'hostClass()',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
  },
})
export class SkeletonComponent {
  readonly variant = input<SkeletonVariant>('text');
  readonly width = input<string | null>(null);
  readonly height = input<string | null>(null);

  readonly hostClass = computed(() => `skeleton skeleton--${this.variant()}`);
}
