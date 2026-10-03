import type { iFileTreeFolder, iSnapshotFile } from './reviews.types';

function compareNames(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true });
}

function fileName(path: string) {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** Splits a path into its folder (with a trailing slash) and file name. */
export function splitPath(path: string) {
  const slash = path.lastIndexOf('/');
  return { folder: slash === -1 ? '' : path.slice(0, slash + 1), name: path.slice(slash + 1) };
}

/** Keeps the files whose path contains the query, ignoring case. */
export function filterFiles(files: readonly iSnapshotFile[], query: string) {
  const needle = query.trim().toLowerCase();
  return needle ? files.filter((file) => file.path.toLowerCase().includes(needle)) : [...files];
}

function sortFolder(folder: iFileTreeFolder): iFileTreeFolder {
  const folders = folder.folders.map(sortFolder).sort((left, right) => compareNames(left.name, right.name));
  const files = [...folder.files].sort((left, right) => compareNames(fileName(left.path), fileName(right.path)));
  return {
    ...folder,
    folders,
    files,
    fileCount: files.length + folders.reduce((total, child) => total + child.fileCount, 0),
  };
}

function mergeSingleChildFolders(folder: iFileTreeFolder): iFileTreeFolder {
  let merged = folder;
  while (merged.files.length === 0 && merged.folders.length === 1 && merged.folders[0]) {
    const [child] = merged.folders;
    merged = { ...child, name: `${merged.name}/${child.name}` };
  }
  return { ...merged, folders: merged.folders.map(mergeSingleChildFolders) };
}

/** Builds the changed-file tree: folders first, then files, each sorted by name. */
export function buildFileTree(files: readonly iSnapshotFile[]): iFileTreeFolder {
  const root: iFileTreeFolder = { name: '', path: '', folders: [], files: [], fileCount: 0 };

  for (const file of files) {
    const segments = file.path.split('/').slice(0, -1);
    let folder = root;
    for (const segment of segments) {
      const path = `${folder.path}${segment}/`;
      let child = folder.folders.find((candidate) => candidate.path === path);
      if (!child) {
        child = { name: segment, path, folders: [], files: [], fileCount: 0 };
        folder.folders.push(child);
      }
      folder = child;
    }
    folder.files.push(file);
  }

  const sorted = sortFolder(root);
  return { ...sorted, folders: sorted.folders.map(mergeSingleChildFolders) };
}

/** The tree's files from top to bottom, the order the All files view follows. */
export function flattenFileTree(folder: iFileTreeFolder): iSnapshotFile[] {
  return [...folder.folders.flatMap(flattenFileTree), ...folder.files];
}
