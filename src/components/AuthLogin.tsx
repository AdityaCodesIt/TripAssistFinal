import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, User, Shield } from 'lucide-react';

interface AuthLoginProps {
  onLogin: (user: { username: string; role: string }) => void;
}

const AuthLogin: React.FC<AuthLoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Mock authentication for NATPAC scientists
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock authentication logic
    const validCredentials = [
      { username: 'scientist1', password: 'natpac2024', role: 'Senior Scientist' },
      { username: 'researcher1', password: 'natpac2024', role: 'Research Analyst' },
      { username: 'admin', password: 'admin123', role: 'Administrator' },
      { username: 'demo', password: 'demo', role: 'Demo User' },
    ];

    const user = validCredentials.find(
      cred => cred.username === username && cred.password === password
    );

    if (user) {
      toast({
        title: "Login successful!",
        description: `Welcome back, ${user.role}`,
      });
      onLogin({ username: user.username, role: user.role });
    } else {
      toast({
        title: "Login failed",
        description: "Invalid credentials. Please contact your administrator.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-travel">
        <CardHeader className="bg-gradient-sky text-primary-foreground rounded-t-lg text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white/20 p-3 rounded-full">
              <Shield className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl">NATPAC Scientists Portal</CardTitle>
          <p className="text-primary-foreground/80">
            Secure access to travel research data
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-sky hover:opacity-90 shadow-travel"
              disabled={isLoading}
            >
              {isLoading ? "Authenticating..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">Demo Credentials:</h4>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p><strong>Username:</strong> demo</p>
              <p><strong>Password:</strong> demo</p>
              <p className="mt-2 text-xs">
                Or use scientist1/natpac2024 for full scientist access
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthLogin;