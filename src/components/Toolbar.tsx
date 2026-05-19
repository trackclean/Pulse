import { memo, forwardRef } from 'react';
import { Button } from './ui/button';
import { ScanSearch, Type, Download, Trash2, Search, CheckSquare, Square, X, RotateCcw, Folder, ArrowDownAZ, ArrowUpAZ, Clock, Undo2, Music2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { CategoryManager } from './CategoryManager';
import { SettingsDialog } from './SettingsDialog';
import { CategoryRule, AppSettings } from '@/utils/categoryConfig';

interface ToolbarProps {
  onAnalyzeSilence: () => void;
  onAutoRename: () => void;
  onExport: () => void;
  onDeleteSilent: () => void;
  onDetectKey: () => void;
  onOrganizationChange: (mode: 'category' | 'alphabetical-asc' | 'alphabetical-desc' | 'import-order') => void;
  organizationMode: 'category' | 'alphabetical-asc' | 'alphabetical-desc' | 'import-order';
  fileCount: number;
  silentCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteSelected: () => void;
  onBatchCategorize: (category: string) => void;
  onReverseRename: () => void;
  onUndo: () => void;
  canUndo: boolean;
  categories: CategoryRule[];
  onSaveCategories: (categories: CategoryRule[], reassignments?: Record<string, string>) => void;
  fileCounts?: Record<string, number>;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onResetCategories: () => void;
  duplicateCount: number;
  onDeleteDuplicates: () => void;
}

const ToolbarComponent = forwardRef<HTMLInputElement, ToolbarProps>(({
  onAnalyzeSilence,
  onAutoRename,
  onExport,
  onDeleteSilent,
  onDetectKey,
  onOrganizationChange,
  organizationMode,
  fileCount,
  silentCount,
  searchQuery,
  onSearchChange,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
  onBatchCategorize,
  onReverseRename,
  onUndo,
  canUndo,
  categories,
  onSaveCategories,
  fileCounts = {},
  settings,
  onSaveSettings,
  onResetCategories,
  duplicateCount = 0,
  onDeleteDuplicates,
}: ToolbarProps, ref) => {
  const allSelected = fileCount > 0 && selectedCount === fileCount;

  return (
    <div className="bg-gradient-card rounded-lg p-4 shadow-card border border-border space-y-4">
      {/* Top Row: Search and Global Settings */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        {/* Search - Grows to fill available space */}
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={ref}
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* View & Config Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="w-[200px]">
            <Select
              value={organizationMode}
              onValueChange={(value) => onOrganizationChange(value as ToolbarProps["organizationMode"])}
              disabled={fileCount === 0}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Organize by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="category">
                  <div className="flex items-center">
                    <Folder className="w-4 h-4 mr-2" />
                    Group by Category
                  </div>
                </SelectItem>
                <SelectItem value="alphabetical-asc">
                  <div className="flex items-center">
                    <ArrowDownAZ className="w-4 h-4 mr-2" />
                    Alphabetical (A-Z)
                  </div>
                </SelectItem>
                <SelectItem value="alphabetical-desc">
                  <div className="flex items-center">
                    <ArrowUpAZ className="w-4 h-4 mr-2" />
                    Alphabetical (Z-A)
                  </div>
                </SelectItem>
                <SelectItem value="import-order">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    By Import Order
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CategoryManager categories={categories} onSave={onSaveCategories} fileCounts={fileCounts} />
          <SettingsDialog settings={settings} onSave={onSaveSettings} onResetCategories={onResetCategories} />
        </div>
      </div>

      {/* Middle Row: Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/50 pt-4">
        
        {/* Left: Operational Tools */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selection & History */}
          <div className="flex items-center gap-2 mr-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`w-[140px] justify-center ${
                    allSelected
                      ? 'bg-accent text-accent-foreground border-border'
                      : ''
                  }`}
                  onClick={allSelected ? onDeselectAll : onSelectAll}
                >
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4 mr-2" />
                  ) : (
                    <Square className="w-4 h-4 mr-2" />
                  )}
                  Select All
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{allSelected ? 'All files selected. Click to clear selection.' : 'Select all files for batch operations'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onUndo}
                  disabled={!canUndo}
                >
                  <Undo2 className="w-4 h-4 mr-2" />
                  Undo
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Undo last action (Ctrl+Z)</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="h-6 w-px bg-border mx-2 hidden sm:block" />

          <Button
            variant="secondary"
            size="sm"
            onClick={onAnalyzeSilence}
            disabled={fileCount === 0}
          >
            <ScanSearch className="w-4 h-4 mr-2" />
            Analyze Silence
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onDetectKey}
            disabled={fileCount === 0 || !settings.enableKeyDetection}
          >
            <Music2 className="w-4 h-4 mr-2" />
            Auto Detect Key
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onAutoRename}
            disabled={fileCount === 0}
          >
            <Type className="w-4 h-4 mr-2" />
            Auto Rename
          </Button>
        </div>

        {/* Right: Export */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="sm"
              onClick={onExport}
              disabled={fileCount === 0}
              className="bg-gradient-button hover:shadow-button transition-all duration-300"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export files (Ctrl+E)</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Conditional Row: Cleanup Suggestions */}
      {(silentCount > 0 || duplicateCount > 0) && (
         <div className="flex flex-wrap items-center gap-2 bg-destructive/10 p-3 rounded-md border border-destructive/20">
            <span className="text-sm font-medium text-destructive px-2 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Cleanup Suggestions:
            </span>
            {silentCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onDeleteSilent}
                    className="bg-gradient-danger hover:shadow-button transition-all duration-300"
                  >
                    Delete Silent ({silentCount})
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete all silent tracks detected by analysis</p>
                </TooltipContent>
              </Tooltip>
            )}
            {duplicateCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onDeleteDuplicates}
                    className="bg-gradient-danger hover:shadow-button transition-all duration-300"
                  >
                    Remove Duplicates ({duplicateCount})
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remove all duplicate tracks</p>
                </TooltipContent>
              </Tooltip>
            )}
         </div>
      )}

      {/* Batch Selection Controls - positioned below main actions */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap flex-row-reverse gap-2 items-center justify-end pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground">{selectedCount} selected</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onDeselectAll} className="h-7 text-xs">
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Deselect all files</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="destructive" size="sm" onClick={onDeleteSelected} className="h-7 text-xs">
                <Trash2 className="w-3 h-3 mr-1" />
                Delete Selected
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete all selected files from the list</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onReverseRename} className="h-7 text-xs">
                <RotateCcw className="w-3 h-3 mr-1" />
                Restore Original
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Restore selected files to their original names</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className="text-xs text-muted-foreground/70 tabular-nums">
        {fileCount} file{fileCount !== 1 ? 's' : ''} loaded
        {silentCount > 0 && ` · ${silentCount} silent`}
        {duplicateCount > 0 && ` · ${duplicateCount} duplicate${duplicateCount !== 1 ? 's' : ''}`}
      </div>
    </div>
  );
});

ToolbarComponent.displayName = 'Toolbar';

// Memoize to prevent unnecessary re-renders
export const Toolbar = memo(ToolbarComponent);

