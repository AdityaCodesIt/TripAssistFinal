import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Send, Bot, User, Star, MapPin, Clock, AlertTriangle } from 'lucide-react';

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
}

interface TravelIssue {
  type: 'delay' | 'cost' | 'comfort' | 'safety' | 'navigation' | 'other';
  severity: 1 | 2 | 3 | 4 | 5;
  description: string;
}

const ChatbotInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationStage, setConversationStage] = useState<'intro' | 'problems' | 'details' | 'rating' | 'suggestions' | 'complete'>('intro');
  const [travelIssues, setTravelIssues] = useState<TravelIssue[]>([]);
  const [currentRating, setCurrentRating] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize conversation
    addBotMessage("Hello! I'm your TripAssist AI companion. I'm here to help understand and improve your travel experiences. Let's start by discussing any challenges you faced during your recent travels. What problems did you encounter?");
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addBotMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  const addUserMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  const simulateTyping = async (duration: number = 1500) => {
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, duration));
    setIsTyping(false);
  };

  const analyzeProblems = (userInput: string): TravelIssue[] => {
    const issues: TravelIssue[] = [];
    const input = userInput.toLowerCase();

    // Simple keyword-based analysis
    if (input.includes('delay') || input.includes('late') || input.includes('wait')) {
      issues.push({ type: 'delay', severity: 3, description: 'Travel delays experienced' });
    }
    if (input.includes('expensive') || input.includes('cost') || input.includes('price')) {
      issues.push({ type: 'cost', severity: 3, description: 'Cost-related concerns' });
    }
    if (input.includes('uncomfortable') || input.includes('seat') || input.includes('cramped')) {
      issues.push({ type: 'comfort', severity: 2, description: 'Comfort issues during travel' });
    }
    if (input.includes('lost') || input.includes('direction') || input.includes('navigation')) {
      issues.push({ type: 'navigation', severity: 3, description: 'Navigation difficulties' });
    }
    if (input.includes('unsafe') || input.includes('security') || input.includes('danger')) {
      issues.push({ type: 'safety', severity: 4, description: 'Safety concerns' });
    }
    if (issues.length === 0) {
      issues.push({ type: 'other', severity: 2, description: 'General travel concerns' });
    }

    return issues;
  };

  const generateSuggestions = (issues: TravelIssue[]): string[] => {
    const suggestions: string[] = [];

    issues.forEach(issue => {
      switch (issue.type) {
        case 'delay':
          suggestions.push('Consider booking flights with longer layovers to account for potential delays');
          suggestions.push('Use real-time transit apps to stay updated on schedule changes');
          break;
        case 'cost':
          suggestions.push('Book in advance for better prices');
          suggestions.push('Consider alternative travel dates for lower costs');
          suggestions.push('Look into travel rewards programs and discount cards');
          break;
        case 'comfort':
          suggestions.push('Consider upgrading your seat for longer journeys');
          suggestions.push('Bring comfort items like neck pillows and blankets');
          break;
        case 'navigation':
          suggestions.push('Download offline maps before traveling');
          suggestions.push('Research your route in advance and save important locations');
          break;
        case 'safety':
          suggestions.push('Research destination safety and travel advisories');
          suggestions.push('Share your itinerary with trusted contacts');
          break;
        default:
          suggestions.push('Plan ahead and research your destination thoroughly');
      }
    });

    return [...new Set(suggestions)]; // Remove duplicates
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;

    const userMessage = currentInput.trim();
    addUserMessage(userMessage);
    setCurrentInput('');

    await simulateTyping();

    switch (conversationStage) {
      case 'intro':
        const detectedIssues = analyzeProblems(userMessage);
        setTravelIssues(detectedIssues);
        setConversationStage('details');
        
        if (detectedIssues.length > 0) {
          addBotMessage(`I understand you experienced some challenges. I've identified potential issues related to: ${detectedIssues.map(i => i.type).join(', ')}. Can you provide more specific details about what happened?`);
        } else {
          addBotMessage("Thank you for sharing. Could you provide more specific details about the challenges you faced?");
        }
        break;

      case 'details':
        setConversationStage('rating');
        addBotMessage("Thank you for those details. On a scale of 1-5, how would you rate your overall travel experience? (1 = Very Poor, 5 = Excellent)");
        break;

      case 'rating':
        const rating = parseInt(userMessage);
        if (rating >= 1 && rating <= 5) {
          setCurrentRating(rating);
          setConversationStage('suggestions');
          
          const suggestions = generateSuggestions(travelIssues);
          let responseMessage = `Thank you for rating your experience as ${rating}/5. `;
          
          if (rating <= 2) {
            responseMessage += "I'm sorry you had a difficult experience. ";
          } else if (rating >= 4) {
            responseMessage += "I'm glad you had a good experience! ";
          }
          
          responseMessage += "Based on the issues you mentioned, here are some suggestions for future travels:\n\n";
          responseMessage += suggestions.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join('\n');
          responseMessage += "\n\nWould you like to share any additional feedback or ask about specific travel tips?";
          
          addBotMessage(responseMessage);
        } else {
          addBotMessage("Please provide a rating between 1 and 5.");
        }
        break;

      case 'suggestions':
        setConversationStage('complete');
        addBotMessage("Thank you for your valuable feedback! Your input helps us improve travel experiences for everyone. Is there anything else you'd like to discuss about your travel experiences?");
        
        // Save feedback data (in real app, this would go to Supabase)
        toast({
          title: "Feedback recorded",
          description: "Your travel feedback has been saved for analysis.",
        });
        break;

      case 'complete':
        addBotMessage("Thank you for taking the time to share your travel experiences. Your feedback is valuable for improving travel services. Safe travels!");
        break;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="shadow-travel">
        <CardHeader className="bg-gradient-sunset text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6" />
            TripAssist AI - Travel Experience Advisor
          </CardTitle>
          <p className="text-white/80">
            Share your travel experiences and get personalized advice
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {/* Chat Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4 bg-muted/20">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.type === 'bot' && <Bot className="h-4 w-4 mt-1 flex-shrink-0" />}
                    {message.type === 'user' && <User className="h-4 w-4 mt-1 flex-shrink-0" />}
                    <div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-background border">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 border-t bg-background">
            <div className="flex gap-2">
              <Textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Share your travel experiences..."
                className="flex-1 min-h-[60px] resize-none"
                disabled={isTyping}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!currentInput.trim() || isTyping}
                className="bg-gradient-sunset hover:opacity-90"
                size="lg"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Quick Response Buttons for Rating Stage */}
            {conversationStage === 'rating' && (
              <div className="mt-4 flex gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground mr-2">Quick rating:</span>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentInput(rating.toString());
                      setTimeout(handleSendMessage, 100);
                    }}
                    className="gap-1"
                  >
                    <Star className="h-3 w-3" />
                    {rating}
                  </Button>
                ))}
              </div>
            )}

            {/* Progress Indicator */}
            <div className="mt-4 flex justify-center">
              <div className="flex gap-2">
                {['intro', 'details', 'rating', 'suggestions', 'complete'].map((stage, index) => (
                  <div
                    key={stage}
                    className={`w-2 h-2 rounded-full ${
                      ['intro', 'problems', 'details', 'rating', 'suggestions', 'complete'].indexOf(conversationStage) >= index
                        ? 'bg-primary'
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Travel Issues Summary */}
      {travelIssues.length > 0 && (
        <Card className="mt-6 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Detected Travel Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {travelIssues.map((issue, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <Badge variant="outline" className="capitalize">
                      {issue.type}
                    </Badge>
                    <div className="flex">
                      {Array.from({ length: issue.severity }, (_, i) => (
                        <Star key={i} className="h-3 w-3 fill-current text-yellow-500" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{issue.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ChatbotInterface;