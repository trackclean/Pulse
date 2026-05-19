import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface LoadingScreenProps {
    progress: number;
}

export const LoadingScreen = ({ progress }: LoadingScreenProps) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[500px] space-y-8 animate-in fade-in duration-500">
            <Loader2 className="w-20 h-20 animate-spin text-primary" />

            <div className="text-center space-y-3">
                <h2 className="text-4xl font-bold text-foreground">
                    Loading your library...
                </h2>
                <p className="text-lg text-muted-foreground">
                    {progress < 50 ? 'Scanning audio files...' : 'Generating waveforms...'}
                </p>
            </div>

            <div className="w-full max-w-2xl space-y-4">
                <Progress value={progress} className="h-5" />
                <div className="flex justify-between items-center">
                    <p className="text-2xl font-mono font-bold text-primary">
                        {Math.round(progress)}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {progress < 50 ? 'Step 1/2: File scanning' : 'Step 2/2: Waveform generation'}
                    </p>
                </div>
            </div>
        </div>
    );
};
