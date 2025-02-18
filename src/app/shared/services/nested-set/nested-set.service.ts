// nested-set.service.ts
import { Injectable } from '@angular/core';
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
export class NestedSetService {
	private counter = 1;

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

	convertToTree(nestedSetNodes: NestedSetNode[]): TreeNode {
		// Sort nodes by left value to ensure proper order
		const sortedNodes = [...nestedSetNodes].sort((a, b) => a.left - b.left);

		const nodeMap = new Map<string, TreeNode>();
		const stack: NestedSetNode[] = [];
		let root: TreeNode | null = null;

		sortedNodes.forEach((node) => {
			const treeNode: TreeNode = {
				id: node.id,
				value: node.value,
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

	validateNestedSet(nodes: NestedSetNode[]): boolean {
		// Sort nodes by left value
		const sortedNodes = [...nodes].sort((a, b) => a.left - b.left);

		// Check for continuous numbering
		const allNumbers = sortedNodes
			.flatMap((node) => [node.left, node.right])
			.sort((a, b) => a - b);
		for (let i = 0; i < allNumbers.length; i++) {
			if (allNumbers[i] !== i + 1) {
				return false;
			}
		}

		// Check parent-child relationships
		for (let i = 0; i < sortedNodes.length; i++) {
			const current = sortedNodes[i];

			// Right value must be greater than left value
			if (current.right <= current.left) {
				return false;
			}

			// Check nesting with other nodes
			for (let j = 0; j < sortedNodes.length; j++) {
				if (i !== j) {
					const other = sortedNodes[j];
					// Check for proper nesting
					if (current.left < other.left && current.right > other.right) {
						if (other.level !== current.level + 1) {
							return false;
						}
					}
				}
			}
		}

		return true;
	}
}
