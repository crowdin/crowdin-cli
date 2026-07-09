import { toPosixPath } from '@/lib/utils/path.ts';
import type { Output } from './output.ts';

const ELEM = '├─ ';
const LAST_ELEM = '╰─ ';
const DIR = '│  ';
const LAST_DIR = '   ';

interface TreeNode {
  data: string;
  children: Map<string, TreeNode>;
}

function makeNode(data: string): TreeNode {
  return { data, children: new Map() };
}

function insertPath(root: TreeNode, parts: string[]): void {
  let node = root;

  for (const part of parts) {
    if (!node.children.has(part)) {
      node.children.set(part, makeNode(part));
    }

    node = node.children.get(part) as TreeNode;
  }
}

function renderNode(node: TreeNode, indent: string, isLast: boolean, lines: string[]): void {
  const childIndent = indent + (isLast ? LAST_DIR : DIR);
  const childEntries = [...node.children.values()];

  lines.push(indent + (isLast ? LAST_ELEM : ELEM) + node.data);

  for (let i = 0; i < childEntries.length; i++) {
    renderNode(childEntries[i] as TreeNode, childIndent, i === childEntries.length - 1, lines);
  }
}

export function fileTree(filePaths: string[]): string[] {
  const sorted = [...filePaths].sort();
  const root = makeNode('.');

  for (const filePath of sorted) {
    insertPath(root, toPosixPath(filePath).split('/').filter(Boolean));
  }

  const lines: string[] = ['.'];
  const children = [...root.children.values()];

  for (let i = 0; i < children.length; i++) {
    renderNode(children[i] as TreeNode, '', i === children.length - 1, lines);
  }

  return lines;
}

export function printFileTree(filePaths: string[], output: Output) {
  for (const line of fileTree(filePaths)) {
    output.log(line);
  }
}
