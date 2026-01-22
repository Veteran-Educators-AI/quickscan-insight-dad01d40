import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Growth mindset quotes for daily notifications
const dailyQuotes = [
  {
    quote: "Your brain is like a muscle - the more you use it, the stronger it gets!",
    author: "Dr. Carol Dweck"
  },
  {
    quote: "I failed over 1,000 times before creating the light bulb. Each failure taught me something new.",
    author: "Thomas Edison"
  },
  {
    quote: "I wasn't born a good basketball player. I've missed more than 9,000 shots. That is why I succeed.",
    author: "Michael Jordan"
  },
  {
    quote: "I was rejected by 30 publishers before Harry Potter was accepted. Don't fear failure - it's the path to success.",
    author: "J.K. Rowling"
  },
  {
    quote: "The wealthiest people aren't the smartest - they're the most persistent. Consistency beats talent.",
    author: "Success Research"
  },
  {
    quote: "Every expert was once a beginner. The difference? They never stopped practicing.",
    author: "Growth Mindset"
  },
  {
    quote: "When you say 'I can't,' add 'yet.' That one word changes everything!",
    author: "Power of Yet"
  },
  {
    quote: "Rich and successful people aren't born smarter - they just try more times. Keep going!",
    author: "Wealth Research"
  },
  {
    quote: "Struggling means you're growing. Every challenge builds your brain's neural pathways!",
    author: "Neuroscience"
  },
  {
    quote: "I failed my entrance exam twice and was rejected from 30 jobs. I kept applying. Success is getting up again.",
    author: "Jack Ma"
  },
  {
    quote: "Your starting point doesn't determine your ending point. Effort is everything!",
    author: "Mark Zuckerberg"
  },
  {
    quote: "I grew up with nothing, but I studied every day. Your circumstances don't define your future.",
    author: "Howard Schultz"
  },
  {
    quote: "Don't compare your chapter 1 to someone else's chapter 20. Everyone starts somewhere.",
    author: "Growth Mindset Wisdom"
  },
  {
    quote: "Studies show that praising effort helps more than praising smarts. Effort is what you control!",
    author: "Educational Research"
  },
  {
    quote: "Practice hours - not natural talent - best predict who becomes world-class. You've got this!",
    author: "Anders Ericsson"
  }
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's quote based on day of year
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );
    const quote = dailyQuotes[dayOfYear % dailyQuotes.length];

    // Get all students
    const { data: students, error: studentsError } = await supabase
      .from("student_profiles")
      .select("user_id");

    if (studentsError) {
      throw studentsError;
    }

    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No students to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notifications for all students
    const notifications = students.map((student) => ({
      user_id: student.user_id,
      type: "inspiration",
      title: "💪 Daily Inspiration",
      message: `"${quote.quote}" — ${quote.author}`,
      icon: "sparkles",
      read: false,
      data: { quote: quote.quote, author: quote.author }
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      throw insertError;
    }

    console.log(`Pushed daily quote to ${students.length} students`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        studentsNotified: students.length,
        quote: quote
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error pushing daily quote:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
