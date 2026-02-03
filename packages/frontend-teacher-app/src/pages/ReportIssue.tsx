import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFeedback, IssueCategory } from '@/contexts/FeedbackContext';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

// Type definition for API response
interface FeedbackSubmissionResult {
  success: boolean;
  feedback?: any;
  aiResponse?: {
    suggestion: string;
    inferredGaps: string[];
    priority: string;
  };
  feedback_deleted?: boolean;
  skipped_ai_call?: boolean;
  message?: string;
  reason?: string;
  assigned_module?: string;
  already_existed?: boolean;
}

const categories: { value: IssueCategory; label: string }[] = [
  { value: 'academic', label: 'Academic' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'safety', label: 'Safety' },
  { value: 'technology', label: 'Technology' },
  { value: 'other', label: 'Other' },
];

const clusters = [
  'North District',
  'South District',
  'East District',
  'West District',
  'Central District',
];

export default function ReportIssue() {
  const { teacher } = useAuth();
  const { submitIssue } = useFeedback();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [category, setCategory] = useState('academic')
  const [cluster, setCluster] = useState(teacher?.cluster || '');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAlreadyAssigned, setIsAlreadyAssigned] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const [errors, setErrors] = useState<{ category?: string; description?: string }>({});

  const validate = () => {
    const newErrors: { category?: string; description?: string } = {};
    
    if (!category) {
      newErrors.category = t('report.categoryRequired');
    }
    
    if (!description) {
      newErrors.description = t('report.descriptionRequired');
    } else if (description.length < 20) {
      newErrors.description = t('report.descriptionMin');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🟢🟢🟢 HANDLESUBMIT CALLED!');
    console.log('Event:', e);
    console.log('Teacher:', teacher);
    console.log('Description:', description);
    
    e.preventDefault();
    
    console.log('🔵 After preventDefault');
    
    if (!validate() || !teacher) {
      console.log('❌ Validation failed or no teacher');
      console.log('Validate result:', validate());
      console.log('Teacher exists:', !!teacher);
      return;
    }
    
    console.log('✅ Validation passed, starting submission...');
    
    setIsSubmitting(true);
    
    try {
      console.log('🚀 Submitting feedback...');
      
      const result = await submitIssue({
        teacherId: teacher.id,
        cluster: teacher.cluster,
        category: "academic",
        description,
      });
      
      console.log('Full API Response:', JSON.stringify(result, null, 2));
      console.log('issue_deleted:', result?.issue_deleted);
      console.log('skipped_ai_call:', result?.skipped_ai_call);
      console.log('success:', result?.success);
      
      if (result?.issue_deleted === true || result?.skipped_ai_call === true) {
        console.log('Training already assigned - showing appropriate screen');
        
        setIsAlreadyAssigned(true);
        setAssignmentMessage(result.message || t('report.checkTraining'));
        
        toast({
          title: t('report.alreadyAssigned'),
          description: result.reason || t('report.checkTraining'),
        });
        
        setTimeout(() => {
          console.log('Timeout triggered - navigating to /training');
          setIsAlreadyAssigned(false);
          setCategory('');
          setDescription('');
          navigate('/training');
        }, 2000);
        
        return; 
      } 
      
      if (result?.success) {
        console.log('New training assigned - showing success screen');
        
        setIsSuccess(true);
        
        toast({
          title: t('report.submitSuccess'),
          description: t('report.personalizedAssigned'),
        });
        
        setTimeout(() => {
          console.log('Timeout triggered - navigating to /training');
          setCategory('');
          setDescription('');
          setIsSuccess(false);
          navigate('/training');
        }, 2000);
        
        return; 
      }
      
      console.warn('Unexpected API response format:', result);
      throw new Error('Unexpected response from server');
      
    } catch (error) {
      console.error('Submit error:', error);
      
      toast({
        title: t('report.submitFailed'),
        description: t('report.checkConnection'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAlreadyAssigned) {
    console.log('Rendering "Already Assigned" screen');
    return (
      <MobileLayout showNav={false}>
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6">
          <div className="mb-6 relative">
            <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-yellow-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('report.alreadyAssigned')}
          </h2>
          <p className="text-gray-600 mb-2">
            {assignmentMessage}
          </p>
          <p className="text-sm text-gray-500">
            {t('report.checkTraining')}
          </p>
        </div>
      </MobileLayout>
    );
  }

  if (isSuccess) {
    console.log('Rendering "New Issue" success screen');
    return (
      <MobileLayout showNav={false}>
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6">
          <div className="mb-6 relative">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('report.issueReported')}
          </h2>
          <p className="text-gray-600 mb-2">
            {t('report.submittedSuccess')}
          </p>
          <p className="text-sm text-gray-500">
            {t('report.personalizedAssigned')}
          </p>
        </div>
      </MobileLayout>
    );
  }

  // Main Form
  return (
    <MobileLayout>
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('report.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Teacher Info */}
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-sm text-muted-foreground">{t('report.reportingAs')}</p>
                <p className="font-medium">{teacher?.name}</p>
                <p className="text-sm text-muted-foreground">{teacher?.employeeId}</p>
              </div>
          
              {/* Description */}
              <div>
                <Label>
                  {t('report.descriptionLabel')} * 
                  <span className="text-muted-foreground ml-2">({description.length}/500)</span>
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder={t('report.descriptionPlaceholder')}
                  rows={5}
                  className={errors.description ? 'border-destructive' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-destructive mt-1">{errors.description}</p>
                )}
              </div>

              {/* Submit */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
                onClick={(e) => {
                  console.log('🔴 BUTTON CLICKED!');
                  console.log('  Teacher:', teacher?.id);
                  console.log('  Description:', description);
                  console.log('  isSubmitting:', isSubmitting);
                  console.log('  Event:', e);
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('report.submitting')}
                  </>
                ) : (
                  t('report.submitButton')
                )}
              </Button>

            </form>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
