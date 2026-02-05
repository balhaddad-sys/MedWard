import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import Card from '../ui/Card';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export default function AIOutputCard({ title, response, model }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = response;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const html = DOMPurify.sanitize(marked.parse(response || ''));

  return (
    <Card className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-neutral-900 text-sm">{title}</h3>
        <div className="flex items-center gap-2">
          {model && (
            <span className="text-xs text-neutral-400">{model}</span>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-trust-blue px-2 py-1 rounded hover:bg-neutral-50"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <div
        className="prose prose-sm max-w-none text-neutral-700
                   prose-headings:text-neutral-900 prose-headings:text-sm prose-headings:font-bold
                   prose-p:text-sm prose-li:text-sm prose-strong:text-neutral-900"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <div className="mt-3 pt-3 border-t border-neutral-100">
        <p className="text-xs text-neutral-400">
          Educational reference only. Always verify with local guidelines and senior clinical judgment.
        </p>
      </div>
    </Card>
  );
}
