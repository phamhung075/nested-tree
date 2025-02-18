// app-tree.component.ts (Parent component)
import { CommonModule } from '@angular/common';
import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	OnInit,
} from '@angular/core';
import { TreeComponent } from '../../components/branch-display/branch-display.component';
import { TreeNode } from '@shared/interfaces/tree-node.model';
import { TreeService } from '@shared/services/tree/tree.service';
import { mockTreeData } from '../../components/branch-display/mock-data';
import {
	NestedSetNode,
	NestedSetService,
} from '@shared/services/nested-set/nested-set.service';
import { NestedSetTreeConverterService } from '@shared/services/nested-set-tree-converter/nested-set-tree-converter.service';
import { MookService } from '@shared/services/mook/mook.service';
import { finalize, Observable } from 'rxjs';

@Component({
	selector: 'app-tree-container',
	standalone: true,
	imports: [TreeComponent, CommonModule],
	templateUrl: './branch-display-container.component.html',
	styleUrls: ['./branch-display-container.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppTreeContainer implements OnInit {
	treeData$: Observable<TreeNode | null>;
	nestedSetData$: Observable<NestedSetNode[]>;
	dropListIds: string[] = [];
	validationErrors: string[] = [];
	isLoading = false;
	error: string | null = null;

	constructor(
		private mookService: MookService,
		private treeService: TreeService,
		private nestedSetService: NestedSetService,
		private nestedSetConverter: NestedSetTreeConverterService,
		private changeDetectorRef: ChangeDetectorRef
	) {
		this.treeData$ = this.nestedSetConverter.treeData$;
		this.nestedSetData$ = this.nestedSetConverter.nestedSetData$;
	}

	ngOnInit() {
		this.loadInitialData();
	}

	private loadInitialData() {
		this.isLoading = true;
		this.error = null;

		this.mookService
			.getInitialNestedSetData()
			.pipe(
				finalize(() => {
					this.isLoading = false;
				})
			)
			.subscribe({
				next: (data) => {
					this.nestedSetConverter.setNestedSetData(data);
					this.validationErrors =
						this.nestedSetConverter.validateNestedSet(data);
					this.registerNodesFromNestedSet(data);
				},
				error: (err) => {
					this.error = 'Failed to load tree data. Please try again later.';
					console.error('Error loading initial data:', err);
				},
			});
	}

	private registerNodesFromNestedSet(nestedSetData: NestedSetNode[]) {
		const treeData = this.nestedSetService.convertToTree(nestedSetData);
		this.registerNodesRecursively(treeData);
	}

	private registerNodesRecursively(node: TreeNode, parentId?: string) {
		this.treeService.updateNodeMaps(node, parentId);
		node.children.forEach((child: TreeNode) => {
			this.registerNodesRecursively(child, node.id);
		});
	}

	onRegisterDropList(id: string) {
		if (!this.dropListIds.includes(id)) {
			this.dropListIds = [...this.dropListIds, id];
		}
	}

	onTreeUpdate() {
		// Update validation when tree changes
		const currentNestedSetData = this.nestedSetConverter.getNestedSetData();
		this.validationErrors =
			this.nestedSetConverter.validateNestedSet(currentNestedSetData);

		if (this.validationErrors.length > 0) {
			console.error('Tree validation errors:', this.validationErrors);
		}

		// Force change detection
		this.changeDetectorRef.detectChanges();
	}

	removeNode(nodeId: string) {
		this.treeService.deleteNode(nodeId);
		const currentNestedSetData = this.nestedSetConverter.getNestedSetData();
		const filteredData = currentNestedSetData.filter(
			(node) => node.id !== nodeId
		);
		this.nestedSetConverter.setNestedSetData(filteredData);
	}
}
