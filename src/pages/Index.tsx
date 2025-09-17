import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TripAssistDashboard from '@/components/TripAssistDashboard';
import AuthLogin from '@/components/AuthLogin';
import ChatbotInterface from '@/components/ChatbotInterface';
import { LogOut, Bot, BarChart3, Users } from 'lucide-react';

interface User {
  username: string;
  role: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('dashboard');
  };

  // If user is not logged in, show login screen
  if (!user) {
    return <AuthLogin onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30">
      {/* Header with user info and logout */}
      <div className="bg-card shadow-card border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-travel bg-clip-text text-transparent">
              TripAssist Portal
            </h1>
            <Badge variant="secondary" className="gap-2">
              <Users className="h-3 w-3" />
              {user.role}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.username}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-card shadow-card">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Data Collection
            </TabsTrigger>
            <TabsTrigger value="chatbot" className="gap-2">
              <Bot className="h-4 w-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <Users className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <TripAssistDashboard />
          </TabsContent>

          <TabsContent value="chatbot">
            <ChatbotInterface />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">Analytics Dashboard</h2>
              <p className="text-muted-foreground mb-6">
                Advanced analytics and reporting features will be available here.
                This would integrate with Supabase for real-time data analysis.
              </p>
              <div className="bg-card p-8 rounded-lg shadow-card max-w-md mx-auto">
                <h3 className="font-semibold mb-2">Coming Soon:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Trip pattern analysis</li>
                  <li>• Cost trend reports</li>
                  <li>• Route optimization insights</li>
                  <li>• User behavior analytics</li>
                  <li>• Export capabilities</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
