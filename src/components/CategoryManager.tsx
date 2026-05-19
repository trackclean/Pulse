import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CategoryRule, DEFAULT_CATEGORIES } from '@/utils/categoryConfig';
import { Plus, Trash2, X, Save, Settings2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CategoryManagerProps {
    categories: CategoryRule[];
    fileCounts: Record<string, number>;
    onSave: (categories: CategoryRule[], reassignments?: Record<string, string>) => void;
}

const normalizeCategoryName = (name: string) =>
    name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

const formatKeywordLabel = (keyword: string) =>
    keyword
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

const normalizeCategories = (items: CategoryRule[]) =>
    items.map((category) => {
        const normalizedName = normalizeCategoryName(category.name);
        return {
            ...category,
            name: normalizedName,
            id: normalizedName.toLowerCase().replace(/\s+/g, '-'),
        };
    });

export const CategoryManager = ({ categories, fileCounts, onSave }: CategoryManagerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [localCategories, setLocalCategories] = useState<CategoryRule[]>(() => normalizeCategories(categories));
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categoryToDelete, setCategoryToDelete] = useState<CategoryRule | null>(null);
    const [reassignTarget, setReassignTarget] = useState<string>('');
    const [reassignments, setReassignments] = useState<Record<string, string>>({});

    // Sync with props when opening
    const handleOpenChange = (open: boolean) => {
        if (open) {
            setLocalCategories(normalizeCategories(JSON.parse(JSON.stringify(categories))));
            setReassignments({});
        }
        setIsOpen(open);
    };

    const handleAddCategory = () => {
        const normalizedName = normalizeCategoryName(newCategoryName);
        if (!normalizedName) return;
        if (localCategories.some(c => c.name.toLowerCase() === normalizedName.toLowerCase())) {
            toast.error('Category already exists');
            return;
        }

        const newCategory: CategoryRule = {
            id: normalizedName.toLowerCase().replace(/\s+/g, '-'),
            name: normalizedName,
            keywords: [],
            active: true
        };

        setLocalCategories([...localCategories, newCategory]);
        setNewCategoryName('');
        toast.success('Category added');
    };

    const confirmDelete = () => {
        if (!categoryToDelete) return;

        // If files exist, check if we need reassignment
        const fileCount = fileCounts[categoryToDelete.id] || 0;

        if (fileCount > 0 && reassignTarget) {
            setReassignments(prev => ({ ...prev, [categoryToDelete.name]: reassignTarget }));
        }

        // Hard delete
        setLocalCategories(localCategories.filter(c => c.id !== categoryToDelete.id));
        setCategoryToDelete(null);
        setReassignTarget('');
        toast.success('Category deleted');
    };

    const toggleArchive = (id: string, currentActive: boolean) => {
        setLocalCategories(prev => prev.map(c =>
            c.id === id ? { ...c, active: !currentActive } : c
        ));

        if (currentActive) {
            toast.success('Category archived');
        } else {
            toast.success('Category restored');
        }
    };

    const handleSave = () => {
        const normalizedCategories = normalizeCategories(localCategories);
        onSave(normalizedCategories, reassignments);
        setIsOpen(false);
        toast.success('Changes saved');
    };

    const restorePresets = () => {
        setLocalCategories(JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)));
        setReassignments({});
        setCategoryToDelete(null);
        toast.success('Default categories restored');
    };

    const activeCategories = localCategories.filter(c => c.active !== false);
    const archivedCategories = localCategories.filter(c => c.active === false);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Settings2 className="h-4 w-4" />
                        Categories
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Manage Categories</DialogTitle>
                        <DialogDescription>
                            Create, archive, or delete categories. Archived categories are hidden but preserve file assignments until processed.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 min-h-0 flex flex-col gap-6 py-4 pr-2 pl-2 overflow-y-auto custom-scrollbar">
                        {/* Add New */}
                        <div className="flex gap-2 items-center">
                            <Label htmlFor="new-category" className="sr-only">New category name</Label>
                            <Input
                                id="new-category"
                                placeholder="New category name..."
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                className="flex-1"
                            />
                            <Button size="sm" onClick={handleAddCategory}>
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                            </Button>
                        </div>

                        {/* Active Categories */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">Active Categories</h3>
                            <div className="space-y-3">
                                {activeCategories.map((category) => (
                                    <div key={category.id} className="p-3 border rounded-lg bg-card shadow-sm transition-all hover:border-primary/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-semibold">{category.name}</h4>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                                    {fileCounts[category.id] || 0} files
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => toggleArchive(category.id, true)}
                                                    title="Archive Category"
                                                >
                                                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                                    onClick={() => setCategoryToDelete(category)}
                                                    title="Delete Category"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <KeywordList
                                            category={category}
                                            onUpdate={(newKeywords) => {
                                                setLocalCategories(prev => prev.map(c => c.id === category.id ? { ...c, keywords: newKeywords } : c));
                                            }}
                                        />
                                    </div>
                                ))}
                                {activeCategories.length === 0 && (
                                    <p className="text-sm text-muted-foreground italic text-center py-4">No active categories</p>
                                )}
                            </div>
                        </div>

                        {/* Archived Categories */}
                        {archivedCategories.length > 0 && (
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide flex items-center gap-2">
                                    <EyeOff className="w-3 h-3" />
                                    Archived Categories
                                </h3>
                                <div className="space-y-3 opacity-75 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 transition-all">
                                    {archivedCategories.map((category) => (
                                        <div key={category.id} className="p-3 border rounded-lg bg-muted/30">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium line-through decoration-slate-400">{category.name}</span>
                                                    <span className="text-xs text-muted-foreground">({fileCounts[category.id] || 0} files)</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleArchive(category.id, false)}
                                                    >
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        Restore
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive"
                                                        onClick={() => setCategoryToDelete(category)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t mt-auto">
                        <Button variant="outline" onClick={restorePresets}>
                            Restore Categories
                        </Button>
                        <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="w-5 h-5" />
                            Delete Category?
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to permanently delete "{categoryToDelete?.name}"?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    {(fileCounts[categoryToDelete?.id || ''] || 0) > 0 && (
                        <div className="py-2 space-y-3">
                            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm border border-destructive/20">
                                <strong>Warning:</strong> This category contains {fileCounts[categoryToDelete?.id || ''] || 0} files.
                                Processing this delete implies they need to be reassigned.
                            </div>
                            <div className="space-y-2">
                                <Label>Move files to:</Label>
                                <Select onValueChange={setReassignTarget} value={reassignTarget}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Other">Uncategorized (Other)</SelectItem>
                                        {activeCategories
                                            .filter(c => c.id !== categoryToDelete?.id)
                                            .map(c => (
                                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                            ))
                                        }
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCategoryToDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={(fileCounts[categoryToDelete?.id || ''] || 0) > 0 && !reassignTarget}>
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

// Helper for keywords to keep main component clean
const KeywordList = ({ category, onUpdate }: { category: CategoryRule, onUpdate: (k: string[]) => void }) => {
    const [input, setInput] = useState('');
    const [lastRemoved, setLastRemoved] = useState<string | null>(null);

    const add = () => {
        if (!input.trim() || category.keywords.includes(input.trim().toLowerCase())) return;
        onUpdate([...category.keywords, input.trim().toLowerCase()]);
        setInput('');
    };

    const remove = (k: string) => {
        onUpdate(category.keywords.filter(kw => kw !== k));
        setLastRemoved(k);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Keywords</Label>
                {lastRemoved && (
                    <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => {
                            const next = lastRemoved.trim().toLowerCase();
                            if (!next || category.keywords.includes(next)) return;
                            onUpdate([...category.keywords, next]);
                            setLastRemoved(null);
                        }}
                    >
                        Undo remove
                    </button>
                )}
            </div>
            <div className="flex flex-wrap gap-1.5">
                {category.keywords.map((k) => (
                    <div key={k} className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-xs flex items-center gap-1">
                        {formatKeywordLabel(k)}
                        <button onClick={() => remove(k)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                    </div>
                ))}
                <Input
                    className="w-20 h-6 text-xs min-w-[80px]"
                    placeholder="Add..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && add()}
                    onBlur={add}
                />
            </div>
        </div>
    );
};
