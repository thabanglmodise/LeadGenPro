import { TestBed } from '@angular/core/testing';
import { SkeletonComponent } from './skeleton';

describe('SkeletonComponent', () => {
  it('defaults to text variant, hidden from a11y tree', () => {
    const _fixture = TestBed.createComponent(SkeletonComponent);
    _fixture.detectChanges();
    const _el: HTMLElement = _fixture.nativeElement;
    expect(_el.classList).toContain('skeleton');
    expect(_el.classList).toContain('skeleton--text');
    expect(_el.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies variant + size inputs', () => {
    const _fixture = TestBed.createComponent(SkeletonComponent);
    _fixture.componentRef.setInput('variant', 'stat');
    _fixture.componentRef.setInput('width', '60%');
    _fixture.componentRef.setInput('height', '20px');
    _fixture.detectChanges();
    const _el: HTMLElement = _fixture.nativeElement;
    expect(_el.classList).toContain('skeleton--stat');
    expect(_el.style.width).toBe('60%');
    expect(_el.style.height).toBe('20px');
  });
});
