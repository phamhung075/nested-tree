import { Injectable } from '@angular/core';
import { NestedSetNode } from '../nested-set-tree-converter/nested-set-tree-converter.service';
import { delay, Observable, of } from 'rxjs';

@Injectable({
	providedIn: 'root',
})
export class MookService {
	private mockNestedSetData: NestedSetNode[] = [
		{
			id: '1739871788910',
			value: 'New Node',
			left: 3,
			right: 4,
			level: 2,
		},
		{
			id: '1739871789124',
			value: 'New Node',
			left: 5,
			right: 6,
			level: 2,
		},
		{
			id: '1739871774918',
			value: 'New Node',
			left: 2,
			right: 7,
			level: 1,
		},
		{
			id: '1739871775837',
			value: 'New Node',
			left: 8,
			right: 9,
			level: 1,
		},
		{
			id: '1',
			value: 'Root',
			left: 1,
			right: 10,
			level: 0,
		},
	];

	getInitialNestedSetData(): Observable<NestedSetNode[]> {
		// Simulate API call with 500ms delay
		return of(this.mockNestedSetData).pipe(delay(500));
	}
}
