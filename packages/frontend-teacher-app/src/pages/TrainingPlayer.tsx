import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createClient } from "@supabase/supabase-js";
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, Languages, FileText, CheckCircle, Play,
  Download, BookOpen, FileDigit, Loader2
} from 'lucide-react';

// Initialize Supabase Client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function TrainingPlayer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const feedbackId = searchParams.get('feedbackId');

  // UI States
  const [language, setLanguage] = useState('en');
  const [isSummarized, setIsSummarized] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [aiContent, setAiContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrainingFromEdgeFunction() {
      if (!feedbackId) return;
      setLoading(true);

      try {
        // 1. Invoke your deployed Supabase Edge Function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-training`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Passing the Anon Key for authorization
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ 
              feedbackId, 
              language // Tell the Edge Function which language to generate
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Edge Function failed");
        }

        // 2. Set the AI content returned from the server
        setAiContent(data);

      } catch (error: any) {
        console.error("Fetch failed:", error.message);
        // Fallback content in case of network or function errors
        setAiContent({
          title: "Classroom Management Guide",
          fullText: "To manage a noisy classroom effectively, establish clear ground rules and use non-verbal signals for silence.",
          summary: "• Use signals for silence\n• Establish clear rules\n• Maintain consistency\n• Rearrange desk layout"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchTrainingFromEdgeFunction();
    // Re-run whenever the user changes the language
  }, [feedbackId, language]);

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="animate-pulse text-sm">Server is crafting your module...</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="flex flex-col h-[calc(100vh-60px)] bg-background">
        {/* Navigation & Toolbar */}
        <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex gap-2">
            <Button
              variant={isSummarized ? "default" : "outline"}
              size="sm"
              onClick={() => setIsSummarized(!isSummarized)}
            >
              <FileDigit className="h-3 w-3 mr-1" />
              {isSummarized ? "Full Text" : "Summarize"}
            </Button>

            <Select value={language} onValueChange={(v) => setLanguage(v)}>
              <SelectTrigger className="h-8 w-[100px] text-xs">
                <Languages className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
                <SelectItem value="bn">Bengali</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Video Player Area */}
        <div className="w-full aspect-video bg-black flex items-center justify-center relative">
          <Play className="h-12 w-12 text-white opacity-80" />
          <span className="absolute bottom-2 right-2 text-[10px] text-white bg-black/50 px-2 py-1 rounded">10:00</span>
        </div>

        {/* Content Display */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <h1 className="text-xl font-bold">{aiContent?.title}</h1>
          <Card className="border-none shadow-sm bg-muted/30">
            <CardContent className="p-4">
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                {/* Dynamically toggle between summary and full text */}
                {isSummarized ? aiContent?.summary : aiContent?.fullText}
              </p>
            </CardContent>
          </Card>

          <div className="pt-2">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Learning Materials
            </h3>
            <Card className="border border-blue-100 bg-blue-50/50 p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-red-500" />
                <p className="text-xs font-medium">Training_Guide_v1.pdf</p>
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </Card>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-4 border-t bg-white">
          <Button 
            className={`w-full h-12 ${isCompleted ? 'bg-green-600' : 'bg-primary'}`} 
            onClick={() => {
              setIsCompleted(true);
              setTimeout(() => navigate('/dashboard'), 800);
            }}
          >
            {isCompleted ? <><CheckCircle className="mr-2 h-5 w-5" /> Completed</> : "Mark as Complete"}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}