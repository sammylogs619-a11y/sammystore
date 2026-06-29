import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const mode = searchParams.get("mode");

  useEffect(() => {
    if (!loading && user) {
      navigate(redirect, { replace: true });
    }
  }, [user, loading, navigate, redirect]);

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12 bg-background">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8 text-center">
          <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-brand-navy mb-2">Authentication Not Configured</h2>
          <p className="text-sm text-muted-foreground">
            To enable login, add <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">VITE_SUPABASE_URL</code> and{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">VITE_SUPABASE_ANON_KEY</code> to your Replit Secrets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block">
            <span className="text-2xl font-bold tracking-tight text-brand-navy">
              SAMMY <span className="text-brand-orange">STORE</span>
            </span>
          </Link>
          <p className="text-sm text-muted-foreground mt-2">Welcome — sign in to manage your wallet &amp; orders.</p>
        </div>

        <Tabs defaultValue={mode === "signup" ? "signup" : "login"} className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-5">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login"><LoginForm /></TabsContent>
          <TabsContent value="signup"><SignupForm /></TabsContent>
        </Tabs>

        <div className="flex items-center my-5 gap-3">
          <div className="h-px bg-border flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px bg-border flex-1" />
        </div>

        <GoogleButton />

        <p className="text-xs text-center text-muted-foreground mt-5">
          By continuing you agree to our{" "}
          <Link to="/about" className="text-brand-orange hover:underline">Terms</Link>.
        </p>
      </div>
    </div>
  );
}

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) { toast.error(error.message); return; }
      toast.success("Welcome back!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async () => {
    if (!email) return toast.error("Enter your email above first");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) toast.error(error.message);
      else toast.success("Password reset email sent");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset email");
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white">
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Sign in
      </Button>
      <button type="button" onClick={onForgot} className="text-xs text-brand-orange hover:underline w-full text-center">
        Forgot password?
      </button>
    </form>
  );
}

const signupSchema = z.object({
  displayName: z.string().trim().min(2, "Name too short").max(60),
  email: z.string().trim().email().max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});

function SignupForm() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ displayName, email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { display_name: parsed.data.displayName },
        },
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Account created! Check your email to confirm.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="su-name">Display name</Label>
        <Input id="su-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-email">Email</Label>
        <Input id="su-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-password">Password</Label>
        <Input id="su-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white">
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Create account
      </Button>
    </form>
  );
}

function GoogleButton() {
  const [loading, setLoading] = useState(false);
  const onClick = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/dashboard",
      });
      if (result.error) {
        setLoading(false);
        toast.error(result.error.message || "Google sign-in failed");
      }
    } catch (err: unknown) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    }
  };
  return (
    <Button type="button" variant="outline" onClick={onClick} disabled={loading} className="w-full">
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
      )}
      Continue with Google
    </Button>
  );
}
