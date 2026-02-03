import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Globe } from 'lucide-react';
import { 
  User, 
  MapPin, 
  Mail, 
  IdCard,
  Moon,
  Bell,
  HelpCircle,
  Shield,
  LogOut,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { teacher, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const handleLanguageChange = async (newLang: 'en' | 'hi' | 'kn') => {
    setLanguage(newLang);
    
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/teacher/${teacher?.id}/language`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredLanguage: newLang }),
      });
    } catch (error) {
      console.error('Failed to sync language preference:', error);
    }
  };

  const handleLogout = () => {
    logout();
    toast({
      title: t('settings.loggedOut'),
      description: t('settings.logoutSuccess'),
    });
    navigate('/login');
  };

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <MobileLayout>
      <div className="px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold text-foreground">{t('settings.title')}</h1>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('settings.profile')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{teacher?.name}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.profile')}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/edit-profile')}>
                {t('common.edit')}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('settings.email')}</p>
                  <p className="text-sm text-foreground">{teacher?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <IdCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('settings.employeeId')}</p>
                  <p className="text-sm text-foreground">{teacher?.employeeId}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('settings.cluster')}</p>
                  <p className="text-sm text-foreground">{teacher?.cluster}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Settings Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {t('settings.language')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <label className="text-sm text-muted-foreground mb-2 block">
              {t('settings.selectLanguage')}
            </label>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'hi' | 'kn')}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
            </select>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('settings.preferences')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{t('settings.darkMode')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.useDarkTheme')}</p>
                </div>
              </div>
              <Switch 
                checked={darkMode} 
                onCheckedChange={handleDarkModeToggle}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{t('settings.notifications')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.receiveUpdates')}</p>
                </div>
              </div>
              <Switch 
                checked={notifications} 
                onCheckedChange={setNotifications}
              />
            </div>
          </CardContent>
        </Card>

        {/* Support & Info */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('settings.supportInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0">
            <button 
              onClick={() => navigate('/tutorial')}
              className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">{t('settings.appTutorial')}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <ExternalLink className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">{t('settings.contactSupport')}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">{t('settings.privacyPolicy')}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button 
          variant="destructive" 
          className="w-full" 
          size="lg"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t('common.edit') === 'Edit' ? 'Log Out' : t('settings.loggedOut')}
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t('settings.version')}
        </p>
      </div>
    </MobileLayout>
  );
}
