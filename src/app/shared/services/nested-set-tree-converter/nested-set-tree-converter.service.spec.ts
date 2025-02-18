import { TestBed } from '@angular/core/testing';

import { NestedSetTreeConverterService } from './nested-set-tree-converter.service';

describe('NestedSetTreeConverterService', () => {
  let service: NestedSetTreeConverterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NestedSetTreeConverterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
