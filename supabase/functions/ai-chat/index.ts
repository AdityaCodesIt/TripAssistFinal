import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversation_context } = await req.json();
    
    console.log('Received message:', message);
    console.log('Conversation context:', conversation_context);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client for saving feedback
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare messages for OpenAI
    const systemPrompt = `You are TripAssist AI, a helpful travel advisor that collects feedback and provides personalized travel advice. 

Your role is to:
1. Ask users about their travel experiences and problems they faced
2. Collect detailed feedback about their trips
3. Provide personalized suggestions for better travel experiences
4. Rate and categorize travel issues
5. Give practical, actionable advice for future trips

Be conversational, empathetic, and helpful. Ask follow-up questions to understand their travel challenges better. When they share problems, provide specific solutions and tips.

Current conversation context: ${conversation_context || 'New conversation'}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI Response:', aiResponse);

    // Save the conversation to feedback table
    try {
      const { error: insertError } = await supabase
        .from('feedback')
        .insert({
          type: 'ai_conversation',
          user_message: message,
          ai_response: aiResponse,
          session_id: conversation_context || crypto.randomUUID(),
        });

      if (insertError) {
        console.error('Error saving feedback:', insertError);
      }
    } catch (saveError) {
      console.error('Error saving to database:', saveError);
      // Continue even if saving fails
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        success: true 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});