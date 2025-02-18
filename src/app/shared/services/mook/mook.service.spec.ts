import { TestBed } from '@angular/core/testing';

import { MookService } from './mook.service';

describe('MookService', () => {
  let service: MookService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MookService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
