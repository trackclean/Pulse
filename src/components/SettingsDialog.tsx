import { useState, useEffect, useCallback, useRef } from 'react';
import { getVersion } from '@tauri-apps/api/app';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { PulseLogo } from '@/components/PulseLogo';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AppSettings, ExportFormat, FolderStructure, Theme, THEME_WAVEFORM_COLORS, KeyBindings, KEYBINDING_LABELS, DEFAULT_KEYBINDINGS } from '@/utils/categoryConfig';
import { Settings, Save, Palette, FileCog, FolderOutput, Activity, RotateCcw, RefreshCw, Info, Monitor, Play, History, Type, Keyboard } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DEFAULT_SETTINGS } from '@/utils/categoryConfig';
import { formatBinding, eventToBinding, isReservedBinding, isValidBinding } from '@/utils/keybindings';

interface SettingsDialogProps {
    settings: AppSettings;
    onSave: (settings: AppSettings) => void;
    onResetCategories: () => void;
}

type ThemeMode = 'dark' | 'light';
type ThemePalette = 'default' | 'midnight' | 'forest' | 'sunset';

const THEME_BY_MODE_AND_PALETTE: Record<ThemeMode, Record<ThemePalette, Theme>> = {
    dark: {
        default: 'default',
        midnight: 'midnight',
        forest: 'forest',
        sunset: 'sunset',
    },
    light: {
        default: 'light',
        midnight: 'light-midnight',
        forest: 'light-forest',
        sunset: 'light-sunset',
    },
};

const PALETTE_META: { id: ThemePalette; name: string; color: string }[] = [
    { id: 'default', name: 'Cyberpunk Neon', color: 'bg-cyan-500' },
    { id: 'midnight', name: 'Midnight Blue', color: 'bg-indigo-500' },
    { id: 'forest', name: 'Deep Forest', color: 'bg-emerald-500' },
    { id: 'sunset', name: 'Warm Sunset', color: 'bg-orange-500' },
];

export const SettingsDialog = ({ settings, onSave, onResetCategories }: SettingsDialogProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
    const [hasCustomWaveformColor, setHasCustomWaveformColor] = useState(false);
    const [appVersion, setAppVersion] = useState<string>('');
    const [checkingUpdate, setCheckingUpdate] = useState(false);
    const [updateCheckMessage, setUpdateCheckMessage] = useState<string | null>(null);
    const updateCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const updateCheckListenerRef = useRef<((e: Event) => void) | null>(null);
    const [recordingAction, setRecordingAction] = useState<keyof KeyBindings | null>(null);
    const [systemPrefersDark, setSystemPrefersDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

    const getEffectiveTheme = useCallback((theme: Theme): Exclude<Theme, 'system'> => {
        if (theme !== 'system') return theme;
        return systemPrefersDark ? 'default' : 'light';
    }, [systemPrefersDark]);

    const getThemeDefaultWaveformColor = useCallback((theme: Theme) => {
        const effectiveTheme = getEffectiveTheme(theme);
        return THEME_WAVEFORM_COLORS[effectiveTheme] || '';
    }, [getEffectiveTheme]);

    const getThemeMode = useCallback((theme: Theme): ThemeMode => {
        const effectiveTheme = getEffectiveTheme(theme);
        return effectiveTheme.startsWith('light') ? 'light' : 'dark';
    }, [getEffectiveTheme]);

    const getThemePalette = useCallback((theme: Theme): ThemePalette => {
        const effectiveTheme = getEffectiveTheme(theme);
        switch (effectiveTheme) {
            case 'midnight':
            case 'light-midnight':
                return 'midnight';
            case 'forest':
            case 'light-forest':
                return 'forest';
            case 'sunset':
            case 'light-sunset':
                return 'sunset';
            default:
                return 'default';
        }
    }, [getEffectiveTheme]);

    const applyThemeToRoot = useCallback((root: HTMLElement, theme: Theme) => {
        const effectiveTheme = getEffectiveTheme(theme);
        if (effectiveTheme === 'default') {
            root.removeAttribute('data-theme');
        } else {
            root.setAttribute('data-theme', effectiveTheme);
        }
    }, [getEffectiveTheme]);

    useEffect(() => {
        getVersion().then(setAppVersion).catch(() => setAppVersion(''));
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
        setSystemPrefersDark(mediaQuery.matches);
        mediaQuery.addEventListener('change', onChange);
        return () => mediaQuery.removeEventListener('change', onChange);
    }, []);

    // Keybinding recording: capture next keypress when in recording mode
    useEffect(() => {
        if (!recordingAction) return;

        const handler = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const binding = eventToBinding(e);
            if (!binding) return; // standalone modifier, ignore

            if (isReservedBinding(binding)) {
                toast.error(`${formatBinding(binding)} is reserved and cannot be used`);
                setRecordingAction(null);
                return;
            }

            if (!isValidBinding(binding)) {
                setRecordingAction(null);
                return;
            }

            // Check for conflicts
            const kb = localSettings.keybindings;
            for (const [action, existing] of Object.entries(kb)) {
                if (action !== recordingAction && existing.toLowerCase() === binding.toLowerCase()) {
                    toast.warning(`${formatBinding(binding)} is already used by "${KEYBINDING_LABELS[action as keyof KeyBindings]}"`);
                    setRecordingAction(null);
                    return;
                }
            }

            setLocalSettings({
                ...localSettings,
                keybindings: { ...localSettings.keybindings, [recordingAction]: binding },
            });
            setRecordingAction(null);
        };

        window.addEventListener('keydown', handler, true);
        return () => window.removeEventListener('keydown', handler, true);
    }, [recordingAction, localSettings]);

    const handleCheckForUpdates = useCallback(() => {
        setCheckingUpdate(true);
        setUpdateCheckMessage(null);

        if (updateCheckTimeoutRef.current) {
            clearTimeout(updateCheckTimeoutRef.current);
            updateCheckTimeoutRef.current = null;
        }

        if (updateCheckListenerRef.current) {
            window.removeEventListener('update-check-complete', updateCheckListenerRef.current);
            updateCheckListenerRef.current = null;
        }

        const onResult = (e: Event) => {
            const { found, error } = (e as CustomEvent).detail;
            if (updateCheckListenerRef.current) {
                window.removeEventListener('update-check-complete', updateCheckListenerRef.current);
                updateCheckListenerRef.current = null;
            }
            if (updateCheckTimeoutRef.current) {
                clearTimeout(updateCheckTimeoutRef.current);
                updateCheckTimeoutRef.current = null;
            }
            setCheckingUpdate(false);
            if (error) {
                const msg = (e as CustomEvent).detail.message;
                setUpdateCheckMessage(
                    msg?.includes('os error')
                        ? "Couldn't connect. Check your internet connection or firewall settings."
                        : "Couldn't connect. Check your internet connection."
                );
            } else if (!found) {
                setUpdateCheckMessage("You're up to date!");
            }
            // If found, UpdateChecker handles the dialog/toast — no message needed here
        };

        updateCheckListenerRef.current = onResult;
        window.addEventListener('update-check-complete', onResult);
        window.dispatchEvent(new Event('trigger-update-check'));

        // Fallback: clear loading state after 15s if no response
        updateCheckTimeoutRef.current = setTimeout(() => {
            if (updateCheckListenerRef.current) {
                window.removeEventListener('update-check-complete', updateCheckListenerRef.current);
                updateCheckListenerRef.current = null;
            }
            setCheckingUpdate(false);
            updateCheckTimeoutRef.current = null;
        }, 15000);
    }, []);

    useEffect(() => {
        return () => {
            if (updateCheckTimeoutRef.current) {
                clearTimeout(updateCheckTimeoutRef.current);
                updateCheckTimeoutRef.current = null;
            }
            if (updateCheckListenerRef.current) {
                window.removeEventListener('update-check-complete', updateCheckListenerRef.current);
                updateCheckListenerRef.current = null;
            }
        };
    }, []);

    // Update local settings when prop changes (e.g. initial load)
    useEffect(() => {
        setLocalSettings(settings);
        // Check if user has set a custom waveform color
        const themeDefault = getThemeDefaultWaveformColor(settings.theme);
        setHasCustomWaveformColor(!!settings.waveformColor && settings.waveformColor !== themeDefault);
    }, [settings, getThemeDefaultWaveformColor]);

    // Handle theme change - automatically update waveform color if not customized
    const handleThemeChange = (newTheme: Theme) => {
        const newSettings = { ...localSettings, theme: newTheme };
        
        // If user hasn't set a custom waveform color, update it to match the theme
        if (!hasCustomWaveformColor) {
            newSettings.waveformColor = newTheme === 'system'
                ? ''
                : getThemeDefaultWaveformColor(newTheme);
        }
        
        setLocalSettings(newSettings);
    };

    // Handle waveform color change - mark as custom
    const handleWaveformColorChange = (color: string) => {
        setLocalSettings({ ...localSettings, waveformColor: color });
        setHasCustomWaveformColor(true);
    };

    // Reset waveform color to theme default
    const handleResetWaveformColor = () => {
        const themeDefault = localSettings.theme === 'system'
            ? ''
            : getThemeDefaultWaveformColor(localSettings.theme);
        setLocalSettings({ ...localSettings, waveformColor: themeDefault });
        setHasCustomWaveformColor(false);
    };

    // Instant Preview: Apply settings to DOM whenever localSettings changes while dialog is open
    useEffect(() => {
        if (!isOpen) return;

        const root = window.document.documentElement;

        // Apply Theme
        applyThemeToRoot(root, localSettings.theme);

        // Apply Waveform Color
        if (localSettings.waveformColor) {
            root.style.setProperty('--waveform-wave', localSettings.waveformColor);
            root.style.setProperty('--waveform-progress', localSettings.waveformColor);
        } else {
            root.style.removeProperty('--waveform-wave');
            root.style.removeProperty('--waveform-progress');
        }

        // Notify components of theme change
        window.dispatchEvent(new CustomEvent('theme-change'));

    }, [localSettings, isOpen, applyThemeToRoot]);

    const handleOpenChange = (open: boolean) => {
        if (open) {
            setLocalSettings({ ...settings });
            const themeDefault = getThemeDefaultWaveformColor(settings.theme);
            setHasCustomWaveformColor(!!settings.waveformColor && settings.waveformColor !== themeDefault);
        } else {
            // Revert to original settings if closed without saving
            const root = window.document.documentElement;

            // Revert Theme
            applyThemeToRoot(root, settings.theme);

            // Revert Waveform Color
            if (settings.waveformColor) {
                root.style.setProperty('--waveform-wave', settings.waveformColor);
                root.style.setProperty('--waveform-progress', settings.waveformColor);
            } else {
                root.style.removeProperty('--waveform-wave');
                root.style.removeProperty('--waveform-progress');
            }
        }
        setIsOpen(open);
    };

    const handleSave = () => {
        onSave(localSettings);
        setIsOpen(false);
        toast.success('Settings saved');
    };

    const handleResetDefaults = () => {
        if (confirm('Are you sure you want to reset all settings AND categories to their default values? This cannot be undone.')) {
            setLocalSettings(DEFAULT_SETTINGS);
            onResetCategories();
            toast.success('Settings and categories reset to defaults');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Settings">
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl h-[80vh] max-h-[800px] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Options</DialogTitle>
                    <DialogDescription>
                        Configure application settings and preferences.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="general" className="w-full flex-1 min-h-0 flex flex-col">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="export">Export</TabsTrigger>
                        <TabsTrigger value="appearance">Appearance</TabsTrigger>
                        <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
                        <TabsTrigger value="about">About</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                        <TabsContent value="general" className="space-y-6 mt-0">
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <FileCog className="w-4 h-4" />
                                    Processing & Analysis
                                </h3>
                                <div className="space-y-3 border p-3 rounded-md bg-muted/50">
                                    <div className="flex items-center justify-between space-x-2">
                                        <Label htmlFor="auto-rename" className="flex-1 cursor-pointer">
                                            Auto-rename on import
                                            <span className="block text-xs text-muted-foreground font-normal mt-1">
                                                Automatically categorize and rename files when added
                                            </span>
                                        </Label>
                                        <Switch
                                            id="auto-rename"
                                            checked={localSettings.autoRenameOnImport}
                                            onCheckedChange={(checked) => setLocalSettings({ ...localSettings, autoRenameOnImport: checked })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between space-x-2">
                                        <Label htmlFor="key-detection" className="flex-1 cursor-pointer">
                                            Detect musical key
                                            <span className="block text-xs text-muted-foreground font-normal mt-1">
                                                Analyze imported audio and estimate its key (best for tonal material)
                                            </span>
                                        </Label>
                                        <Switch
                                            id="key-detection"
                                            checked={localSettings.enableKeyDetection}
                                            onCheckedChange={(checked) => setLocalSettings({ ...localSettings, enableKeyDetection: checked })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between space-x-2">
                                        <Label htmlFor="auto-categorize" className="flex-1 cursor-pointer">
                                            Auto-categorize on import
                                            <span className="block text-xs text-muted-foreground font-normal mt-1">
                                                Automatically assign categories based on filename keywords
                                            </span>
                                        </Label>
                                        <Switch
                                            id="auto-categorize"
                                            checked={localSettings.enableAutoCategorization}
                                            onCheckedChange={(checked) => setLocalSettings({ ...localSettings, enableAutoCategorization: checked })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between space-x-2">
                                        <Label htmlFor="notifications" className="flex-1 cursor-pointer">
                                            Notifications
                                            <span className="block text-xs text-muted-foreground font-normal mt-1">
                                                Show toast notifications for actions and background tasks
                                            </span>
                                        </Label>
                                        <Switch
                                            id="notifications"
                                            checked={localSettings.enableNotifications}
                                            onCheckedChange={(checked) => setLocalSettings({ ...localSettings, enableNotifications: checked })}
                                        />
                                    </div>
                                </div>

                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <Monitor className="w-4 h-4" />
                                    Track Display
                                </h3>
                                <div className="space-y-3 border p-3 rounded-md bg-muted/50">
                                    <div className="flex items-center justify-between space-x-2">
                                        <Label htmlFor="show-bpm" className="flex-1 cursor-pointer font-normal">
                                            Show BPM on track
                                            <span className="block text-xs text-muted-foreground font-normal mt-1">
                                                Toggle the BPM badge/edit control on each track
                                            </span>
                                        </Label>
                                        <Switch
                                            id="show-bpm"
                                            checked={localSettings.showBpmOnTrack}
                                            onCheckedChange={(checked) => setLocalSettings({ ...localSettings, showBpmOnTrack: checked })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between space-x-2">
                                        <Label htmlFor="show-key" className="flex-1 cursor-pointer font-normal">
                                            Show key on track
                                            <span className="block text-xs text-muted-foreground font-normal mt-1">
                                                Toggle the musical key selector/badge on each track
                                            </span>
                                        </Label>
                                        <Switch
                                            id="show-key"
                                            checked={localSettings.showKeyOnTrack}
                                            onCheckedChange={(checked) => setLocalSettings({ ...localSettings, showKeyOnTrack: checked })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between space-x-2">
                                        <Label htmlFor="show-category" className="flex-1 cursor-pointer font-normal">
                                            Show category on track
                                            <span className="block text-xs text-muted-foreground font-normal mt-1">
                                                Toggle the category selector on each track
                                            </span>
                                        </Label>
                                        <Switch
                                            id="show-category"
                                            checked={localSettings.showCategoryOnTrack}
                                            onCheckedChange={(checked) => setLocalSettings({ ...localSettings, showCategoryOnTrack: checked })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between space-x-2">
                                        <Label htmlFor="show-tuner" className="flex-1 cursor-pointer font-normal">
                                            Show tuner on track
                                            <span className="block text-xs text-muted-foreground font-normal mt-1">
                                                Toggle the tuner button on each track
                                            </span>
                                        </Label>
                                        <Switch
                                            id="show-tuner"
                                            checked={localSettings.showTunerOnTrack}
                                            onCheckedChange={(checked) => setLocalSettings({ ...localSettings, showTunerOnTrack: checked })}
                                        />
                                    </div>
                                </div>

                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <Type className="w-4 h-4" />
                                    Naming
                                </h3>
                                <div className="space-y-3 border p-3 rounded-md bg-muted/50">
                                    <Label>Naming Convention</Label>

                                    <div className="space-y-2">
                                        <Label htmlFor="naming-preset" className="text-xs text-muted-foreground">Preset</Label>
                                        <select
                                            id="naming-preset"
                                            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            value={localSettings.namingPattern}
                                            onChange={(e) => setLocalSettings({ ...localSettings, namingPattern: e.target.value })}
                                        >
                                            <option value="{name} ({category})">Standard: Name (Category)</option>
                                            <option value="{name} ({category}) [{key}]">Standard + Key: Name (Category) [Key]</option>
                                            <option value="{name} ({category}) [{bpm}]">Standard + BPM: Name (Category) [BPM]</option>
                                            <option value="{name} ({category}) [{key}] [{bpm}]">Standard + Key + BPM: Name (Category) [Key] [BPM]</option>
                                            <option value="{category} - {name}">Prefix: Category - Name</option>
                                            <option value="{category} - {name} [{key}]">Prefix + Key: Category - Name [Key]</option>
                                            <option value="{name}_{category}">Snake: Name_Category</option>
                                            <option value="{name}_{category}_{key}">Snake + Key: Name_Category_Key</option>
                                            <option value="{name}">Simple: Name only</option>
                                            <option value="{name} ({key})">Name + Key: Name (Key)</option>
                                            <option value="custom">Custom...</option>
                                        </select>
                                    </div>

                                    {localSettings.namingPattern === 'custom' ||
                                        !['{name} ({category})', '{category} - {name}', '{name}_{category}', '{name}'].includes(localSettings.namingPattern) ? (
                                        <div className="space-y-2">
                                            <Label htmlFor="custom-pattern" className="text-xs text-muted-foreground">Custom Pattern</Label>
                                            <Input
                                                id="custom-pattern"
                                                value={localSettings.namingPattern}
                                                onChange={(e) => setLocalSettings({ ...localSettings, namingPattern: e.target.value })}
                                                placeholder="{name} ({category})"
                                            />
                                        </div>
                                    ) : null}

                                    <div className="bg-background p-2 rounded border text-xs font-mono text-muted-foreground">
                                        Preview: <span className="text-foreground font-medium">
                                            {localSettings.namingPattern
                                                .replace('{name}', 'Kick')
                                                .replace('{category}', 'Drums')
                                                .replace('{key}', 'C#m')
                                                .replace('{bpm}', '128 BPM')}.wav
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Available tokens: <span className="font-mono">{'{name}'}</span>, <span className="font-mono">{'{category}'}</span>, <span className="font-mono">{'{key}'}</span>, <span className="font-mono">{'{bpm}'}</span>
                                    </p>
                                </div>

                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <Play className="w-4 h-4" />
                                    Playback
                                </h3>
                                <div className="space-y-3 border p-3 rounded-md bg-muted/50">
                                    <Label>Playback Behavior</Label>
                                    <div className="flex items-center justify-between space-x-2">
                                        <Label htmlFor="reset-pos" className="flex-1 cursor-pointer font-normal">
                                            Reset position on stop
                                            <span className="block text-xs text-muted-foreground mt-1">
                                                When switching tracks, reset the previous track to the beginning
                                            </span>
                                        </Label>
                                        <Switch
                                            id="reset-pos"
                                            checked={localSettings.resetPositionOnStop}
                                            onCheckedChange={(checked) => setLocalSettings({ ...localSettings, resetPositionOnStop: checked })}
                                        />
                                    </div>
                                </div>

                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <History className="w-4 h-4" />
                                    History
                                </h3>
                                <div className="space-y-3 border p-3 rounded-md bg-muted/50">
                                    <Label htmlFor="max-undo">Max Undo History</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="max-undo"
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={localSettings.maxUndoHistory}
                                            onChange={(e) => setLocalSettings({ ...localSettings, maxUndoHistory: parseInt(e.target.value) || 50 })}
                                            className="w-24"
                                        />
                                        <span className="text-xs text-muted-foreground">actions</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Number of actions you can undo (higher values use more memory).
                                    </p>
                                </div>

                                <div className="pt-4 border-t">
                                    <Button 
                                        variant="destructive" 
                                        size="sm" 
                                        onClick={handleResetDefaults}
                                        className="w-full sm:w-auto"
                                    >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Restore Default Settings
                                    </Button>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Reset all settings and categories to their original values. This does not affect your files.
                                    </p>
                                </div>

                            </div>
                        </TabsContent>

                        <TabsContent value="export" className="space-y-6 mt-0">
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <FolderOutput className="w-4 h-4" />
                                    Export Settings
                                </h3>

                                <div className="space-y-3 border p-3 rounded-md bg-muted/50">
                                    <Label>Export Format</Label>
                                    <RadioGroup
                                        value={localSettings.exportFormat}
                                        onValueChange={(val) => setLocalSettings({ ...localSettings, exportFormat: val as ExportFormat })}
                                    >
                                        <div className="flex items-start space-x-2">
                                            <RadioGroupItem value="folder" id="fmt-folder" className="mt-0.5" />
                                            <Label htmlFor="fmt-folder" className="font-normal cursor-pointer">
                                                Direct Copy (Folder)
                                                <span className="block text-xs text-muted-foreground font-normal mt-0.5">Copy files directly to a folder on disk</span>
                                            </Label>
                                        </div>
                                        <div className="flex items-start space-x-2">
                                            <RadioGroupItem value="zip" id="fmt-zip" className="mt-0.5" />
                                            <Label htmlFor="fmt-zip" className="font-normal cursor-pointer">
                                                Zip Archive (.zip)
                                                <span className="block text-xs text-muted-foreground font-normal mt-0.5">Bundle everything into a single compressed file</span>
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div className="space-y-3 border p-3 rounded-md bg-muted/50">
                                    <Label>Folder Structure</Label>
                                    <RadioGroup
                                        value={localSettings.folderStructure}
                                        onValueChange={(val) => setLocalSettings({ ...localSettings, folderStructure: val as FolderStructure })}
                                    >
                                        <div className="flex items-start space-x-2">
                                            <RadioGroupItem value="categorized" id="struct-cat" className="mt-0.5" />
                                            <Label htmlFor="struct-cat" className="font-normal cursor-pointer">
                                                Categorized (Subfolders)
                                                <span className="block text-xs text-muted-foreground font-normal mt-0.5">Organize into Drums/, Bass/, Synths/ etc.</span>
                                            </Label>
                                        </div>
                                        <div className="flex items-start space-x-2">
                                            <RadioGroupItem value="flat" id="struct-flat" className="mt-0.5" />
                                            <Label htmlFor="struct-flat" className="font-normal cursor-pointer">
                                                Flat (All in one folder)
                                                <span className="block text-xs text-muted-foreground font-normal mt-0.5">All files in a single directory</span>
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="appearance" className="space-y-6 mt-0">
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <Palette className="w-4 h-4" />
                                    Theme
                                </h3>

                                <div className="flex gap-2">
                                    {(['dark', 'light'] as ThemeMode[]).map((mode) => {
                                        const selected = getThemeMode(localSettings.theme) === mode;
                                        return (
                                            <Button
                                                key={mode}
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className={selected ? 'bg-accent text-accent-foreground' : ''}
                                                onClick={() => handleThemeChange(THEME_BY_MODE_AND_PALETTE[mode][getThemePalette(localSettings.theme)])}
                                            >
                                                {mode === 'dark' ? 'Dark' : 'Light'}
                                            </Button>
                                        );
                                    })}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className={localSettings.theme === 'system' ? 'bg-accent text-accent-foreground' : ''}
                                        onClick={() => handleThemeChange('system')}
                                    >
                                        System
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {PALETTE_META.map((theme) => (
                                        <div
                                            key={theme.id}
                                            className={`
                                                cursor-pointer rounded-lg border-2 p-4 hover:bg-muted/50 transition-all
                                                ${getThemePalette(localSettings.theme) === theme.id ? 'border-primary bg-muted' : 'border-transparent bg-muted/30'}
                                            `}
                                            onClick={() => handleThemeChange(THEME_BY_MODE_AND_PALETTE[getThemeMode(localSettings.theme)][theme.id])}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded-full ${theme.color}`} />
                                                <span className="font-medium text-sm">{theme.name}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <Activity className="w-4 h-4" />
                                    Waveform Color
                                </h3>
                                <div className="flex items-center gap-4 border p-3 rounded-md bg-muted/50">
                                    <div className="relative">
                                        <Input
                                            type="color"
                                            value={localSettings.waveformColor || getThemeDefaultWaveformColor(localSettings.theme)}
                                            onChange={(e) => handleWaveformColorChange(e.target.value)}
                                            className="w-12 h-12 p-1 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Label>Custom Color</Label>
                                        <p className="text-xs text-muted-foreground">
                                            {hasCustomWaveformColor 
                                                ? 'Custom waveform color set. Click reset to use theme default.'
                                                : 'Automatically matches the selected theme.'}
                                        </p>
                                    </div>
                                    {hasCustomWaveformColor && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleResetWaveformColor}
                                        >
                                            Reset
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="shortcuts" className="space-y-6 mt-0">
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <Keyboard className="w-4 h-4" />
                                    Keyboard Shortcuts
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Click a shortcut to reassign it. Press any key combination to set the new binding.
                                </p>
                                <div className="border rounded-md bg-muted/50 divide-y divide-border">
                                    {(Object.keys(KEYBINDING_LABELS) as (keyof KeyBindings)[]).map((action) => (
                                        <div key={action} className="flex items-center justify-between px-4 py-2.5">
                                            <span className="text-sm">{KEYBINDING_LABELS[action]}</span>
                                            <button
                                                type="button"
                                                className={`
                                                    font-mono text-xs px-3 py-1.5 rounded border transition-all min-w-[100px] text-center
                                                    ${recordingAction === action
                                                        ? 'bg-primary text-primary-foreground border-primary animate-pulse'
                                                        : 'bg-background border-border hover:border-primary/50 hover:bg-muted cursor-pointer'
                                                    }
                                                `}
                                                onClick={() => setRecordingAction(recordingAction === action ? null : action)}
                                            >
                                                {recordingAction === action
                                                    ? 'Press a key...'
                                                    : formatBinding(localSettings.keybindings[action])
                                                }
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setLocalSettings({
                                                ...localSettings,
                                                keybindings: { ...DEFAULT_KEYBINDINGS },
                                            });
                                            setRecordingAction(null);
                                            toast.success('Shortcuts reset to defaults');
                                        }}
                                    >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Reset to Defaults
                                    </Button>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    Note: F5 and Ctrl+R are reserved to prevent accidental page refresh.
                                    Toggle Sidebar (Ctrl+B) is not customizable.
                                </p>
                            </div>
                        </TabsContent>

                        <TabsContent value="about" className="space-y-6 mt-0">
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <Info className="w-4 h-4" />
                                    About
                                </h3>
                                <div className="border p-4 rounded-md bg-muted/50 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <PulseLogo className="h-10 w-10" />
                                        <div>
                                            <p className="text-sm font-semibold">Pulse</p>
                                            {appVersion && (
                                                <p className="text-xs text-muted-foreground">Version {appVersion}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4" />
                                    Updates
                                </h3>
                                <div className="border p-4 rounded-md bg-muted/50 space-y-3">
                                    <p className="text-xs text-muted-foreground">
                                        Pulse checks for updates automatically on startup.
                                        You can also check manually at any time.
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCheckForUpdates}
                                            disabled={checkingUpdate}
                                        >
                                            <RefreshCw className={`w-4 h-4 mr-2 ${checkingUpdate ? 'animate-spin' : ''}`} />
                                            {checkingUpdate ? 'Checking...' : 'Check for Updates'}
                                        </Button>
                                        {updateCheckMessage && (
                                            <span className="text-xs text-muted-foreground">{updateCheckMessage}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
