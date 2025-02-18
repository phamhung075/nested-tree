import { Injectable } from '@angular/core';
import { TreeNode } from '@shared/interfaces/tree-node.model';

@Injectable({
	providedIn: 'root',
})
export class TreeService {
	private nodeMap = new Map<string, TreeNode>();
	private parentMap = new Map<string, string>();

	getRegisteredNodes(): string[] {
		return Array.from(this.nodeMap.keys());
	}

	updateNodeMaps(node: TreeNode, parentId?: string) {
		console.log('Updating node maps:', {
			nodeId: node.id,
			parentId,
			nodeValue: node.value,
		});

		this.nodeMap.set(node.id, node);
		if (parentId) {
			this.parentMap.set(node.id, parentId);
		}

		console.log('Current maps after update:', {
			nodeMapSize: this.nodeMap.size,
			parentMapSize: this.parentMap.size,
			nodeMapKeys: Array.from(this.nodeMap.keys()),
			parentMapKeys: Array.from(this.parentMap.keys()),
		});

		node.children.forEach((child: TreeNode) =>
			this.updateNodeMaps(child, node.id)
		);
	}

	findNodeById(id: string): TreeNode | undefined {
		const node = this.nodeMap.get(id);
		console.log('Finding node by id:', {
			searchId: id,
			found: !!node,
			nodeValue: node?.value,
		});
		return node;
	}

	getParentNode(nodeId: string): TreeNode | undefined {
		const parentId = this.parentMap.get(nodeId);
		const parentNode = parentId ? this.nodeMap.get(parentId) : undefined;
		console.log('Getting parent node:', {
			childId: nodeId,
			parentId,
			foundParent: !!parentNode,
			parentValue: parentNode?.value,
		});
		return parentNode;
	}

	moveNode(
		nodeId: string,
		targetId: string,
		position: 'before' | 'after' | 'inside',
		insertIndex?: number
	): boolean {
		console.log('Starting moveNode operation:', {
			nodeId,
			targetId,
			position,
			insertIndex,
			targetNodeValue: this.findNodeById(targetId)?.value,
		});

		const sourceNode = this.findNodeById(nodeId);
		const targetNode = this.findNodeById(targetId);

		if (!sourceNode || !targetNode) {
			console.log('Move failed: Source or target node not found');
			return false;
		}

		const sourceParent = this.getParentNode(nodeId);
		if (!sourceParent) {
			console.log('Move failed: Source parent not found');
			return false;
		}

		// Remove from old parent
		sourceParent.children = sourceParent.children.filter(
			(child: TreeNode) => child.id !== nodeId
		);

		// Add to new location
		if (position === 'inside') {
			if (typeof insertIndex === 'number' && insertIndex >= 0) {
				// Insert at specific position
				targetNode.children.splice(insertIndex, 0, sourceNode);
			} else {
				// Default behavior: append to end
				targetNode.children.push(sourceNode);
			}
			this.parentMap.set(nodeId, targetId);
		} else {
			const targetParent = this.getParentNode(targetId);
			if (!targetParent) {
				console.log('Move failed: Target parent not found');
				return false;
			}

			const targetIndex = targetParent.children.findIndex(
				(child: TreeNode) => child.id === targetId
			);
			const insertPosition =
				position === 'after' ? targetIndex + 1 : targetIndex;
			targetParent.children.splice(insertPosition, 0, sourceNode);
			this.parentMap.set(nodeId, targetParent.id);
		}

		console.log('Move completed successfully. New structure:', {
			movedNodeId: nodeId,
			newParentId: targetId,
			newParentValue: targetNode.value,
			insertPosition: insertIndex,
		});

		return true;
	}
}
