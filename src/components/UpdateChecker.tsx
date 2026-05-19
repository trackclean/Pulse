import { useEffect, useState, useCallback, useRef } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { toast } from '@/components/ui/sonner';

export function UpdateChecker() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    type UpdateInfo = Awaited<ReturnType<typeof check>>;
    type UpdateDownloadEvent = Parameters<NonNullable<UpdateInfo>["downloadAndInstall"]>[0] extends (arg: infer E) => void ? E : never;
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo>(null);
    const updateInfoRef = useRef<UpdateInfo>(null);
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const { toast: shadcnToast } = useToast();

    const showUpdateToast = useCallback((version: string) => {
        toast(`Update ${version} available`, {
            description: 'A new version of Pulse is ready.',
            duration: Infinity,
            id: 'update-available',
            action: {
                label: 'Update Now',
                onClick: () => setUpdateAvailable(true),
            },
        });
    }, []);

    const checkForUpdates = useCallback(async (retries = 2) => {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const update = await check();

                // Dispatch result so SettingsDialog can show feedback
                window.dispatchEvent(new CustomEvent('update-check-complete', {
                    detail: { found: !!update?.available, version: update?.version },
                }));

                if (!update?.available) return;

                setUpdateInfo(update);

                const skippedVersion = sessionStorage.getItem('skipped-update-version');
                if (update.version === skippedVersion) {
                    // Already dismissed this version — show toast badge only
                    showUpdateToast(update.version);
                    return;
                }

                setUpdateAvailable(true);
                return;
            } catch (error) {
                console.error(`Update check attempt ${attempt + 1} failed:`, error);
                if (attempt < retries) {
                    // Wait before retrying (1s, then 3s)
                    await new Promise(r => setTimeout(r, attempt === 0 ? 1000 : 3000));
                    continue;
                }
                window.dispatchEvent(new CustomEvent('update-check-complete', {
                    detail: { found: false, error: true, message: String(error) },
                }));
            }
        }
    }, [showUpdateToast]);

    useEffect(() => {
        updateInfoRef.current = updateInfo;
    }, [updateInfo]);

    useEffect(() => {
        checkForUpdates();

        const handleTrigger = () => checkForUpdates();
        window.addEventListener('trigger-update-check', handleTrigger);
        return () => {
            window.removeEventListener('trigger-update-check', handleTrigger);
        };
    }, [checkForUpdates]);

    const downloadAndInstall = async () => {
        if (!updateInfo) return;

        try {
            setDownloading(true);

            await updateInfo.downloadAndInstall((event: UpdateDownloadEvent) => {
                switch (event.event) {
                    case 'Started':
                        setDownloadProgress(0);
                        shadcnToast({
                            title: 'Downloading update...',
                            description: `Version ${updateInfo.version}`,
                        });
                        break;
                    case 'Progress':
                        setDownloadProgress(
                            Math.round((event.data.downloaded / event.data.contentLength) * 100)
                        );
                        break;
                    case 'Finished':
                        setDownloadProgress(100);
                        shadcnToast({
                            title: 'Update downloaded!',
                            description: 'Restarting application...',
                        });
                        break;
                }
            });

            await relaunch();
        } catch (error) {
            console.error('Failed to download and install update:', error);
            shadcnToast({
                title: 'Update failed',
                description: 'Failed to download and install the update.',
                variant: 'destructive',
            });
            setDownloading(false);
        }
    };

    const skipUpdate = () => {
        setUpdateAvailable(false);
        if (updateInfo?.version) {
            sessionStorage.setItem('skipped-update-version', updateInfo.version);
            showUpdateToast(updateInfo.version);
        }
        // Keep updateInfo so the toast "Update Now" action can reopen the dialog
    };

    return (
        <Dialog open={updateAvailable} onOpenChange={setUpdateAvailable}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Update Available</DialogTitle>
                    <DialogDescription>
                        A new version of Pulse is available.
                        {updateInfo && (
                            <div className="mt-2 space-y-1">
                                <p>Current version: {updateInfo.currentVersion}</p>
                                <p>New version: {updateInfo.version}</p>
                                {updateInfo.body && (
                                    <div className="mt-3 p-3 bg-muted rounded-md">
                                        <p className="text-sm font-medium mb-1">What's new:</p>
                                        <p className="text-sm whitespace-pre-wrap">{updateInfo.body}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {downloading && (
                    <div className="space-y-2">
                        <Progress value={downloadProgress} />
                        <p className="text-sm text-center text-muted-foreground">
                            {downloadProgress}%
                        </p>
                    </div>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={skipUpdate}
                        disabled={downloading}
                    >
                        Later
                    </Button>
                    <Button
                        onClick={downloadAndInstall}
                        disabled={downloading}
                    >
                        {downloading ? 'Downloading...' : 'Update Now'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
