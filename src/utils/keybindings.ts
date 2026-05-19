/**
 * Keybinding utilities for parsing, matching, and formatting shortcut strings.
 *
 * Binding format: "[ctrl+][shift+][alt+]Key"
 *   - Modifiers are lowercase: "ctrl", "shift", "alt"
 *   - Key uses KeyboardEvent.key or .code values: "a", "F2", "Space", "Delete", "Escape"
 *   - Examples: "ctrl+z", "ctrl+shift+a", "F2", "Space", "Delete"
 */

interface ParsedBinding {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    key: string; // the non-modifier part (lowercase for letters, original for special keys)
}

const SPECIAL_KEYS = new Set([
    'Space', 'Delete', 'Backspace', 'Escape', 'Enter', 'Tab',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
    'Home', 'End', 'PageUp', 'PageDown', 'Insert',
]);

/** Reserved bindings that should never be overridden (safety). */
const RESERVED = new Set(['F5', 'ctrl+r', 'ctrl+shift+r']);

export function parseBinding(binding: string): ParsedBinding {
    const parts = binding.split('+');
    let ctrl = false, shift = false, alt = false;
    let key = '';

    for (const part of parts) {
        const lower = part.toLowerCase();
        if (lower === 'ctrl' || lower === 'cmd' || lower === 'meta') ctrl = true;
        else if (lower === 'shift') shift = true;
        else if (lower === 'alt') alt = true;
        else key = part;
    }

    return { ctrl, shift, alt, key };
}

export function matchesBinding(e: KeyboardEvent, binding: string): boolean {
    const parsed = parseBinding(binding);
    const mod = e.ctrlKey || e.metaKey;

    if (parsed.ctrl !== mod) return false;
    if (parsed.shift !== e.shiftKey) return false;
    if (parsed.alt !== e.altKey) return false;

    // Match key: use e.code for Space (since e.key is ' '), otherwise e.key
    const eventKey = e.code === 'Space' ? 'Space' : e.key;

    // Case-insensitive comparison for letter keys
    if (parsed.key.length === 1 && eventKey.length === 1) {
        return parsed.key.toLowerCase() === eventKey.toLowerCase();
    }

    return parsed.key === eventKey;
}

/** Display-friendly format: "ctrl+e" → "Ctrl+E", "Space" → "Space" */
export function formatBinding(binding: string): string {
    const parts = binding.split('+');
    return parts.map(part => {
        const lower = part.toLowerCase();
        if (lower === 'ctrl' || lower === 'cmd' || lower === 'meta') return 'Ctrl';
        if (lower === 'shift') return 'Shift';
        if (lower === 'alt') return 'Alt';
        // Capitalize single letters
        if (part.length === 1) return part.toUpperCase();
        // Keep special keys as-is (F2, Space, Delete, etc.)
        return part;
    }).join('+');
}

/** Convert a KeyboardEvent into a binding string (for recording mode). */
export function eventToBinding(e: KeyboardEvent): string | null {
    // Ignore standalone modifier presses
    if (['Control', 'Meta', 'Shift', 'Alt'].includes(e.key)) return null;

    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');

    let key: string;
    if (e.code === 'Space') {
        key = 'Space';
    } else if (SPECIAL_KEYS.has(e.key)) {
        key = e.key;
    } else if (e.key.length === 1) {
        key = e.key.toLowerCase();
    } else {
        key = e.key;
    }

    parts.push(key);
    return parts.join('+');
}

export function isReservedBinding(binding: string): boolean {
    return RESERVED.has(binding.toLowerCase()) || RESERVED.has(binding);
}

export function isValidBinding(binding: string): boolean {
    if (!binding || binding.length === 0) return false;
    const parsed = parseBinding(binding);
    if (!parsed.key) return false;
    if (isReservedBinding(binding)) return false;
    return true;
}
