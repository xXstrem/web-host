'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSetupState } from '@/lib/use-setup-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cloud, Loader2, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const { signIn, user } = useAuth();
  const { completed, loading: setupLoading } = useSetupState();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!setupLoading && completed === false) router.replace('/setup');
  }, [setupLoading, completed, router]);

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  if (setupLoading || completed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center">
            <Cloud className="h-5 w-5 text-black" />
          </div>
          <span className="text-lg font-semibold tracking-tight">TON Cloud</span>
        </div>
        <div className="relative space-y-5">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">Your files,<br />beautifully managed.</h1>
          <p className="text-white/60 text-lg max-w-md">A premium cloud file manager with secure storage, instant previews, and a built-in code editor.</p>
          <div className="flex gap-6 pt-4 text-sm text-white/50">
            <div><span className="block text-2xl text-white font-semibold">256-bit</span> encryption</div>
            <div><span className="block text-2xl text-white font-semibold">99.9%</span> uptime</div>
            <div><span className="block text-2xl text-white font-semibold">0</span> ads</div>
          </div>
        </div>
        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} TON Cloud Manager</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-lg bg-black flex items-center justify-center">
              <Cloud className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">TON Cloud</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">Sign in to access your cloud storage.</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
