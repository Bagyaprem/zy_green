import { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export interface GeneratedCredentials {
  loginEmail: string;
  password: string;
}

interface GeneratedCredentialsDialogProps {
  credentials: GeneratedCredentials | null;
  onOpenChange: (open: boolean) => void;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable in some sandboxed environments
    }
  };
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
        <code className="flex-1 truncate text-sm text-foreground">{value}</code>
        <button type="button" onClick={handleCopy} className="text-muted-foreground hover:text-foreground">
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function GeneratedCredentialsDialog({ credentials, onOpenChange }: GeneratedCredentialsDialogProps) {
  return (
    <Dialog open={!!credentials} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <DialogTitle>Customer Login Created</DialogTitle>
          <DialogDescription>
            Share these with the customer securely — the password won't be shown again after you close this.
          </DialogDescription>
        </DialogHeader>
        {credentials && (
          <div className="space-y-3">
            <CopyField label="Username" value={credentials.loginEmail} />
            <CopyField label="Password" value={credentials.password} />
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
