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

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function TrainingPlayer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const feedbackId = searchParams.get('feedbackId');

  const [language, setLanguage] = useState('en');
  const [isSummarized, setIsSummarized] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [aiContent, setAiContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function generateAITraining() {
      if (!feedbackId) return;
      setLoading(true);

      try {
        const { data: feedback, error: fbError } = await supabase
          .from('feedback')
          .select('description')
          .eq('id', feedbackId)
          .single();

        if (fbError) throw fbError;
        const notes = feedback?.description || "Classroom management and engagement";
        
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        const languageMap: Record<string, string> = { en: "English", hi: "Hindi", bn: "Bengali" };

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `You are a teacher mentor. Based on these notes: "${notes}", generate a comprehensive training module.
                  IMPORTANT: You MUST write the entire response in ${languageMap[language]}.
                  Return ONLY a JSON object with keys: "title", "fullText" (300 words detailed guide), and "summary" (4 bullets).`
                }]
              }]
            })
          }
        );

        const data = await response.json();

        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const rawText = data.candidates[0].content.parts[0].text;
          const cleanJson = JSON.parse(rawText.replace(/```json|```/g, ""));
          setAiContent(cleanJson);
        } else {
          throw new Error("API Error");
        }
      } catch (error) {
        console.error("Using Detailed Demo Fallback:", error);
        // COMPREHENSIVE FALLBACK: Detailed content for all three languages
        const fallbacks: Record<string, any> = {
          en: {
            title: "Advanced Classroom Management Strategy",
            fullText: "To manage a noisy classroom effectively, start by establishing clear, non-negotiable ground rules. Avoid shouting over students; instead, use high-visibility signals like a raised hand or a rhythmic clap to command attention. Consistency is your most powerful tool—enforce every rule every single time to build predictable boundaries. Finally, optimize your physical space by arranging desks in a way that minimizes distractions and allows you to move freely through the 'high-traffic' areas of the room.",
            summary: "• Establish non-negotiable ground rules early\n• Use rhythmic clapping or raised hands for attention\n• Build predictability through absolute consistency\n• Rearrange desks to eliminate distraction zones"
          },
          hi: {
            title: "उन्नत कक्षा प्रबंधन रणनीति",
            fullText: "शोर वाली कक्षा को प्रभावी ढंग से प्रबंधित करने के लिए, स्पष्ट और गैर-परक्राम्य आधार नियम स्थापित करके शुरुआत करें। छात्रों पर चिल्लाने से बचें; इसके बजाय, ध्यान आकर्षित करने के लिए हाथ उठाने या लयबद्ध ताली जैसे उच्च-दृश्यता संकेतों का उपयोग करें। संगति आपका सबसे शक्तिशाली उपकरण है—अनुमानित सीमाएं बनाने के लिए हर बार हर नियम को लागू करें। अंत में, डेस्क को इस तरह से व्यवस्थित करके अपने भौतिक स्थान को अनुकूलित करें जो विकर्षणों को कम करता है।",
            summary: "• शुरुआत में ही स्पष्ट नियम स्थापित करें\n• ध्यान खींचने के लिए तालियों या संकेतों का उपयोग करें\n• पूर्ण निरंतरता के माध्यम से पूर्वानुमेयता बनाएं\n• व्याकुलता क्षेत्रों को खत्म करने के लिए डेस्क को फिर से व्यवस्थित करें"
          },
          bn: {
            title: "উন্নত ক্লাসরুম ম্যানেজমেন্ট কৌশল",
            fullText: "একটি কোলাহলপূর্ণ ক্লাসরুম কার্যকরভাবে পরিচালনা করতে, স্পষ্ট এবং অ-আলোচনাযোগ্য ভিত্তি নিয়ম প্রতিষ্ঠা করে শুরু করুন। শিক্ষার্থীদের ওপর চিৎকার করা এড়িয়ে চলুন; পরিবর্তে, মনোযোগ আকর্ষণ করার জন্য হাত তোলা বা ছন্দময় করতালির মতো উচ্চ-দৃশ্যমান সংকেত ব্যবহার করুন। ধারাবাহিকতা আপনার সবচেয়ে শক্তিশালী হাতিয়ার—প্রতিটি নিয়ম প্রতিবার প্রয়োগ করুন। পরিশেষে, ডেস্কগুলিকে এমনভাবে সাজিয়ে আপনার শারীরিক স্থানকে অপ্টিমাইজ করুন যা বিভ্রান্তি কমায় এবং আপনাকে রুমের সর্বত্র অবাধে চলাফেরা করতে দেয়।",
            summary: "• শুরুতে স্পষ্ট এবং কঠোর নিয়ম তৈরি করুন\n• মনোযোগের জন্য ছন্দময় হাততালি বা সংকেত ব্যবহার করুন\n• ধারাবাহিকতার মাধ্যমে শিক্ষার্থীদের মধ্যে শৃঙ্খলা বজায় রাখুন\n• বিভ্রান্তি কমাতে ক্লাসরুমের আসবাবপত্র পুনরায় সাজান"
          }
        };
        setAiContent(fallbacks[language] || fallbacks['en']);
      } finally {
        setLoading(false);
      }
    }

    generateAITraining();
  }, [feedbackId, language]); // Triggers on every language change

  if (loading) return (
    <MobileLayout>
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="animate-pulse text-sm">Translating and preparing module...</p>
      </div>
    </MobileLayout>
  );

  return (
    <MobileLayout>
      <div className="flex flex-col h-[calc(100vh-60px)] bg-background">
        <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>

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

        <div className="w-full aspect-video bg-black flex items-center justify-center relative">
          <Play className="h-12 w-12 text-white opacity-80" />
          <span className="absolute bottom-2 right-2 text-[10px] text-white bg-black/50 px-2 py-1 rounded">10:00</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <h1 className="text-xl font-bold">{aiContent?.title}</h1>
          <Card className="border-none shadow-sm bg-muted/30">
            <CardContent className="p-4">
              {/* Toggles between long detailed text and summary bullets */}
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
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
                <p className="text-xs font-medium">Strategy_Guide_v2.pdf</p>
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8"><Download className="h-4 w-4" /></Button>
            </Card>
          </div>
        </div>

        <div className="p-4 border-t bg-white">
          <Button 
            className={`w-full h-12 ${isCompleted ? 'bg-green-600' : 'bg-primary'}`} 
            onClick={() => {
              setIsCompleted(true);
              setTimeout(() => navigate('/dashboard'), 800);
            }}
          >
            {isCompleted ? <CheckCircle className="mr-2 h-5 w-5" /> : "Mark as Complete"}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}