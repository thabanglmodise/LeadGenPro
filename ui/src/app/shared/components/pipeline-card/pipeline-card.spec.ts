import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { PipelineCardComponent } from './pipeline-card';
import { Lead, LeadStatus } from '../../../core/models/lead.model';

function makeLead(status: LeadStatus = 'new'): Lead {
  return {
    id: 'lead-1', user_id: 'u-1', name: 'Acme', city: 'Austin', address: '',
    type: 'restaurant', types: [], rating: null, total_ratings: 0, place_id: '',
    website: '', phone: '', contact_name: '', contact_email: '',
    ai_score: null, ai_reason: '', offering: '', status, created_at: '',
  };
}

describe('PipelineCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterModule.forRoot([])],
    });
  });

  it('renders lead name and city', () => {
    const _fixture = TestBed.createComponent(PipelineCardComponent);
    _fixture.componentInstance.lead = makeLead();
    _fixture.detectChanges();
    const _el: HTMLElement = _fixture.nativeElement;
    expect(_el.textContent).toContain('Acme');
    expect(_el.textContent).toContain('Austin');
  });

  it('emits statusChange when a new stage is selected', () => {
    const _fixture = TestBed.createComponent(PipelineCardComponent);
    _fixture.componentInstance.lead = makeLead('new');
    _fixture.detectChanges();

    const _emitted: LeadStatus[] = [];
    _fixture.componentInstance.statusChange.subscribe((s: LeadStatus) => _emitted.push(s));

    _fixture.componentInstance.onStageChange('contacted');
    expect(_emitted).toEqual(['contacted']);
  });

  it('updates displayStatus optimistically on stage change', () => {
    const _fixture = TestBed.createComponent(PipelineCardComponent);
    _fixture.componentInstance.lead = makeLead('new');
    _fixture.detectChanges();

    _fixture.componentInstance.onStageChange('replied');
    expect(_fixture.componentInstance.displayStatus()).toBe('replied');
  });

  it('reverts displayStatus when revertStatus is called', () => {
    const _fixture = TestBed.createComponent(PipelineCardComponent);
    _fixture.componentInstance.lead = makeLead('new');
    _fixture.detectChanges();

    _fixture.componentInstance.onStageChange('converted');
    expect(_fixture.componentInstance.displayStatus()).toBe('converted');

    _fixture.componentInstance.revertStatus('new');
    expect(_fixture.componentInstance.displayStatus()).toBe('new');
  });

  it('shows all four stage options in the select', () => {
    const _fixture = TestBed.createComponent(PipelineCardComponent);
    _fixture.componentInstance.lead = makeLead();
    _fixture.detectChanges();
    const _options = _fixture.nativeElement.querySelectorAll('.pipeline-card__status-select option');
    expect(_options.length).toBe(4);
  });
});
