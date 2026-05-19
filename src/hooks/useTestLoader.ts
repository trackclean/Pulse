
import { useState } from 'react';

export const useTestLoader = (onFilesAdded: (files: File[]) => void) => {
    const [isLoading, setIsLoading] = useState(false);

    const loadTestFiles = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/test_manifest.json');
            if (!response.ok) {
                throw new Error('Failed to load manifest. Did you run "npm run generate-manifest"?');
            }

            const manifest = await response.json();
            const files: File[] = [];

            for (const filename of manifest.files) {
                try {
                    const fileRes = await fetch(`/test_samples/${filename}`);
                    if (!fileRes.ok) {
                        console.warn(`Failed to load ${filename}: ${fileRes.statusText}`);
                        continue; // Skip this file and continue with others
                    }
                    const blob = await fileRes.blob();
                    const file = new File([blob], filename, { type: blob.type });
                    files.push(file);
                } catch (error) {
                    console.error(`Error loading ${filename}:`, error);
                    // Continue with other files
                }
            }

            if (files.length === 0) {
                throw new Error('No test files could be loaded');
            }

            onFilesAdded(files);
            console.log(`Loaded ${files.length} of ${manifest.files.length} test files.`);
        } catch (error) {
            console.error('Error loading test files:', error);
            alert('Error loading test files. Check console for details.');
        } finally {
            setIsLoading(false);
        }
    };

    return { loadTestFiles, isLoading };
};
