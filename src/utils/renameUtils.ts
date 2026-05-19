import { RENAME_RULES } from '@/types/audio';
import { CategoryRule, DEFAULT_CATEGORIES } from './categoryConfig';

/**
 * Remove unnecessary symbols and clean the filename.
 */
const cleanSymbols = (name: string): string => {
  return name
    .replace(/[-._!@#$%^&*()+={}\];:'",<>/?\\|`~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Categorize audio file based on its name using provided rules.
 */
export const categorizeTrack = (filename: string, rules: CategoryRule[] = DEFAULT_CATEGORIES): string => {
  const lowerName = filename.toLowerCase();

  for (const rule of rules) {
    if (rule.active === false) continue;
    if (rule.keywords.some(keyword => lowerName.includes(keyword.toLowerCase()))) {
      return rule.name;
    }
  }

  return 'Other';
};

/**
 * Main renaming logic.
 */
export const applyAutoRename = (filename: string, categoryRules: CategoryRule[] = DEFAULT_CATEGORIES): string => {
  const ext = filename.match(/\.[^/.]+$/)?.[0] || '';
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  // Strip existing category suffix (text in parentheses at the end) to prevent duplication
  const baseNameWithoutCategory = nameWithoutExt.replace(/\s*\([^)]+\)\s*$/, '').trim();
  const lowerName = baseNameWithoutCategory.toLowerCase();

  // Clean unnecessary symbols
  const cleanedName = cleanSymbols(baseNameWithoutCategory);
  const category = categorizeTrack(cleanedName, categoryRules);

  // Find keyword in name
  for (const rule of RENAME_RULES) {
    for (const keyword of rule.keywords) {
      if (lowerName.includes(keyword)) {
        // If keyword found, format nicely
        const keywordName =
          keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase();
        return `${keywordName} (${category})${ext}`;
      }
    }
  }

  // If not recognized by RENAME_RULES, just clean name and add category
  return `${cleanedName} (${category})${ext}`;
};

/**
 * Apply renaming to all filenames and ensure uniqueness.
 */
export const applyAutoRenameAll = (filenames: string[], categoryRules: CategoryRule[] = DEFAULT_CATEGORIES): string[] => {
  const usedNames = new Set<string>();
  const baseNameCounts: Record<string, number> = {};
  const result: string[] = [];

  const cleanFilename = (filename: string): string => {
    return filename.replace(/[<>:"/\\|?*]/g, '');
  };

  for (const original of filenames) {
    const cleanedOriginal = cleanFilename(original);
    const renamed = applyAutoRename(cleanedOriginal, categoryRules);

    const ext = renamed.match(/\.[^/.]+$/)?.[0] || '';
    const nameWithoutExt = renamed.replace(/\.[^/.]+$/, '');
    const categoryMatch = nameWithoutExt.match(/^(.+?)(\s*\([^)]+\))$/);

    let baseName = nameWithoutExt;
    let category = '';

    if (categoryMatch) {
      baseName = categoryMatch[1];
      category = categoryMatch[2];
    }

    let finalName = renamed;

    // Keep incrementing until we find a unique name
    // Use baseName for counting, not the full name
    while (usedNames.has(finalName)) {
      baseNameCounts[baseName] = (baseNameCounts[baseName] || 1) + 1;

      if (category) {
        finalName = `${baseName}_${baseNameCounts[baseName]}${category}${ext}`;
      } else {
        finalName = `${baseName}_${baseNameCounts[baseName]}${ext}`;
      }
    }

    usedNames.add(finalName);
    result.push(finalName);
  }

  return result;
};

