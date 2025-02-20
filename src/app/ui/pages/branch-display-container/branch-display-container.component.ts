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

@Component({
	selector: 'app-tree-container',
	standalone: true,
	imports: [TreeComponent, CommonModule],
	templateUrl: './branch-display-container.component.html',
	styleUrls: ['./branch-display-container.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppTreeContainer implements OnInit {
	treeData: TreeNode = mockTreeData;
	dropListIds: string[] = [];
	constructor(
		private treeService: TreeService,
		private changeDetectionRef: ChangeDetectorRef
	) {}

	ngOnInit() {
		// Register all nodes in the tree with the service
		this.registerNodesRecursively(this.treeData);
		// console.log('Tree Container Initialized');
	}

	private registerNodesRecursively(node: TreeNode, parentId?: string) {
		// Register the current node
		this.treeService.updateNodeMaps(node, parentId);
		// console.log('Registered node:', { nodeId: node.id, parentId });

		// Register all children
		node.children.forEach((child: TreeNode) => {
			this.registerNodesRecursively(child, node.id);
		});
	}
}
