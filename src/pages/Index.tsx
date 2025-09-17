import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import TripAssistDashboard from "@/components/TripAssistDashboard";
import { TripsManager } from '@/components/TripsManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, MapPin, Database, User, Shield } from 'lucide-react';

const Index = () => {
  const { user, profile, userRole, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Trip Data App
              </h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {profile?.full_name || user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <Badge variant={userRole === 'admin' ? 'default' : userRole === 'scientist' ? 'secondary' : 'outline'}>
                {userRole === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </Badge>
            </div>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="trips" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trips" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Trip Data
            </TabsTrigger>
            <TabsTrigger value="assistant" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Travel Assistant
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="trips">
            <TripsManager />
          </TabsContent>
          
          <TabsContent value="assistant">
            <TripAssistDashboard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
