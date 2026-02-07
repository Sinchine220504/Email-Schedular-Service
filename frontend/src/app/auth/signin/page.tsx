'use client';

import { signIn } from 'next-auth/react';
import { Button, Card } from '@/components/ui';

export default function SignIn() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">📧 ReachInbox</h1>
          <p className="text-gray-600 mb-8">Email Scheduler Dashboard</p>

          <Button
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => signIn('google', { callbackUrl: '/' })}
          >
            🔐 Sign in with Google
          </Button>

          <p className="text-sm text-gray-500 mt-6">
            Click above to authenticate with your Google account
          </p>
        </div>
      </Card>
    </div>
  );
}
