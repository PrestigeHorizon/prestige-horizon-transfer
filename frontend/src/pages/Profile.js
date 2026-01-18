import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { User, Mail, Phone, MapPin, Shield } from 'lucide-react';

const Profile = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="profile-page">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
          <p className="text-[#A1A1AA] mt-1">Manage your account information</p>
        </div>

        {/* Profile Card */}
        <Card className="bg-[#0F0F0F] border-white/10 mb-6" data-testid="profile-card">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#D4AF37] flex items-center justify-center">
                <span className="text-black font-bold text-2xl">
                  {user.full_name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <CardTitle className="text-white">{user.full_name}</CardTitle>
                <p className="text-[#A1A1AA]">{user.email}</p>
                {user.is_admin && (
                  <div className="flex items-center gap-1 mt-1 text-[#D4AF37]">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">Administrator</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Account Info */}
        <Card className="bg-[#0F0F0F] border-white/10 mb-6" data-testid="account-info">
          <CardHeader>
            <CardTitle className="text-white">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[#A1A1AA] flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </Label>
                <Input
                  value={user.full_name}
                  disabled
                  className="bg-[#1A1A1A] border-white/10 text-white"
                  data-testid="profile-fullname"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#A1A1AA] flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  value={user.email}
                  disabled
                  className="bg-[#1A1A1A] border-white/10 text-white"
                  data-testid="profile-email"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#A1A1AA] flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                <Input
                  value={user.phone}
                  disabled
                  className="bg-[#1A1A1A] border-white/10 text-white"
                  data-testid="profile-phone"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#A1A1AA] flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Country
                </Label>
                <Input
                  value={user.country}
                  disabled
                  className="bg-[#1A1A1A] border-white/10 text-white"
                  data-testid="profile-country"
                />
              </div>
            </div>
            <p className="text-[#A1A1AA] text-sm">
              Account created: {new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="bg-[#0F0F0F] border-white/10" data-testid="security-section">
          <CardHeader>
            <CardTitle className="text-white">Security</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#1A1A1A] rounded-lg">
              <div>
                <p className="text-white font-medium">Sign Out</p>
                <p className="text-[#A1A1AA] text-sm">Sign out from your account on this device</p>
              </div>
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="bg-red-500/20 text-red-500 hover:bg-red-500/30"
                data-testid="logout-btn"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
