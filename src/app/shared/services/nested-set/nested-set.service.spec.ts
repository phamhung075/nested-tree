import { TestBed } from '@angular/core/testing';

import { NestedSetService } from './nested-set.service';

describe('NestedSetService', () => {
  let service: NestedSetService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NestedSetService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
