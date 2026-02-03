import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTraining } from "@/contexts/TrainingContext";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, CheckCircle, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';

export default function TrainingFeedback() {
  const { id: assignmentId } = useParams();
  const navigate = useNavigate();
  const { teacher } = useAuth();
  const { trainings } = useTraining();
  const { toast } = useToast();

  const [rating, setRating] = useState(0);
  const [wasHelpful, setWasHelpful] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const training = trainings.find(t => t.id === assignmentId);

  const handleSubmit = async () => {
    if (!teacher || !assignmentId || !training) {
      toast({
        title: "Error",
        description: "Missing required information",
        variant: "destructive"
      });
      return;
    }

    if (rating === 0 || wasHelpful === null) {
      toast({
        title: "Please complete the form",
        description: "Rating and helpfulness are required",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/teacher/training-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId: teacher.id,
          teacherName: teacher.name,
          assignmentId: assignmentId,
          moduleId: training.moduleId,
          rating,
          wasHelpful,
          comment: comment.trim() || null,
          strengths: [],
          improvements: [],
          stillHasIssue: false,
          needsAdditionalSupport: false
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit feedback');
      }

      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted",
      });

      setTimeout(() => {
        navigate('/training');
      }, 1000);

    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit feedback",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!training) {
    return (
      <MobileLayout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Training not found</p>
          <Button onClick={() => navigate('/training')} className="mt-4">
            Back to Training
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-6 space-y-8 max-w-md mx-auto">
        {/* Success Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">Training Complete!</h1>
            <p className="text-sm text-muted-foreground">
              {training.module?.title}
            </p>
          </div>
        </div>

        {/* Star Rating */}
        <div className="space-y-3">
          <Label className="text-base">How would you rate this training?</Label>
          <div className="flex gap-2 justify-center py-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded-full p-1"
                type="button"
              >
                <Star 
                  className={`h-12 w-12 transition-colors ${
                    star <= rating 
                      ? "fill-yellow-400 text-yellow-400" 
                      : "text-gray-300 dark:text-gray-600"
                  }`} 
                />
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {rating === 0 && "Tap to rate"}
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very Good"}
            {rating === 5 && "Excellent"}
          </p>
        </div>

        {/* Was Helpful */}
        <div className="space-y-3">
          <Label className="text-base">Did this help solve your issue?</Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              size="lg"
              variant={wasHelpful === true ? "default" : "outline"}
              onClick={() => setWasHelpful(true)}
              className="h-14"
            >
              <ThumbsUp className="mr-2 h-5 w-5" />
              Yes
            </Button>
            <Button
              type="button"
              size="lg"
              variant={wasHelpful === false ? "default" : "outline"}
              onClick={() => setWasHelpful(false)}
              className="h-14"
            >
              <ThumbsDown className="mr-2 h-5 w-5" />
              No
            </Button>
          </div>
        </div>

        {/* Comment */}
        <div className="space-y-3">
          <Label htmlFor="comment" className="text-base">
            Any additional feedback? <span className="text-muted-foreground text-sm">(Optional)</span>
          </Label>
          <Textarea 
            id="comment"
            placeholder="Share your thoughts, suggestions, or what you learned..." 
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Submit Button */}
        <Button 
          className="w-full h-12 text-base font-medium" 
          onClick={handleSubmit}
          disabled={submitting || rating === 0 || wasHelpful === null}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Feedback"
          )}
        </Button>

        {(rating === 0 || wasHelpful === null) && (
          <p className="text-center text-xs text-muted-foreground">
            Please provide a rating and indicate if the training was helpful
          </p>
        )}
      </div>
    </MobileLayout>
  );
}
