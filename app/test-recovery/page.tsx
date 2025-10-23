'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function TestRecoveryPage() {
  const [email, setEmail] = useState('test@example.com');
  const [isGenerating, setIsGenerating] = useState(false);
  const [recoveryUrl, setRecoveryUrl] = useState('');

  const generateRecoveryLink = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setIsGenerating(true);
      
      const response = await fetch('/api/create-recovery-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate recovery link');
      }

      setRecoveryUrl(data.url);
      toast.success('Recovery link generated successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate recovery link');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyUrl = async () => {
    if (recoveryUrl) {
      try {
        await navigator.clipboard.writeText(recoveryUrl);
        toast.success('URL copied to clipboard');
      } catch {
        toast.error('Failed to copy to clipboard');
      }
    }
  };

  const openUrl = () => {
    if (recoveryUrl) {
      window.open(recoveryUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-[#181818] border-gray-700 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl text-white mb-2">Test Recovery Link Generator</CardTitle>
          <p className="text-gray-400">
            Generate recovery links for testing the wallet creation flow
          </p>
        </CardHeader>

        <CardContent className="space-y-6 px-6 pb-6">
          {/* Email Input */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">
              Email Address
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20"
              disabled={isGenerating}
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateRecoveryLink}
            disabled={!email.trim() || isGenerating}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Mail className="w-4 h-4 mr-2 animate-pulse" />
                Generating Link...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Generate Recovery Link
              </>
            )}
          </Button>

          {/* Generated URL */}
          {recoveryUrl && (
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
                <h3 className="text-green-300 font-medium mb-3">Recovery Link Generated</h3>
                <div className="bg-gray-900 border border-gray-700 rounded p-3">
                  <p className="text-gray-300 text-sm font-mono break-all">
                    {recoveryUrl}
                  </p>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={copyUrl}
                    variant="outline"
                    size="sm"
                    className="text-gray-300 border-gray-600 hover:bg-gray-800"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy URL
                  </Button>
                  <Button
                    onClick={openUrl}
                    variant="outline"
                    size="sm"
                    className="text-gray-300 border-gray-600 hover:bg-gray-800"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Link
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
            <h3 className="text-blue-300 font-medium mb-3">How to Test</h3>
            <ol className="text-blue-200/80 text-sm space-y-2">
              <li className="flex items-start">
                <span className="mr-3 text-blue-400">1.</span>
                Enter an email address and click &quot;Generate Recovery Link&quot;
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-blue-400">2.</span>
                Copy the generated URL or click &quot;Open Link&quot; to test the flow
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-blue-400">3.</span>
                Follow the wallet creation process and see the welcome page
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-blue-400">4.</span>
                The created wallet will be saved locally with your chosen passphrase
              </li>
            </ol>
          </div>

          {/* Development Notice */}
          <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
            <h4 className="text-yellow-300 font-medium text-sm mb-2">Development Mode</h4>
            <p className="text-yellow-200/80 text-sm">
              This tool is for development and testing only. In production, recovery links would be sent via email.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
