// tree.component.ts
import {
	trigger,
	state,
	style,
	transition,
	animate,
} from '@angular/animations';
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
	ElementRef,
	EventEmitter,
	HostListener,
	Input,
	OnInit,
	Output,
	ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TreeNode } from '@shared/interfaces/tree-node.model';
import { TreeService } from '@shared/services/tree/tree.service';

@Component({
	selector: 'app-tree',
	standalone: true,
	imports: [CommonModule, FormsModule, DragDropModule],
	templateUrl: './branch-display.component.html',
	styleUrls: ['./branch-display.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	animations: [
		trigger('expandCollapse', [
			state(
				'expanded',
				style({
					height: '*',
					opacity: 1,
					visibility: 'visible', // Add this
				})
			),
			state(
				'collapsed',
				style({
					height: '0',
					opacity: 0,
					visibility: 'hidden', // Add this
				})
			),
			transition('expanded <=> collapsed', [animate('200ms ease-in-out')]),
		]),
	],
})
export class TreeComponent implements OnInit {
	@Input() node!: TreeNode;
	@Input() isLastChild = false;
	@Input() isRoot = true;
	@Input() dropListIds: string[] = [];
	@Output() onDelete = new EventEmitter<string>();
	@Output() registerDropList = new EventEmitter<string>();
	isExpanded = true;
	@Input() level = 0; // Track nesting level

	dropListId = `drop-list-${Math.random().toString(36).substring(2)}`;
	private hasBeenInitialized = false;
	@ViewChild('scrollContainer') scrollContainer!: ElementRef;
	private isDraggingScroll = false;
	private startX = 0;
	private startY = 0;
	private startScrollX = 0;
	private startScrollY = 0;
	dragConfig = {
		dragStartThreshold: 5,
		pointerDirectionChangeThreshold: 5,
		touchStartLongPress: true,
		touchStartDelay: 100,
	};

	constructor(
		private treeService: TreeService,
		private changeDetectorRef: ChangeDetectorRef
	) {}

	toggleExpand() {
		this.isExpanded = !this.isExpanded;
		this.node.isExpanded = this.isExpanded;
		this.changeDetectorRef.detectChanges(); // Force change detection
	}

	ngOnInit() {
		this.isExpanded = this.isRoot ? true : this.node.isExpanded ?? true;

		if (!this.hasBeenInitialized) {
			this.registerDropList.emit(this.dropListId);
			this.hasBeenInitialized = true;
			// console.log('Tree Component Initialized:', {
			// 	nodeId: this.node.id,
			// 	value: this.node.value,
			// 	children: this.node.children.length,
			// });
			this.hasBeenInitialized = true;
		}
	}

	getChildLevel(): number {
		return this.level + 1;
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
		// Prevent default on the original event if it exists
		if (event.event) {
			event.event.preventDefault();
			event.event.stopPropagation();
		}

		if (event.previousContainer === event.container) {
			moveItemInArray(
				event.container.data,
				event.previousIndex,
				event.currentIndex
			);
		} else {
			const success = this.treeService.moveNode(
				event.item.data.id,
				this.node.id,
				'inside',
				event.currentIndex
			);

			if (success) {
				// Force update after successful drop
				this.changeDetectorRef.detectChanges();

				// Add haptic feedback if available
				if (window.navigator && window.navigator.vibrate) {
					window.navigator.vibrate(50);
				}
			}
		}
	}

	moveUpLevel() {
		const currentParent = this.treeService.getParentNode(this.node.id);
		if (!currentParent) {
			// console.log('Cannot move up: No parent found');
			return;
		}

		const grandParent = this.treeService.getParentNode(currentParent.id);
		if (!grandParent) {
			// console.log('Cannot move up: No grandparent found');
			return;
		}

		// Find the index where the current parent is in the grandparent's children
		const parentIndex = grandParent.children.findIndex(
			(child: TreeNode) => child.id === currentParent.id
		);

		if (parentIndex === -1) {
			// console.log('Cannot move up: Parent index not found');
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
			// console.log('Node moved up successfully:', {
			// 	nodeId: this.node.id,
			// 	newParentId: grandParent.id,
			// 	position: parentIndex + 1,
			// });
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
			// console.log('Removed child:', {
			// 	childId,
			// 	parentId: this.node.id,
			// 	parentValue: this.node.value,
			// });
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

	@HostListener('touchstart', ['$event'])
	onTouchStart(event: TouchEvent) {
		if (this.isRoot) return;

		// Store initial touch position
		const touch = event.touches[0];
		const initialTouch = { x: touch.clientX, y: touch.clientY };
		let hasMoved = false;

		const touchMoveHandler = (moveEvent: TouchEvent) => {
			if (!hasMoved) {
				const currentTouch = moveEvent.touches[0];
				const deltaX = Math.abs(currentTouch.clientX - initialTouch.x);
				const deltaY = Math.abs(currentTouch.clientY - initialTouch.y);

				// If horizontal movement is significant, start drag
				if (deltaX > 10 && deltaX > deltaY) {
					moveEvent.preventDefault();
					hasMoved = true;
					this.onDragStarted();
				}
			}
		};

		const touchEndHandler = () => {
			if (hasMoved) {
				this.onDragEnded();
			}
			document.removeEventListener('touchmove', touchMoveHandler);
			document.removeEventListener('touchend', touchEndHandler);
		};

		document.addEventListener('touchmove', touchMoveHandler, {
			passive: false,
		});
		document.addEventListener('touchend', touchEndHandler);
	}

	startScrollDrag(event: MouseEvent) {
		// Ignore if clicking on interactive elements
		if (
			event.target instanceof HTMLButtonElement ||
			event.target instanceof HTMLInputElement ||
			(event.target as HTMLElement).classList.contains('cdk-drag-handle')
		) {
			return;
		}

		this.isDraggingScroll = true;
		this.startY = event.pageX;
		this.startX = event.pageY;
		this.startScrollX = window.scrollX;
		this.startScrollY = window.scrollY;

		document.body.classList.add('dragging-scroll');

		// Add document-level event listeners
		const moveHandler = (e: MouseEvent) => this.handleScrollDrag(e);
		const upHandler = () => {
			this.isDraggingScroll = false;
			document.body.classList.remove('dragging-scroll');
			document.removeEventListener('mousemove', moveHandler);
			document.removeEventListener('mouseup', upHandler);
		};

		document.addEventListener('mousemove', moveHandler);
		document.addEventListener('mouseup', upHandler);
	}

	// Handle touch drag for scrolling
	startTouchScrollDrag(event: TouchEvent) {
		// Ignore if touching interactive elements
		if (
			event.target instanceof HTMLButtonElement ||
			event.target instanceof HTMLInputElement ||
			(event.target as HTMLElement).classList.contains('cdk-drag-handle')
		) {
			return;
		}

		this.isDraggingScroll = true;
		this.startX = event.touches[0].pageX;
		this.startY = event.touches[0].pageY;
		this.startScrollX = window.scrollX;
		this.startScrollY = window.scrollY;

		document.body.classList.add('dragging-scroll');

		// Add document-level event listeners
		const moveHandler = (e: TouchEvent) => this.handleTouchScrollDrag(e);
		const endHandler = () => {
			this.isDraggingScroll = false;
			document.body.classList.remove('dragging-scroll');
			document.removeEventListener('touchmove', moveHandler);
			document.removeEventListener('touchend', endHandler);
		};

		document.addEventListener('touchmove', moveHandler);
		document.addEventListener('touchend', endHandler);
	}

	private handleScrollDrag(event: MouseEvent) {
		if (!this.isDraggingScroll) return;

		const deltaX = event.pageX - this.startX;
		const deltaY = event.pageY - this.startY;

		// Apply horizontal scroll
		window.scrollTo(this.startScrollX - deltaX, window.scrollY);
		// Apply vertical scroll
		window.scrollTo(window.scrollX, this.startScrollY - deltaY);
	}

	private handleTouchScrollDrag(event: TouchEvent) {
		if (!this.isDraggingScroll) return;

		const deltaX = event.touches[0].pageX - this.startX;
		const deltaY = event.touches[0].pageY - this.startY;

		// Apply horizontal scroll
		window.scrollTo(this.startScrollX - deltaX, window.scrollY);
		// Apply vertical scroll
		window.scrollTo(window.scrollX, this.startScrollY - deltaY);
	}

	private setupAutoScroll() {
		const scrollThreshold = 50;
		const scrollSpeed = 10;
		let scrollInterval: any;

		const handleScroll = (e: MouseEvent | Touch) => {
			const containerRect =
				this.scrollContainer.nativeElement.getBoundingClientRect();
			const mouseX = e instanceof MouseEvent ? e.clientX : e.clientX;
			const mouseY = e instanceof MouseEvent ? e.clientY : e.clientY;

			// Clear existing interval
			if (scrollInterval) {
				clearInterval(scrollInterval);
			}

			// Check if we're near the edges of the container
			if (mouseY > containerRect.bottom - scrollThreshold) {
				// Scroll down
				scrollInterval = setInterval(() => {
					window.scrollBy(0, scrollSpeed);
				}, 16);
			} else if (mouseY < containerRect.top + scrollThreshold) {
				// Scroll up
				scrollInterval = setInterval(() => {
					window.scrollBy(0, -scrollSpeed);
				}, 16);
			}
		};

		const cleanup = () => {
			if (scrollInterval) {
				clearInterval(scrollInterval);
			}
			document.removeEventListener('mousemove', mouseHandler);
			document.removeEventListener('touchmove', touchHandler);
		};

		const mouseHandler = (e: MouseEvent) => handleScroll(e);
		const touchHandler = (e: TouchEvent) => {
			if (e.touches.length > 0) {
				handleScroll(e.touches[0]);
			}
		};

		document.addEventListener('mousemove', mouseHandler);
		document.addEventListener('touchmove', touchHandler);
		document.addEventListener('mouseup', cleanup, { once: true });
		document.addEventListener('touchend', cleanup, { once: true });
	}

	onDragStarted() {
		document.body.style.overflow = 'auto'; // Allow scrolling
		document.body.classList.add('dragging');
		this.setupAutoScroll();
	}

	// Update drag ended handler
	onDragEnded() {
		document.body.style.overflow = '';
		document.body.classList.remove('dragging');
		this.changeDetectorRef.detectChanges();
	}

	onRegisterDropList(childDropListId: string) {
		if (!this.dropListIds.includes(childDropListId)) {
			this.dropListIds.push(childDropListId);
			this.registerDropList.emit(childDropListId);
		}
	}
}
