import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext'; // ✅ Add this
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Camera, User, Mail, Phone, MapPin, GraduationCap, Briefcase } from 'lucide-react';

export default function EditProfile() {
  const navigate = useNavigate();
  const { teacher } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage(); // ✅ Add this
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: teacher?.name || '',
    email: teacher?.email || '',
    phone: '+91 98765 43210',
    bio: 'Passionate educator with 8+ years of experience in primary education. Specialized in innovative teaching methods and student engagement.',
    qualification: 'M.Ed, B.Ed',
    experience: '8 years',
    subjects: 'Mathematics, Science',
    address: teacher?.cluster || '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real app, you would update the user profile here
    toast({
      title: t('profile.updateSuccess'), 
      description: t('profile.updateSuccessMsg'), 
    });
    
    setIsLoading(false);
    navigate('/settings');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <MobileLayout showNav={false}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="font-semibold text-foreground">
                {t('profile.editProfile')}
              </h1>
            </div>
            <Button onClick={handleSave} disabled={isLoading} size="sm">
              {isLoading ? t('common.saving') : t('common.save')} 
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Avatar Section */}
          <Card>
            <CardContent className="flex flex-col items-center py-6">
              <div className="relative mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {getInitials(formData.name)}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('profile.changePhoto')} 
              </p>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4" />
                {t('profile.personalInfo')} 
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('profile.fullName')}</Label> 
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder={t('profile.fullNamePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('profile.emailAddress')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder={t('profile.emailPlaceholder')} 
                    className="pl-10"
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('profile.emailCannotChange')} 
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('profile.phoneNumber')}</Label> 
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder={t('profile.phonePlaceholder')} 
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">{t('profile.bio')}</Label> 
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder={t('profile.bioPlaceholder')} 
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Briefcase className="h-4 w-4" />
                {t('profile.professionalInfo')} {/* ✅ Use translation */}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qualification">{t('profile.qualification')}</Label> 
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="qualification"
                    value={formData.qualification}
                    onChange={(e) => handleChange('qualification', e.target.value)}
                    placeholder={t('profile.qualificationPlaceholder')} 
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">{t('profile.experience')}</Label> 
                <Input
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => handleChange('experience', e.target.value)}
                  placeholder={t('profile.experiencePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subjects">{t('profile.subjects')}</Label> 
                <Input
                  id="subjects"
                  value={formData.subjects}
                  onChange={(e) => handleChange('subjects', e.target.value)}
                  placeholder={t('profile.subjectsPlaceholder')} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t('profile.assignedCluster')}</Label> 
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder={t('profile.clusterPlaceholder')}
                    className="pl-10"
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('profile.contactAdminCluster')} 
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bottom spacing for save button */}
          <div className="h-4" />
        </div>
      </div>
    </MobileLayout>
  );
}
