'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button, Card, Input } from '@/components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = async () => {
    setLoading(true);
    // Demo login - no actual authentication
    login('Demo User', 'demo@example.com');
    router.push('/');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert('Please enter name and email');
      return;
    }
    setLoading(true);
    login(name, email);
    router.push('/');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <Card className="w-full max-w-md shadow-xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">📧 ReachInbox</h1>
          <p className="text-gray-600 mb-8 font-semibold">Email Scheduler Dashboard</p>

          {/* Demo Login Button */}
          <Button
            variant="primary"
            size="lg"
            className="w-full mb-4"
            onClick={handleDemoLogin}
            loading={loading}
          >
            🚀 Quick Demo Login
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Custom Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
            <Input
              type="email"
              placeholder="Your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              className="w-full"
              loading={loading}
            >
              Sign In
            </Button>
          </form>

          <p className="text-sm text-gray-500 mt-6">
            🔒 Demo mode - No authentication required
          </p>
        </div>
      </Card>
    </div>
  );
}
