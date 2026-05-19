import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, FolderTree, Upload, CheckCircle2, ArrowRight, X } from 'lucide-react';

interface OnboardingOverlayProps {
    onComplete: () => void;
    onSkip: () => void;
}

export const OnboardingOverlay = ({ onComplete, onSkip }: OnboardingOverlayProps) => {
    const [step, setStep] = useState(0);

    const steps = [
        {
            title: "Welcome to Pulse",
            description: "Your assistant for organizing stems and audio samples.",
            icon: <FolderTree className="w-12 h-12 text-primary" />,
            content: (
                <div className="space-y-4 text-center">
                    <p className="text-muted-foreground">
                        This app helps you automatically categorize, rename, and organize your audio files using intelligent analysis.
                    </p>
                    <div className="grid grid-cols-1 gap-4 text-left mt-6">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                            <div>
                                <h4 className="font-medium">Auto-Categorization</h4>
                                <p className="text-sm text-muted-foreground">Detects Drums, Bass, Vocals, and more automatically.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                            <div>
                                <h4 className="font-medium">Smart Renaming</h4>
                                <p className="text-sm text-muted-foreground">Clean up messy filenames with customizable patterns.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "Recommended Workflow",
            description: "Follow these steps for the best results.",
            icon: <Settings className="w-12 h-12 text-primary" />,
            content: (
                <div className="space-y-6">
                    <div className="relative pl-8 border-l-2 border-muted space-y-8">
                        <div className="relative">
                            <span className="absolute -left-[41px] flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">1</span>
                            <h4 className="font-medium text-lg">Configure Settings</h4>
                            <p className="text-sm text-muted-foreground">
                                Open the <strong>Settings</strong> menu to set up your naming conventions and export preferences.
                            </p>
                        </div>
                        <div className="relative">
                            <span className="absolute -left-[41px] flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold">2</span>
                            <h4 className="font-medium text-lg">Review Categories</h4>
                            <p className="text-sm text-muted-foreground">
                                Check the <strong>Categories</strong> manager to customize keywords for better detection accuracy.
                            </p>
                        </div>
                        <div className="relative">
                            <span className="absolute -left-[41px] flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold">3</span>
                            <h4 className="font-medium text-lg">Import Files</h4>
                            <p className="text-sm text-muted-foreground">
                                Drag and drop or copy & paste your files. They will be analyzed and sorted automatically.
                            </p>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    const currentStep = steps[step];

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            onComplete();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <Card className="w-full max-w-lg shadow-2xl border-primary/20">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 bg-primary/10 p-4 rounded-full w-fit">
                        {currentStep.icon}
                    </div>
                    <CardTitle className="text-2xl">{currentStep.title}</CardTitle>
                    <CardDescription className="text-base">{currentStep.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    {currentStep.content}
                </CardContent>
                <CardFooter className="flex justify-between pt-4 border-t">
                    <Button variant="ghost" onClick={onSkip}>
                        Skip Setup
                    </Button>
                    <div className="flex gap-2">
                        {step > 0 && (
                            <Button variant="outline" onClick={() => setStep(step - 1)}>
                                Back
                            </Button>
                        )}
                        <Button onClick={handleNext} className="gap-2">
                            {step === steps.length - 1 ? "Get Started" : "Next"}
                            {step < steps.length - 1 && <ArrowRight className="w-4 h-4" />}
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
};
