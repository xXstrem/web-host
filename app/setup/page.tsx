'use client';

import { useState } from 'react';
import { useSetupState } from '@/lib/use-setup-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cloud, Loader2, Lock, Mail, User, ShieldCheck, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

type Step = 'welcome' | 'admin' | 'done';

export default function SetupPage() {
  const { completed, loading } = useSetupState();
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && completed) {
    window.location.href = '/dashboard';
    return null;
  }
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(data.error ?? 'Setup failed');
      return;
    }
    setStep('done');
    toast.success('Admin account created');
  }

  function finish() {
    window.location.href = '/dashboard';
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center">
            <Cloud className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight">TON Cloud Manager</span>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="h-1 w-full bg-neutral-100">
            <div
              className="h-full bg-black transition-all duration-500"
              style={{ width: step === 'welcome' ? '33%' : step === 'admin' ? '66%' : '100%' }}
            />
          </div>

          <div className="p-8 sm:p-10">
            {step === 'welcome' && <WelcomeStep onNext={() => setStep('admin')} />}
            {step === 'admin' && (
              <AdminStep
                name={name} setName={setName}
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                confirm={confirm} setConfirm={setConfirm}
                submitting={submitting}
                onSubmit={createAdmin}
                onBack={() => setStep('welcome')}
              />
            )}
            {step === 'done' && <DoneStep onFinish={finish} />}
          </div>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">TON Cloud Manager · Initial Setup</p>
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const features = [
    { icon: ShieldCheck, title: 'Secure by default', desc: 'Hashed passwords, JWT sessions, isolated storage.' },
    { icon: Cloud, title: 'Cloud file management', desc: 'Upload, preview, edit, and organize your files.' },
    { icon: Sparkles, title: 'Built-in code editor', desc: 'Monaco-powered editor with syntax highlighting.' },
  ];
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="h-14 w-14 rounded-2xl bg-black mx-auto flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to TON Cloud</h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Let's set up your file manager. This quick wizard will create your admin account so you can start managing files right away.
        </p>
      </div>
      <div className="space-y-3">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50 border border-neutral-100">
              <div className="h-9 w-9 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-neutral-700" />
              </div>
              <div>
                <p className="text-sm font-medium">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
      <Button onClick={onNext} className="w-full" size="lg">
        Get started <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}

function AdminStep(props: {
  name: string; setName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  confirm: string; setConfirm: (v: string) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <form onSubmit={props.onSubmit} className="space-y-5">
      <div className="space-y-1">
        <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight pt-1">Create your admin account</h1>
        <p className="text-sm text-muted-foreground">This account will have full administrative access to your TON Cloud instance.</p>
      </div>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="name" value={props.name} onChange={(e) => props.setName(e.target.value)} placeholder="Administrator" className="pl-9" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Admin email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="email" type="email" required value={props.email} onChange={(e) => props.setEmail(e.target.value)} placeholder="admin@example.com" className="pl-9" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="password" type="password" required minLength={8} value={props.password} onChange={(e) => props.setPassword(e.target.value)} placeholder="••••••••" className="pl-9" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="confirm" type="password" required minLength={8} value={props.confirm} onChange={(e) => props.setConfirm(e.target.value)} placeholder="••••••••" className="pl-9" />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Use at least 8 characters. This password is securely hashed with bcrypt.</p>
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={props.onBack} className="flex-1">Back</Button>
        <Button type="submit" disabled={props.submitting} className="flex-1">
          {props.submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create admin account
        </Button>
      </div>
    </form>
  );
}

function DoneStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-black mx-auto flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-white" />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Setup complete</h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">Your TON Cloud Manager is ready. You are now signed in as admin.</p>
      </div>
      <Button onClick={onFinish} className="w-full" size="lg">
        Go to dashboard <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}
