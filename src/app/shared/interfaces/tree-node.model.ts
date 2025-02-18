export interface TreeNode {
	id: string;
	value: string;
	children: TreeNode[];
	isExpanded?: boolean;
}
