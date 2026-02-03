import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  ArrowRight, 
  BookOpen, 
  FileText, 
  GraduationCap, 
  MessageSquare, 
  Settings,
  CheckCircle,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialStep {
  id: number;
  titleKey: string;
  descriptionKey: string;
  icon: React.ElementType;
  detailsKeys: string[];
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    titleKey: 'tutorial.welcome.title',
    descriptionKey: 'tutorial.welcome.desc',
    icon: Home,
    detailsKeys: [
      'tutorial.welcome.detail1',
      'tutorial.welcome.detail2',
      'tutorial.welcome.detail3',
      'tutorial.welcome.detail4',
    ],
  },
  {
    id: 2,
    titleKey: 'tutorial.reporting.title',
    descriptionKey: 'tutorial.reporting.desc',
    icon: FileText,
    detailsKeys: [
      'tutorial.reporting.detail1',
      'tutorial.reporting.detail2',
      'tutorial.reporting.detail3',
      'tutorial.reporting.detail4',
    ],
  },
  {
    id: 3,
    titleKey: 'tutorial.training.title',
    descriptionKey: 'tutorial.training.desc',
    icon: GraduationCap,
    detailsKeys: [
      'tutorial.training.detail1',
      'tutorial.training.detail2',
      'tutorial.training.detail3',
      'tutorial.training.detail4',
    ],
  },
  {
    id: 4,
    titleKey: 'tutorial.history.title',
    descriptionKey: 'tutorial.history.desc',
    icon: BookOpen,
    detailsKeys: [
      'tutorial.history.detail1',
      'tutorial.history.detail2',
      'tutorial.history.detail3',
      'tutorial.history.detail4',
    ],
  },
  {
    id: 5,
    titleKey: 'tutorial.settings.title',
    descriptionKey: 'tutorial.settings.desc',
    icon: Settings,
    detailsKeys: [
      'tutorial.settings.detail1',
      'tutorial.settings.detail2',
      'tutorial.settings.detail3',
      'tutorial.settings.detail4',
    ],
  },
  {
    id: 6,
    titleKey: 'tutorial.feedback.title',
    descriptionKey: 'tutorial.feedback.desc',
    icon: MessageSquare,
    detailsKeys: [
      'tutorial.feedback.detail1',
      'tutorial.feedback.detail2',
      'tutorial.feedback.detail3',
      'tutorial.feedback.detail4',
    ],
  },
];

export default function Tutorial() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const step = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    
    if (isLastStep) {
      navigate('/dashboard');
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  const StepIcon = step.icon;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            {t('tutorial.skip')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentStep + 1} {t('tutorial.of')} {tutorialSteps.length}
          </span>
          <div className="w-20" />
        </div>
        <div className="px-4 pb-4">
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {/* Step Navigation Dots */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {tutorialSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={cn(
                "h-2 w-2 rounded-full transition-all",
                index === currentStep 
                  ? "w-6 bg-primary" 
                  : completedSteps.includes(index)
                    ? "bg-primary/50"
                    : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <StepIcon className="h-10 w-10 text-primary" />
          </div>
          
          <h2 className="mb-3 text-2xl font-bold text-foreground">{t(step.titleKey)}</h2>
          <p className="mb-6 text-muted-foreground">{t(step.descriptionKey)}</p>
        </div>

        {/* Details Card */}
        <Card>
          <CardContent className="py-4">
            <ul className="space-y-3">
              {step.detailsKeys.map((detailKey, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  <span className="text-sm text-foreground">{t(detailKey)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Buttons */}
      <div className="sticky bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur-sm">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handlePrevious}
            disabled={isFirstStep}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('tutorial.previous')}
          </Button>
          <Button onClick={handleNext} className="flex-1">
            {isLastStep ? (
              <>
                {t('tutorial.getStarted')}
                <CheckCircle className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                {t('tutorial.next')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
