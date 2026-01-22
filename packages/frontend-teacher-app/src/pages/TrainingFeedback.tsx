import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle } from "lucide-react";

// 🛡️ SAFE INITIALIZATION
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only create the client if keys exist, otherwise return null (prevents crash)
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export default function TrainingFeedback() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    // 1. Safety Check for Missing Keys
    if (!supabase) {
      alert("⚠️ Error: Supabase keys are missing in .env file. Check console.");
      console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
      return;
    }

    if (!id) {
      alert("Error: No Feedback ID found!");
      return;
    }
    
    setSubmitting(true);
    
    try {
      console.log("Saving feedback for ID:", id);

      const { data, error } = await supabase
        .from('feedback')
        .update({ 
          training_rating: rating, 
          training_comment: comment 
        })
        .eq('id', id)
        .select();

      if (error) {
        throw error;
      }

      console.log("Success! Saved:", data);

    } catch (e: any) {
      console.error("Error saving feedback:", e);
      alert("Failed to save: " + e.message);
    }

    setTimeout(() => {
      navigate('/dashboard'); 
    }, 1000);
  };

  return (
    <MobileLayout>
      <div className="p-6 flex flex-col items-center justify-center min-h-[80vh] text-center">
        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
          <CheckCircle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-gray-900">Great Job!</h1>
        <p className="text-gray-500 mb-8">You've completed the training module.</p>

        {/* Star Rating */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110 focus:outline-none"
            >
              <Star 
                className={`h-10 w-10 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} 
              />
            </button>
          ))}
        </div>

        <div className="w-full mb-6">
          <Textarea 
            placeholder="Any comments?" 
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="bg-white"
          />
        </div>

        <Button 
          className="w-full h-12 text-lg bg-blue-600" 
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
        >
          {submitting ? "Submitting..." : "Submit Feedback"}
        </Button>
      </div>
    </MobileLayout>
  );
}