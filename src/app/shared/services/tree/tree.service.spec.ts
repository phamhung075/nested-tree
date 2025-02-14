import { TestBed } from '@angular/core/testing';
import { TreeService } from './tree.service';
import { TreeNode } from '@shared/interfaces/tree-node.model';

describe('TreeService - Complex Operations', () => {
	let service: TreeService;
	let rootNode: TreeNode;
	let level1Node: TreeNode;
	let level2Node: TreeNode;
	let level3Node: TreeNode;
	let siblingNode: TreeNode;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(TreeService);

		// Create a deep tree structure for testing
		level3Node = { id: 'level3', value: 'Level 3', children: [] };
		level2Node = { id: 'level2', value: 'Level 2', children: [level3Node] };
		siblingNode = { id: 'sibling', value: 'Sibling', children: [] };
		level1Node = { id: 'level1', value: 'Level 1', children: [level2Node] };
		rootNode = {
			id: 'root',
			value: 'Root',
			children: [level1Node, siblingNode],
		};

		// Initialize the tree in the service
		service.updateNodeMaps(rootNode);
		service.updateNodeMaps(level1Node, rootNode.id);
		service.updateNodeMaps(level2Node, level1Node.id);
		service.updateNodeMaps(level3Node, level2Node.id);
		service.updateNodeMaps(siblingNode, rootNode.id);
	});

	describe('Deep Level Operations', () => {
		it('should find nodes at any depth', () => {
			expect(service.findNodeById('level3')).toBeTruthy();
			expect(service.findNodeById('level3')).toEqual(level3Node);
		});

		it('should correctly track parent relationships at all levels', () => {
			expect(service.getParentNode('level3')?.id).toBe('level2');
			expect(service.getParentNode('level2')?.id).toBe('level1');
			expect(service.getParentNode('level1')?.id).toBe('root');
		});

		it('should move deep node to first level (deep to shallow)', () => {
			// Move level3 node to be a child of root
			const result = service.moveNode('level3', 'root', 'inside');

			expect(result).toBeTrue();
			expect(rootNode.children).toContain(level3Node);
			expect(level2Node.children).not.toContain(level3Node);
			expect(service.getParentNode('level3')?.id).toBe('root');
		});

		it('should move node from shallow to deep level (shallow to deep)', () => {
			// Move sibling node to be a child of level3
			const result = service.moveNode('sibling', 'level3', 'inside');

			expect(result).toBeTrue();
			expect(level3Node.children).toContain(siblingNode);
			expect(rootNode.children).not.toContain(siblingNode);
			expect(service.getParentNode('sibling')?.id).toBe('level3');
		});

		it('should handle moving node between deep branches', () => {
			// Create a parallel deep branch
			const newBranch: TreeNode = {
				id: 'newBranch',
				value: 'New Branch',
				children: [{ id: 'deepBranch', value: 'Deep Branch', children: [] }],
			};
			rootNode.children.push(newBranch);
			service.updateNodeMaps(newBranch, rootNode.id);
			service.updateNodeMaps(newBranch.children[0], newBranch.id);

			// Move level3 node to deepBranch
			const result = service.moveNode('level3', 'deepBranch', 'inside');

			expect(result).toBeTrue();
			expect(level2Node.children).not.toContain(level3Node);
			expect(newBranch.children[0].children).toContain(level3Node);
			expect(service.getParentNode('level3')?.id).toBe('deepBranch');
		});
	});

	describe('Complex Reordering Operations', () => {
		it('should maintain correct order when moving nodes up the tree', () => {
			// Move level3 node before level1
			const result = service.moveNode('level3', 'level1', 'before');

			expect(result).toBeTrue();
			const rootChildren = rootNode.children;
			expect(rootChildren.indexOf(level3Node)).toBeLessThan(
				rootChildren.indexOf(level1Node)
			);
		});

		it('should handle multiple moves maintaining tree integrity', () => {
			// Multiple moves scenario
			service.moveNode('level3', 'root', 'inside'); // Move to root
			service.moveNode('level2', 'level3', 'inside'); // Move under previous child
			service.moveNode('sibling', 'level2', 'inside'); // Move to new branch

			expect(rootNode.children).toContain(level3Node);
			expect(level3Node.children).toContain(level2Node);
			expect(level2Node.children).toContain(siblingNode);

			// Verify parent relationships
			expect(service.getParentNode('level3')?.id).toBe('root');
			expect(service.getParentNode('level2')?.id).toBe('level3');
			expect(service.getParentNode('sibling')?.id).toBe('level2');
		});

		it('should prevent circular references', () => {
			// Attempt to move parent under its own child
			const result = service.moveNode('level1', 'level3', 'inside');

			expect(result).toBeFalse();
			expect(level3Node.children).not.toContain(level1Node);
			expect(service.getParentNode('level1')?.id).toBe('root');
		});
	});

	describe('Edge Cases', () => {
		it('should handle moving last child maintaining parent references', () => {
			// Move the only child of level2
			service.moveNode('level3', 'root', 'inside');

			expect(level2Node.children.length).toBe(0);
			expect(service.getParentNode('level2')?.id).toBe('level1');
		});

		it('should handle moving node to its existing parent', () => {
			// Move node where it already is
			const result = service.moveNode('level3', 'level2', 'inside');

			expect(result).toBeTrue();
			expect(level2Node.children).toContain(level3Node);
			expect(level2Node.children.length).toBe(1);
		});

		it('should handle moving between siblings maintaining order', () => {
			// Add another sibling for testing
			const newSibling: TreeNode = {
				id: 'newSibling',
				value: 'New Sibling',
				children: [],
			};
			rootNode.children.push(newSibling);
			service.updateNodeMaps(newSibling, rootNode.id);

			// Move between siblings
			service.moveNode('sibling', 'newSibling', 'before');

			const siblingIndex = rootNode.children.indexOf(siblingNode);
			const newSiblingIndex = rootNode.children.indexOf(newSibling);
			expect(siblingIndex).toBeLessThan(newSiblingIndex);
		});
	});
});
