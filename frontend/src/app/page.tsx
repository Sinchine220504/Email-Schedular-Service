'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header, Button, Card, Table, Toast } from '@/components/ui';
import MessageList from '@/components/MessageList';
import { MessageView } from '@/components/MessageView';
import { ComposeEmailModal } from '@/components/ComposeEmailModal';
import { API } from '@/lib/api';
import { formatDate, getStatusColor } from '@/lib/utils';
import { ScheduledEmailSchedule, SentEmail } from '@/types';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmailSchedule[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Fetch emails based on active tab
  useEffect(() => {
    if (!user?.email) return;

    const fetchEmails = async () => {
      setLoading(true);
      try {
        if (activeTab === 'scheduled') {
          const response = await API.getScheduledEmails(user.email);
          setScheduledEmails(response.data);
        } else {
          const response = await API.getSentEmails(user.email);
          setSentEmails(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch emails:', error);
        setToast({ message: 'Failed to load emails', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
    const interval = setInterval(fetchEmails, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [activeTab, user]);

  const handleLogout = () => {
    logout();
    setToast({ message: 'Logged out successfully', type: 'success' });
  };

  const handleComposeSuccess = () => {
    setActiveTab('scheduled');
    setToast({ message: 'Email campaign scheduled successfully!', type: 'success' });
  };

  // Show loading while checking auth
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-6">
          {/* Left sidebar */}
          <aside className="w-72">
            <div className="bg-white rounded-lg p-4 sticky top-6">
              <div className="flex items-center gap-3 mb-4">
                {user?.avatar && (
                  <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full" />
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>

              <Button variant="primary" size="lg" className="w-full mb-4" onClick={() => setIsComposeOpen(true)}>
                ✉️ Compose
              </Button>

              <nav className="flex flex-col gap-2">
                <button
                  onClick={() => setActiveTab('scheduled')}
                  className={`text-left px-3 py-2 rounded-lg flex items-center justify-between ${
                    activeTab === 'scheduled' ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">📋 Scheduled</span>
                  </span>
                  <span className="text-sm text-gray-600">{scheduledEmails.length}</span>
                </button>

                <button
                  onClick={() => setActiveTab('sent')}
                  className={`text-left px-3 py-2 rounded-lg flex items-center justify-between ${
                    activeTab === 'sent' ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">✅ Sent</span>
                  </span>
                  <span className="text-sm text-gray-600">{sentEmails.length}</span>
                </button>
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1">
            {/* Action Bar */}
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Email Manager</h2>
              <Button
                variant="primary"
                size="lg"
                onClick={() => setIsComposeOpen(true)}
              >
                ✉️ Compose New Email
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`px-6 py-2 font-semibold rounded-lg transition-colors ${
                  activeTab === 'scheduled'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                📋 Scheduled Emails
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`px-6 py-2 font-semibold rounded-lg transition-colors ${
                  activeTab === 'sent'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                ✅ Sent Emails
              </button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-1">
                <Card>
                  <MessageList
                    type={activeTab}
                    scheduledItems={scheduledEmails}
                    sentItems={sentEmails}
                    loading={loading}
                    onSelect={(item) => setSelectedItem(item)}
                  />
                </Card>
              </div>

              <div className="col-span-2">
                {selectedItem && (
                  <div className="mb-4">
                    <MessageView item={selectedItem} />
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {isComposeOpen && (
        <ComposeEmailModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          userId={user.email}
          onSuccess={handleComposeSuccess}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
