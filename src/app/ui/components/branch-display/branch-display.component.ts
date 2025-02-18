// tree.component.ts
import {
	CdkDrag,
	CdkDragDrop,
	CdkDropList,
	DragDropModule,
	moveItemInArray,
} from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	EventEmitter,
	Input,
	OnInit,
	Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TreeNode } from '@shared/interfaces/tree-node.model';
import { NestedSetTreeConverterService } from '@shared/services/nested-set-tree-converter/nested-set-tree-converter.service';
import { TreeService } from '@shared/services/tree/tree.service';

@Component({
	selector: 'app-tree',
	standalone: true,
	imports: [CommonModule, FormsModule, DragDropModule],
	templateUrl: './branch-display.component.html',
	styleUrls: ['./branch-display.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeComponent implements OnInit {
	@Input() node!: TreeNode;
	@Input() isLastChild = false;
	@Input() isRoot = true;
	@Input() dropListIds: string[] = [];
	@Output() onDelete = new EventEmitter<string>();
	@Output() registerDropList = new EventEmitter<string>();
	@Output() treeUpdated = new EventEmitter<void>();

	dropListId = `drop-list-${Math.random().toString(36).substring(2)}`;
	private hasBeenInitialized = false;

	constructor(
		private treeService: TreeService,
		private nestedSetConverter: NestedSetTreeConverterService,
		private changeDetectorRef: ChangeDetectorRef
	) {}

	ngOnInit() {
		if (!this.hasBeenInitialized) {
			this.registerDropList.emit(this.dropListId);
			console.log('Tree Component Initialized:', {
				nodeId: this.node.id,
				value: this.node.value,
				children: this.node.children.length,
			});
			this.hasBeenInitialized = true;
		}
	}

	private isDescendant(dragNode: TreeNode, targetNode: TreeNode): boolean {
		return targetNode.children.some(
			(child: TreeNode) =>
				child.id === dragNode.id || this.isDescendant(dragNode, child)
		);
	}

	canDrop = (drag: CdkDrag, drop: CdkDropList) => {
		const dragData = drag.data as TreeNode;
		const dropData = this.node;

		// Allow dropping if:
		// 1. Not dropping onto itself
		// 2. Not dropping onto its own descendant
		// 3. Not dropping onto root if it's a move operation
		if (dragData.id === dropData.id || this.isDescendant(dragData, dropData)) {
			return false;
		}

		// Allow dropping on nodes with children
		if (dropData.children && dropData.children.length > 0) {
			return true;
		}

		// Allow dropping on leaf nodes only if they're not the root
		return !this.isRoot;
	};

	drop(event: CdkDragDrop<TreeNode[]>) {
		const draggedNode = event.item.data as TreeNode;

		if (event.previousContainer === event.container) {
			// Same container - reorder
			moveItemInArray(
				event.container.data,
				event.previousIndex,
				event.currentIndex
			);
		} else {
			// Different container - transfer
			const success = this.treeService.moveNode(
				draggedNode.id,
				this.node.id,
				'inside',
				event.currentIndex
			);

			if (success) {
				// Find root and update nested set
				const rootNode = this.findRootNode(this.node);
				if (rootNode) {
					const nestedSetData =
						this.nestedSetConverter.convertToNestedSet(rootNode);
					this.nestedSetConverter.setNestedSetData(nestedSetData);
				}
			}
		}

		// Force change detection and emit update
		this.changeDetectorRef.detectChanges();
		this.treeUpdated.emit();
	}

	moveUpLevel() {
		const currentParent = this.treeService.getParentNode(this.node.id);
		if (!currentParent) {
			console.log('Cannot move up: No parent found');
			return;
		}

		const grandParent = this.treeService.getParentNode(currentParent.id);
		if (!grandParent) {
			console.log('Cannot move up: No grandparent found');
			return;
		}

		// Find the index where the current parent is in the grandparent's children
		const parentIndex = grandParent.children.findIndex(
			(child: TreeNode) => child.id === currentParent.id
		);

		if (parentIndex === -1) {
			console.log('Cannot move up: Parent index not found');
			return;
		}

		// Move the node one level up
		const success = this.treeService.moveNode(
			this.node.id,
			grandParent.id,
			'inside',
			parentIndex + 1 // Insert after the current parent
		);

		if (success) {
			console.log('Node moved up successfully:', {
				nodeId: this.node.id,
				newParentId: grandParent.id,
				position: parentIndex + 1,
			});
		}
	}

	// Update the tree service to include better logging
	removeChild(childId: string) {
		const index = this.node.children.findIndex(
			(child: TreeNode) => child.id === childId
		);
		if (index !== -1) {
			const removedNode = this.node.children[index];
			this.node.children.splice(index, 1);
			console.log('Removed child:', {
				childId,
				parentId: this.node.id,
				parentValue: this.node.value,
			});
		}
	}

	addChild() {
		// Use the NestedSetTreeConverterService to add the node
		const newNodeId = this.nestedSetConverter.addNode(this.node.id);

		if (!newNodeId) {
			console.error('Failed to add new node');
			return;
		}

		// Create the new tree node
		const newNode: TreeNode = {
			id: newNodeId,
			value: 'New Node',
			children: [],
		};

		// Update tree service maps
		this.treeService.updateNodeMaps(newNode, this.node.id);

		// Add to UI tree structure
		this.node.children.push(newNode);

		// Force change detection and emit update
		this.changeDetectorRef.detectChanges();
		this.treeUpdated.emit();

		console.log('Added child node:', {
			nodeId: newNodeId,
			parentId: this.node.id,
			parentValue: this.node.value,
		});
	}

	deleteNode() {
		// Emit the delete event to parent
		this.onDelete.emit(this.node.id);

		// Find the parent node
		const parentNode = this.treeService.getParentNode(this.node.id);
		if (parentNode) {
			// Remove the node from parent's children
			parentNode.children = parentNode.children.filter(
				(child) => child.id !== this.node.id
			);

			// Find root node to update nested set
			const rootNode = this.findRootNode(parentNode);
			if (rootNode) {
				// Convert updated tree to nested set and update
				const nestedSetData =
					this.nestedSetConverter.convertToNestedSet(rootNode);
				this.nestedSetConverter.setNestedSetData(nestedSetData);
			}
		}

		// Update the tree service
		this.treeService.deleteNode(this.node.id);

		// Emit update event
		this.treeUpdated.emit();
		this.changeDetectorRef.markForCheck();
	}

	// Add this method to TreeService
	private findRootNode(node: TreeNode): TreeNode | null {
		let currentNode = node;
		let parentNode = this.treeService.getParentNode(currentNode.id);
		let visitedNodes = new Set<string>();

		while (parentNode) {
			if (visitedNodes.has(parentNode.id)) {
				console.error('Circular reference detected');
				return null;
			}
			visitedNodes.add(parentNode.id);
			currentNode = parentNode;
			parentNode = this.treeService.getParentNode(currentNode.id);
		}

		return currentNode;
	}

	onDragStarted() {
		document.body.classList.add('dragging');
	}

	onDragEnded() {
		document.body.classList.remove('dragging');
	}

	onRegisterDropList(childDropListId: string) {
		if (!this.dropListIds.includes(childDropListId)) {
			this.dropListIds.push(childDropListId);
			this.registerDropList.emit(childDropListId);
		}
	}
}
