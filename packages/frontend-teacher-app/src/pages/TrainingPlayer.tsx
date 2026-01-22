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

// Initialize Supabase using environment variables to keep keys secure
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function TrainingPlayer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const feedbackId = searchParams.get('feedbackId'); 

  const [language, setLanguage] = useState<'en' | 'hi' | 'bn'>('en');
  const [isSummarized, setIsSummarized] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const [aiContent, setAiContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function generateAITraining() {
      if (!feedbackId) {
        console.error("No feedbackId found in URL");
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // 1. Fetch from 'description' column based on your Supabase Table Editor
        const { data: feedback, error: fbError } = await supabase
          .from('feedback')
          .select('description')
          .eq('id', feedbackId)
          .single();

        if (fbError) throw fbError;

        // Use the actual teacher description for the prompt context
        const notes = feedback?.description || "General teaching improvement";
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

        // 2. Call the stable Gemini v1 endpoint with the 1.5-flash model
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `You are a teacher mentor. Based on these notes: "${notes}", generate a training module in ${language}. 
                  Return ONLY a JSON object with keys: "title", "fullText" (200 words), and "summary" (4 bullets).`
                }]
              }]
            })
          }
        );

        const data = await response.json();

        // 🔍 DEBUG: Use this to check the response structure in your console
        console.log("Full Gemini Response:", data);

        // 3. Robust candidate check to prevent "property 0 of undefined" errors
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          const rawText = data.candidates[0].content.parts[0].text;

          // Clean markdown code blocks from the AI response
          const cleanJson = JSON.parse(rawText.replace(/```json|```/g, ""));
          setAiContent(cleanJson);
        } else {
          // Captures error messages from Google (e.g., API key restrictions)
          throw new Error(data.error?.message || "Gemini returned an empty or invalid structure.");
        }
      } catch (error: any) {
        console.error("AI Generation failed:", error.message);
        // Graceful fallback content so the UI remains interactive
        setAiContent({
          title: "Training Module",
          fullText: `Generation failed: ${error.message}. Please verify your Database schema and API Key.`,
          summary: "• Database Query Failed\n• Check 'description' column\n• Verify Gemini API Key"
        });
      } finally {
        setLoading(false);
      }
    }

    generateAITraining();
  }, [feedbackId, language]);

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse text-sm">Crafting your personalized training...</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="flex flex-col h-[calc(100vh-60px)] bg-background">
        {/* Navigation & Controls */}
        <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex gap-2">
            <Button
              variant={isSummarized ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setIsSummarized(!isSummarized)}
            >
              <FileDigit className="h-3 w-3 mr-1" />
              {isSummarized ? "Full Text" : "Summarize"}
            </Button>

            <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
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

        {/* Video Section */}
        <div className="w-full aspect-video bg-black flex items-center justify-center relative">
          <Play className="h-12 w-12 text-white opacity-80" fill="currentColor" />
          <span className="absolute bottom-2 right-2 text-[10px] text-white bg-black/50 px-2 py-1 rounded">10:00</span>
        </div>

        {/* AI Content Display */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <h1 className="text-xl font-bold">
            {aiContent?.title || "Custom Training Module"}
          </h1>

          <Card className="border-none shadow-sm bg-muted/30">
            <CardContent className="p-4">
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                {isSummarized ? aiContent?.summary : aiContent?.fullText}
              </p>
            </CardContent>
          </Card>

          {/* Resources Section */}
          <div className="pt-2">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Learning Materials
            </h3>
            <Card className="border border-blue-100 bg-blue-50/50">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-xs font-medium">AI_Summary_Guide.pdf</p>
                    <p className="text-[10px] text-muted-foreground">PDF • 1.2 MB</p>
                  </div>
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-4 border-t bg-white">
          <Button
            className={`w-full h-12 transition-all ${isCompleted ? 'bg-green-600' : 'bg-primary'}`}
            onClick={() => {
              setIsCompleted(true);
              setTimeout(() => {
                navigate(feedbackId ? `/training/feedback/${feedbackId}` : '/dashboard');
              }, 500);
            }}
          >
            {isCompleted ? <><CheckCircle className="mr-2 h-5 w-5" /> Completed</> : "Mark as Complete"}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}