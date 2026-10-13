import { TFile, TFolder, Vault } from 'obsidian';

/**
 * Retrieves all markdown files located under a specific folder path.
 * Traverses only the target folder and its subdirectories, avoiding full-vault enumeration.
 */
export function getMarkdownFilesUnderFolder(vault: Vault, folderPath: string): TFile[] {
  const cleanPath = folderPath.replace(/\/+$/, '');
  const item = vault.getAbstractFileByPath(cleanPath);
  if (!(item instanceof TFolder)) {
    return [];
  }

  const files: TFile[] = [];
  const collect = (folder: TFolder) => {
    for (const child of folder.children) {
      if (child instanceof TFile && child.extension === 'md') {
        files.push(child);
      } else if (child instanceof TFolder) {
        collect(child);
      }
    }
  };

  collect(item);
  return files;
}
