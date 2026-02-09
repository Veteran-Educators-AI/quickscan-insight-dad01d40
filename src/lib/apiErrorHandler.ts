import { toast } from '@/hooks/use-toast';

interface ApiError {
  message?: string;
  status?: number;
}

/**
 * Handles API errors from edge functions and shows appropriate toast messages.
 * Returns a user-friendly error message.
 */
export function handleApiError(error: unknown, context?: string): string {
  const contextPrefix = context ? `${context}: ` : '';
  
  // Check if error is from Supabase function invoke with status in the response
  if (error && typeof error === 'object') {
    const err = error as ApiError;
    
    // Rate limit error (429)
    if (err.status === 429 || err.message?.includes('429') || err.message?.toLowerCase().includes('rate limit')) {
      const message = 'Rate limit exceeded. Please wait a moment and try again.';
      toast({
        title: 'Too Many Requests',
        description: message,
        variant: 'destructive',
      });
      return message;
    }
    
    // Payment/quota error (402)
    if (err.status === 402 || err.message?.includes('402') || err.message?.toLowerCase().includes('payment') || err.message?.toLowerCase().includes('credit')) {
      const message = 'API quota exceeded. Please check your Google API billing settings or add credits.';
      toast({
        title: 'API Quota Exceeded',
        description: 'Your Google Gemini API quota has been reached. Please check your billing settings in Google Cloud Console.',
        variant: 'destructive',
      });
      return message;
    }
    
    // Model unavailable / bad request (400) — usually a deprecated or invalid model name
    if (err.status === 400 || err.message?.includes('400') || err.message?.toLowerCase().includes('model') && err.message?.toLowerCase().includes('unavailable')) {
      const message = 'The AI model returned an error. A fallback model was used or the request needs to be retried.';
      toast({
        title: 'AI Model Issue',
        description: 'The selected AI model may be temporarily unavailable. The system will automatically try a fallback. Please retry your scan.',
        variant: 'destructive',
      });
      return message;
    }
    
    // API key invalid (403)
    if (err.status === 403 || err.message?.includes('403') || err.message?.toLowerCase().includes('invalid') || err.message?.toLowerCase().includes('api key')) {
      const message = 'API key is invalid or has insufficient permissions.';
      toast({
        title: 'API Key Issue',
        description: 'Your Google Gemini API key may be invalid or need additional permissions. Please check your key in Google Cloud Console.',
        variant: 'destructive',
      });
      return message;
    }
  }
  
  // Generic error handling
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
  
  // Check for specific error patterns in the message
  if (errorMessage.toLowerCase().includes('rate limit') || errorMessage.includes('429')) {
    toast({
      title: 'Too Many Requests',
      description: 'Rate limit exceeded. Please wait a moment and try again.',
      variant: 'destructive',
    });
    return 'Rate limit exceeded';
  }
  
  if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('payment') || errorMessage.includes('402')) {
    toast({
      title: 'API Quota Exceeded',
      description: 'Your API quota has been reached. Please check your billing settings.',
      variant: 'destructive',
    });
    return 'API quota exceeded';
  }
  
  // Default error
  toast({
    title: 'Error',
    description: `${contextPrefix}${errorMessage}`,
    variant: 'destructive',
  });
  
  return errorMessage;
}

/**
 * Checks if an edge function response contains an API error
 * and shows appropriate toast if so.
 * Returns true if there was an error, false otherwise.
 */
export function checkResponseForApiError(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  
  const response = data as { error?: string };
  
  if (response.error) {
    handleApiError({ message: response.error });
    return true;
  }
  
  return false;
}
