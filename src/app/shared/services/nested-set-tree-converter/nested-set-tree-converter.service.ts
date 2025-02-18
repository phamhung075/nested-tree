// nested-set-tree-converter.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TreeNode } from '@shared/interfaces/tree-node.model';

export interface NestedSetNode {
	id: string;
	value: string;
	left: number;
	right: number;
	level: number;
}

@Injectable({
	providedIn: 'root',
})
export class NestedSetTreeConverterService {
	private nodeValues = new Map<string, string>();
	private treeDataSubject = new BehaviorSubject<TreeNode | null>(null);
	private nestedSetDataSubject = new BehaviorSubject<NestedSetNode[]>([]);
	private counter = 1;

	treeData$: Observable<TreeNode | null> = this.treeDataSubject.asObservable();
	nestedSetData$: Observable<NestedSetNode[]> =
		this.nestedSetDataSubject.asObservable();

	constructor() {}

	// Add method to track node values
	private trackNodeValue(nodeId: string, value: string) {
		this.nodeValues.set(nodeId, value);
	}

	// Get tracked node value
	private getNodeValue(nodeId: string, defaultValue: string): string {
		return this.nodeValues.get(nodeId) || defaultValue;
	}

	getNestedSetData(): NestedSetNode[] {
		return this.nestedSetDataSubject.getValue();
	}

	setNestedSetData(nestedSetData: NestedSetNode[]) {
		// Track all existing node values before updating
		nestedSetData.forEach((node) => {
			if (this.nodeValues.has(node.id)) {
				// Only update if value exists and is different
				const currentValue = this.nodeValues.get(node.id);
				if (currentValue !== node.value) {
					this.trackNodeValue(node.id, node.value);
				}
			} else {
				// Track new values
				this.trackNodeValue(node.id, node.value);
			}
		});

		// Sort data by left value
		const sortedData = [...nestedSetData].sort((a, b) => a.left - b.left);

		// Update the subjects
		this.nestedSetDataSubject.next(sortedData);
		const treeData = this.convertToTree(sortedData);
		this.treeDataSubject.next(treeData);

		console.log('Updated nested set data:', {
			nestedSetData: sortedData,
			treeData,
			trackedValues: Array.from(this.nodeValues.entries()),
		});
	}

	convertToNestedSet(treeData: TreeNode): NestedSetNode[] {
		this.counter = 1;
		const result: NestedSetNode[] = [];
		this.processNode(treeData, result, 0);
		return result;
	}

	private processNode(
		node: TreeNode,
		result: NestedSetNode[],
		level: number
	): void {
		const currentNode: NestedSetNode = {
			id: node.id,
			value: node.value,
			left: this.counter++,
			right: 0,
			level: level,
		};

		// Process children recursively
		node.children.forEach((child) => {
			this.processNode(child, result, level + 1);
		});

		// Set right value after processing all children
		currentNode.right = this.counter++;
		result.push(currentNode);
	}

	updateNodeValue(nodeId: string, newValue: string) {
		// Update the tracked value
		this.trackNodeValue(nodeId, newValue);

		const currentData = this.getNestedSetData();
		const updatedData = currentData.map((node) =>
			node.id === nodeId
				? { ...node, value: newValue }
				: { ...node, value: this.getNodeValue(node.id, node.value) }
		);

		this.setNestedSetData(updatedData);
	}

	private convertToTree(nestedSetNodes: NestedSetNode[]): TreeNode {
		if (nestedSetNodes.length === 0) {
			return { id: '0', value: '', children: [] };
		}

		const nodeMap = new Map<string, TreeNode>();
		const stack: NestedSetNode[] = [];
		let root: TreeNode | null = null;

		const sortedNodes = [...nestedSetNodes].sort((a, b) => a.left - b.left);

		sortedNodes.forEach((node) => {
			const treeNode: TreeNode = {
				id: node.id,
				value: this.getNodeValue(node.id, node.value), // Use tracked value
				children: [],
			};
			nodeMap.set(node.id, treeNode);

			while (stack.length > 0 && stack[stack.length - 1].right < node.left) {
				stack.pop();
			}

			if (stack.length > 0) {
				const parent = nodeMap.get(stack[stack.length - 1].id);
				if (parent) {
					parent.children.push(treeNode);
				}
			} else if (!root) {
				root = treeNode;
			}

			stack.push(node);
		});

		return root || { id: '0', value: '', children: [] };
	}

	validateNestedSet(nodes: NestedSetNode[]): string[] {
		const errors: string[] = [];
		const sortedNodes = [...nodes].sort((a, b) => a.left - b.left);

		// Check for continuous numbering
		const allNumbers = sortedNodes
			.flatMap((node) => [node.left, node.right])
			.sort((a, b) => a - b);

		// Verify sequence
		for (let i = 0; i < allNumbers.length; i++) {
			if (allNumbers[i] !== i + 1) {
				errors.push(`Non-continuous numbering at position ${i + 1}`);
			}
		}

		// Verify parent-child relationships and levels
		sortedNodes.forEach((node) => {
			// Check right value is greater than left value
			if (node.right <= node.left) {
				errors.push(
					`Node ${node.id}: Right value (${node.right}) must be greater than left value (${node.left})`
				);
			}

			// Verify level based on parent-child relationship
			if (node.level === 0 && node !== sortedNodes[0]) {
				errors.push(`Node ${node.id}: Only root node can have level 0`);
			}

			// Find parent node
			const parent = sortedNodes.find(
				(potential) =>
					potential.left < node.left &&
					potential.right > node.right &&
					potential.right - potential.left > node.right - node.left
			);

			if (parent && node.level !== parent.level + 1) {
				errors.push(
					`Node ${node.id}: Level mismatch with parent. Expected ${
						parent.level + 1
					}, got ${node.level}`
				);
			}
		});

		return errors;
	}

	addNode(parentId: string): string {
		const currentData = this.getNestedSetData();
		const parentNode = currentData.find((node) => node.id === parentId);

		if (!parentNode) return '';

		const newNodeId = Date.now().toString();
		const insertionPoint = parentNode.right - 1;

		// Preserve existing nodes' values using the tracking system
		const updatedData = currentData.map((node) => ({
			...node,
			left: node.left > insertionPoint ? node.left + 2 : node.left,
			right: node.right > insertionPoint ? node.right + 2 : node.right,
			value: this.getNodeValue(node.id, node.value), // Use tracked value
		}));

		// Create new node
		const newNode: NestedSetNode = {
			id: newNodeId,
			value: 'New Node',
			left: insertionPoint + 1,
			right: insertionPoint + 2,
			level: parentNode.level + 1,
		};

		// Track the new node's value
		this.trackNodeValue(newNodeId, 'New Node');

		// Combine and sort
		const finalData = [...updatedData, newNode].sort((a, b) => a.left - b.left);

		// Recalculate levels while preserving values
		const recalculatedData = this.recalculateLevels(finalData).map((node) => ({
			...node,
			value: this.getNodeValue(node.id, node.value), // Ensure values are preserved
		}));

		this.setNestedSetData(recalculatedData);
		console.log('Added new node:', {
			nodeId: newNodeId,
			parentId,
			parentValue: this.getNodeValue(parentId, parentNode.value),
			trackedValues: Array.from(this.nodeValues.entries()),
		});

		return newNodeId;
	}

	private recalculateLevels(nodes: NestedSetNode[]): NestedSetNode[] {
		const sortedNodes = [...nodes].sort((a, b) => a.left - b.left);
		const rootNode = sortedNodes[0];
		if (!rootNode) return nodes;

		const levelMap = new Map<string, number>();
		levelMap.set(rootNode.id, 0);

		sortedNodes.forEach((node) => {
			if (node.id === rootNode.id) return;

			const parent = sortedNodes.find(
				(potential) =>
					potential.left < node.left &&
					potential.right > node.right &&
					(!levelMap.has(node.id) ||
						potential.right - potential.left > node.right - node.left)
			);

			if (parent) {
				const parentLevel = levelMap.get(parent.id) || 0;
				levelMap.set(node.id, parentLevel + 1);
			}
		});

		// Update only the levels, preserve all other properties including values
		return sortedNodes.map((node) => ({
			...node, // Keep all existing properties
			level: levelMap.get(node.id) || 0,
			// Don't modify value or other properties
		}));
	}

	deleteNode(nodeId: string) {
		const currentData = this.getNestedSetData();
		const nodeToDelete = currentData.find((node) => node.id === nodeId);

		if (!nodeToDelete) return;

		// Remove the tracked value for the deleted node
		this.nodeValues.delete(nodeId);

		// Continue with existing delete logic...
		const width = nodeToDelete.right - nodeToDelete.left + 1;
		const updatedData = currentData
			.filter(
				(node) =>
					node.left < nodeToDelete.left || node.left > nodeToDelete.right
			)
			.map((node) => ({
				...node,
				left: node.left > nodeToDelete.right ? node.left - width : node.left,
				right:
					node.right > nodeToDelete.right ? node.right - width : node.right,
				value: this.getNodeValue(node.id, node.value),
			}));

		this.setNestedSetData(updatedData);
	}

	moveNode(
		nodeId: string,
		targetParentId: string,
		position: 'before' | 'after' | 'inside'
	) {
		const nestedSetData = [...this.nestedSetDataSubject.value];
		const nodeToMove = nestedSetData.find((node) => node.id === nodeId);
		const targetParent = nestedSetData.find(
			(node) => node.id === targetParentId
		);

		if (!nodeToMove || !targetParent) return;

		// Prevent moving node to its own descendant
		if (this.isDescendant(nodeToMove, targetParent, nestedSetData)) {
			return;
		}

		const nodeWidth = nodeToMove.right - nodeToMove.left + 1;
		const oldLeft = nodeToMove.left;
		const oldRight = nodeToMove.right;
		let newLeft: number;
		let levelChange: number;

		if (position === 'inside') {
			newLeft = targetParent.right;
			levelChange = targetParent.level + 1 - nodeToMove.level;
		} else {
			newLeft =
				position === 'before' ? targetParent.left : targetParent.right + 1;
			levelChange = targetParent.level - nodeToMove.level;
		}

		// Adjust all nodes' positions
		const updatedData = nestedSetData.map((node) => {
			let adjustedNode = { ...node };

			// Adjust nodes that are part of the moved subtree
			if (node.left >= oldLeft && node.right <= oldRight) {
				const offset = newLeft - oldLeft;
				adjustedNode.left += offset;
				adjustedNode.right += offset;
				adjustedNode.level += levelChange;
			}
			// Adjust nodes that were between old and new position
			else if (
				(newLeft < oldLeft && node.left >= newLeft && node.left < oldLeft) ||
				(newLeft > oldRight && node.left > oldRight && node.left <= newLeft)
			) {
				adjustedNode.left += nodeWidth;
				adjustedNode.right += nodeWidth;
			}

			return adjustedNode;
		});

		this.setNestedSetData(updatedData);
	}

	private isDescendant(
		node: NestedSetNode,
		potentialDescendant: NestedSetNode,
		nodes: NestedSetNode[]
	): boolean {
		return (
			potentialDescendant.left > node.left &&
			potentialDescendant.right < node.right
		);
	}
}
