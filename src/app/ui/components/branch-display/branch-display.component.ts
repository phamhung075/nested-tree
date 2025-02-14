// tree.component.ts
import {
	CdkDrag,
	CdkDragDrop,
	CdkDropList,
	DragDropModule,
	moveItemInArray,
} from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TreeNode } from '@shared/interfaces/tree-node.model';
import { TreeService } from '@shared/services/tree/tree.service';

@Component({
	selector: 'app-tree',
	standalone: true,
	imports: [CommonModule, FormsModule, DragDropModule],
	templateUrl: './branch-display.component.html',
	styleUrls: ['./branch-display.component.scss'],
})
export class TreeComponent implements OnInit {
	@Input() node!: TreeNode;
	@Input() isLastChild = false;
	@Input() isRoot = true;
	@Input() dropListIds: string[] = [];
	@Output() onDelete = new EventEmitter<string>();
	@Output() registerDropList = new EventEmitter<string>();

	dropListId = `drop-list-${Math.random().toString(36).substring(2)}`;
	private hasBeenInitialized = false;

	constructor(private treeService: TreeService) {}

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

	canDrop = (drag: CdkDrag, drop: CdkDropList) => {
		const dragData = drag.data as TreeNode;
		const dropData = this.node; // Current node where we're trying to drop

		// Prevent dropping on itself or its descendants and root
		if (
			dragData.id === dropData.id ||
			this.isDescendant(dragData, dropData) ||
			dropData.id === 'root'
		) {
			return false;
		}
		return true;
	};

	private isDescendant(dragNode: TreeNode, targetNode: TreeNode): boolean {
		return targetNode.children.some(
			(child: TreeNode) =>
				child.id === dragNode.id || this.isDescendant(dragNode, child)
		);
	}

	drop(event: CdkDragDrop<TreeNode[]>) {
		const draggedNode = event.item.data as TreeNode;

		if (event.previousContainer === event.container) {
			// Moving within the same container
			moveItemInArray(
				event.container.data,
				event.previousIndex,
				event.currentIndex
			);
		} else {
			// Moving to a different container
			const success = this.treeService.moveNode(
				draggedNode.id,
				this.node.id,
				'inside',
				event.currentIndex // Pass the current index for position-based insertion
			);

			if (success) {
				console.log('Node moved successfully to:', {
					targetNode: this.node.value,
					position: event.currentIndex,
				});
			}
		}
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
		const newNode: TreeNode = {
			id: Date.now().toString(),
			value: 'New Node',
			children: [],
		};
		this.treeService.updateNodeMaps(newNode, this.node.id);
		this.node.children.push(newNode);
	}

	deleteNode() {
		this.onDelete.emit(this.node.id);
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
