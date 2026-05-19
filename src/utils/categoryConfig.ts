
export interface CategoryRule {
    id: string;
    name: string;
    keywords: string[];
    active?: boolean;
}

export const DEFAULT_CATEGORIES: CategoryRule[] = [
    {
        id: 'drums',
        name: 'Drums',
        keywords: ['kick', 'bd', '808', 'snr', 'snare', 'rim', 'hat', 'hh', 'openhat', 'ride', 'crash', 'tom', 'shaker', 'clap', 'perc', 'percussion', 'drum', 'fill', 'drums']
    },
    {
        id: 'bass',
        name: 'Bass',
        keywords: ['bass', 'sub', '808', 'lowend', 'reese', 'pluckbass', 'subbass']
    },
    {
        id: 'synths',
        name: 'Synths',
        keywords: ['synth', 'lead', 'pad', 'arp', 'chord', 'pluck', 'keys', 'melody', 'saw', 'square', 'supersaw']
    },
    {
        id: 'fx',
        name: 'FX',
        keywords: ['fx', 'effect', 'riser', 'sweep', 'impact', 'downlifter', 'uplifter', 'noise', 'transition', 'reverse', 'dropfx', 'hit']
    },
    {
        id: 'vox',
        name: 'Vox',
        keywords: ['vox', 'vocal', 'voice', 'chant', 'adlib', 'phrase', 'acapella', 'talk', 'shout']
    },
    {
        id: 'instruments',
        name: 'Instruments',
        keywords: ['gtr', 'guitar', 'piano', 'key', 'organ', 'string', 'violin', 'brass', 'horn', 'flute', 'trumpet', 'sax', 'instrument', 'pluck', 'harp']
    },
    {
        id: 'background',
        name: 'Background',
        keywords: ['background', 'ambient', 'atmos', 'texture', 'soundscape', 'drone', 'env', 'space', 'field']
    }
];

const STORAGE_KEY = 'clean-track-buddy-categories';

export const loadCategoryConfig = (): CategoryRule[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load category config', e);
    }
    return DEFAULT_CATEGORIES;
};

export const saveCategoryConfig = (config: CategoryRule[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.error('Failed to save category config', e);
    }
};

export type ExportFormat = 'zip' | 'folder';
export type FolderStructure = 'flat' | 'categorized';
export type Theme =
    | 'default'
    | 'midnight'
    | 'forest'
    | 'sunset'
    | 'light'
    | 'light-midnight'
    | 'light-forest'
    | 'light-sunset'
    | 'system';

export const THEME_WAVEFORM_COLORS: Record<string, string> = {
    'default': '#2dd4bf',
    'midnight': '#9333ea',
    'forest': '#22c55e',
    'sunset': '#fb923c',
    'light': '#0ea5e9',
    'light-midnight': '#7c3aed',
    'light-forest': '#16a34a',
    'light-sunset': '#ea580c',
    'system': '#2dd4bf',
};

export interface KeyBindings {
    play: string;
    undo: string;
    search: string;
    selectAll: string;
    export: string;
    autoRename: string;
    deleteSelected: string;
    deselectAll: string;
}

export const DEFAULT_KEYBINDINGS: KeyBindings = {
    play: 'Space',
    undo: 'ctrl+z',
    search: 'ctrl+f',
    selectAll: 'ctrl+a',
    export: 'ctrl+e',
    autoRename: 'F2',
    deleteSelected: 'Delete',
    deselectAll: 'Escape',
};

export const KEYBINDING_LABELS: Record<keyof KeyBindings, string> = {
    play: 'Play / Pause',
    undo: 'Undo',
    search: 'Search',
    selectAll: 'Select All',
    export: 'Export',
    autoRename: 'Auto Rename',
    deleteSelected: 'Delete Selected',
    deselectAll: 'Deselect All',
};

export interface AppSettings {
    includeCategoryInFilename: boolean;
    autoRenameOnImport: boolean;
    exportFormat: ExportFormat;
    folderStructure: FolderStructure;
    namingPattern: string;
    theme: Theme;
    waveformColor: string;
    maxUndoHistory: number;
    resetPositionOnStop: boolean;
    hasCompletedOnboarding: boolean;
    enableKeyDetection: boolean;
    enableBpmDetection: boolean;
    enableAutoCategorization: boolean;
    enableNotifications: boolean;
    notificationOpacity: number;
    showBpmOnTrack: boolean;
    showKeyOnTrack: boolean;
    showCategoryOnTrack: boolean;
    showTunerOnTrack: boolean;
    keybindings: KeyBindings;
}

const SETTINGS_KEY = 'clean-track-buddy-settings';

export const DEFAULT_SETTINGS: AppSettings = {
    includeCategoryInFilename: true,
    autoRenameOnImport: false,
    exportFormat: 'folder',
    folderStructure: 'categorized',
    namingPattern: '{name} ({category})',
    theme: 'default',
    waveformColor: '',
    maxUndoHistory: 50,
    resetPositionOnStop: false,
    hasCompletedOnboarding: false,
    enableKeyDetection: true,
    enableBpmDetection: true,
    enableAutoCategorization: true,
    enableNotifications: true,
    notificationOpacity: 0.7,
    showBpmOnTrack: true,
    showKeyOnTrack: true,
    showCategoryOnTrack: true,
    showTunerOnTrack: true,
    keybindings: { ...DEFAULT_KEYBINDINGS },
};

export const areNotificationsEnabled = (): boolean => {
    if (typeof window === 'undefined') return true;
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (!stored) {
            return DEFAULT_SETTINGS.enableNotifications;
        }
        const parsed = JSON.parse(stored);
        return parsed.enableNotifications !== false;
    } catch (e) {
        console.error('Failed to read notification setting', e);
        return DEFAULT_SETTINGS.enableNotifications;
    }
};

export const loadSettings = (): AppSettings => {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Deep-merge keybindings so new actions get defaults
            const keybindings = { ...DEFAULT_KEYBINDINGS, ...(parsed.keybindings ?? {}) };
            const opacity = typeof parsed.notificationOpacity === 'number'
                ? Math.min(1, Math.max(0.3, parsed.notificationOpacity))
                : DEFAULT_SETTINGS.notificationOpacity;
            return { ...DEFAULT_SETTINGS, ...parsed, keybindings, notificationOpacity: opacity };
        }
    } catch (e) {
        console.error('Failed to load settings', e);
    }
    return { ...DEFAULT_SETTINGS };
};

export const saveSettings = (settings: AppSettings) => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save settings', e);
    }
};
