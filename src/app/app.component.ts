import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss',
})
export class AppComponent {
	title = 'nested-tree';
	uniqueId = `help_${Math.random().toString(36).substr(2, 9)}`;
	isChecked = false;
}
