import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: '', redirectTo: 'tree', pathMatch: 'full' },
	{
		path: 'tree',
		loadComponent: () =>
			import(
				'./ui/pages/branch-display-container/branch-display-container.component'
			).then((m) => m.AppTreeContainer),
		canActivate: [],
	},
	{ path: '**', redirectTo: 'tree' },
];
