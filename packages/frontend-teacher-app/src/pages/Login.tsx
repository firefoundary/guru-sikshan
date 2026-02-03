import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Loader2, Eye, EyeOff, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { login, hasCompletedOnboarding } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  // ✅ Language state synced with context
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi' | 'kn'>(language);

  const languages = [
    { value: 'en' as const, label: 'English', nativeLabel: 'English' },
    { value: 'hi' as const, label: 'Hindi', nativeLabel: 'हिंदी' },
    { value: 'kn' as const, label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  ];

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = t('login.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('login.emailInvalid');
    }
    
    if (!password) {
      newErrors.password = t('login.passwordRequired');
    } else if (password.length < 4) {
      newErrors.password = t('login.passwordMin');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    try {
      // ✅ Send language preference with login
      const response = await fetch(`${API_URL}/api/teacher/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          email, 
          password,
          preferred_language: selectedLanguage
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast({
          title: t('login.loginFailed'),
          description: data.error || t('login.checkCredentials'),
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // ✅ Update language in context
      setLanguage(selectedLanguage);
      
      // ✅ Complete login through context
      const success = await login(email, password);
      
      if (success) {
        toast({
          title: t('login.welcomeBack'),
          description: t('login.loginSuccess'),
        });
        navigate(hasCompletedOnboarding ? '/dashboard' : '/onboarding');
      } else {
        toast({
          title: t('login.loginFailed'),
          description: t('login.checkCredentials'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: t('login.connectionError'),
        description: t('login.networkError'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
          <MessageSquare className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">GuruSikshan</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('login.subtitle')}</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">{t('login.signIn')}</CardTitle>
          <CardDescription>{t('login.enterCredentials')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ✅ Language Selector - FIRST */}
            <div className="space-y-2">
              <Label htmlFor="language" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Select Language
              </Label>
              <Select 
                value={selectedLanguage} 
                onValueChange={(value: 'en' | 'hi' | 'kn') => {
                  setSelectedLanguage(value);
                  setLanguage(value); // Update immediately for UI
                }}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{lang.nativeLabel}</span>
                        <span className="text-xs text-muted-foreground">
                          ({lang.label})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">{t('login.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">{t('login.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('login.signingIn')}
                </>
              ) : (
                t('login.signInButton')
              )}
            </Button>
          </form>

          {/* Demo Hint */}
          <div className="mt-6 pt-4 border-t">
            <p className="text-center text-xs text-muted-foreground mb-2">
              {t('login.demoHint') || 'Demo Accounts'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
