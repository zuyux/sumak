import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function JoinWaitlistForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    setAlreadyRegistered(false);
    
    try {
      const res = await fetch("/api/join-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(true);
        setEmail("");
      } else if (res.status === 409) {
        // Email already registered
        setAlreadyRegistered(true);
        setError(data.error || "This email is already on the waitlist!");
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      console.error('Network error:', err);
      setError("Network error. Please check your connection and try again.");
    }
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 p-12 bg-card rounded-lg shadow-lg border border-border w-full max-w-md mx-auto">
      <h2 className="title text-xl font-bold mb-2 text-foreground">Join the Waitlist</h2>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        className="px-6 py-3 rounded-md bg-surface-primary text-foreground border border-border w-full placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />
      <Button 
        type="submit" 
        disabled={loading || !email} 
        className="w-full p-6 rounded-md border-[1px] border-border text-primary-foreground bg-accent-foreground hover:bg-accent-foreground disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Joining..." : success ? "Joined!" : "Join"}
      </Button>
      
      {success && (
        <div className="text-center">
          <p className="text-green-500 dark:text-green-400 font-medium">You&apos;ve been added to the waitlist!</p>
          <p className="text-muted-foreground text-sm mt-1">Check your email for confirmation.</p>
        </div>
      )}
      
      {error && (
        <div className="text-center">
          <p className={`font-medium ${alreadyRegistered 
            ? 'text-blue-500 dark:text-blue-400' 
            : 'text-red-500 dark:text-red-400'
          }`}>
            {error}
          </p>
          {alreadyRegistered && (
            <p className="text-muted-foreground text-sm mt-1">
              You&apos;re already on our list! We&apos;ll notify you of updates.
            </p>
          )}
        </div>
      )}
    </form>
  );
}
