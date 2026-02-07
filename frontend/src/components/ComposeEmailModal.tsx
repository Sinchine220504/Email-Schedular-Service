'use client';

import React, { useState } from 'react';
import { Modal, Button, Input, TextArea, Toast } from './ui';
import { parseEmails } from '@/lib/utils';
import { API } from '@/lib/api';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess?: () => void;
}

export const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSuccess,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientsText, setRecipientsText] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [attachments, setAttachments] = useState<Array<{ filename: string; contentBase64: string; contentType: string }>>([]);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [startTime, setStartTime] = useState('');
  const [delayMs, setDelayMs] = useState('2000');
  const [hourlyLimit, setHourlyLimit] = useState('200');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // parse emails from both uploaded CSV/TXT content and manual recipients input
  const emails = parseEmails(`${csvContent}\n${recipientsText}`);

  const toDateTimeLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!subject.trim()) newErrors.subject = 'Subject is required';
    if (!body.trim()) newErrors.body = 'Body is required';
    if (emails.length === 0) newErrors.csvContent = 'At least one valid email is required';
    if (!startTime) newErrors.startTime = 'Start time is required';

    const startDate = new Date(startTime);
    if (startDate <= new Date()) {
      newErrors.startTime = 'Start time must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setToast({ message: 'Please fix the errors above', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      const response = await API.scheduleEmails(userId, {
        subject,
        body,
        recipients: emails,
        startTime: new Date(startTime).toISOString(),
        delayMs: parseInt(delayMs, 10),
        hourlyLimit: parseInt(hourlyLimit, 10),
        attachments,
      });

      setToast({
        message: `Successfully scheduled ${response.data.totalEmails} email(s)!`,
        type: 'success',
      });

      // Reset form
      setSubject('');
      setBody('');
      setCsvContent('');
      setStartTime('');
      setDelayMs('2000');
      setHourlyLimit('200');
      setErrors({});

      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 2000);
    } catch (error: any) {
      console.error('Schedule error:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to schedule emails';
      setToast({
        message: errorMsg,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isText = file.type.startsWith('text') || ext === 'csv' || ext === 'txt';

      const reader = new FileReader();
      if (isText) {
        reader.onload = (event) => {
          const content = event.target?.result as string;
          // append to existing csvContent
          setCsvContent((prev) => (prev ? prev + '\n' + content : content));
        };
        reader.readAsText(file);
      } else {
        // read as data URL for binary attachments
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          // dataUrl format: data:<mime>;base64,<base64data>
          const match = dataUrl.match(/^data:(.*);base64,(.*)$/s);
          if (match) {
            const mime = match[1];
            const b64 = match[2];
            setAttachments((prev) => [...prev, { filename: file.name, contentBase64: b64, contentType: mime }]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const removeRecipient = (email: string) => {
    // remove from manual text if present
    setRecipientsText((prev) => prev.split(/[,\n]+/).map(s => s.trim()).filter(Boolean).filter(e => e !== email).join('\n'));
    // also remove from csvContent if present
    setCsvContent((prev) => prev.split(/[,\n]+/).map(s => s.trim()).filter(Boolean).filter(e => e !== email).join('\n'));
  };

  const handleSendLater = async () => {
    // set start time to 1 minute from now if not set
    if (!startTime) {
      setStartTime(toDateTimeLocal(new Date(Date.now() + 60 * 1000)));
    }
    // then submit
    await handleSubmit(new Event('submit') as any);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        title="Compose New Email Campaign"
        onClose={onClose}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={loading}>
              Schedule Campaign
            </Button>
          </div>
        }
      >
        <form className="flex flex-col gap-4">
          <Input
            label="Subject Line"
            placeholder="Enter email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            error={errors.subject}
            required
          />

          <TextArea
            label="Email Body"
            placeholder="Enter email content in HTML or plain text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            error={errors.body}
            rows={6}
            required
          />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Recipients (one per line or comma-separated)
            </label>
            <TextArea
              placeholder="you@example.com, another@example.com OR one per line"
              value={recipientsText}
              onChange={(e) => setRecipientsText(e.target.value)}
              rows={4}
            />

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 block mb-2 mt-4">Or upload Email List (CSV/TXT)</label>
              <button type="button" className="text-sm text-blue-600 underline" onClick={triggerUpload}>Upload List</button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,image/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />

            {errors.csvContent && <span className="text-sm text-red-600">{errors.csvContent}</span>}
            {emails.length > 0 && (
              <p className="text-sm text-green-600 mt-2">✅ {emails.length} valid email(s) found</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Start Time"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              error={errors.startTime}
              required
            />

            <Input
              label="Delay Between Emails (ms)"
              type="number"
              min="0"
              value={delayMs}
              onChange={(e) => setDelayMs(e.target.value)}
              helperText="Milliseconds between each email"
            />

            <Input
              label="Hourly Limit"
              type="number"
              min="1"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(e.target.value)}
              helperText="Max emails per hour"
            />
          </div>
        </form>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};
