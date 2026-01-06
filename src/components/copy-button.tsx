'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboardSafe } from '@/lib/clipboard';
import { Clipboard, ClipboardCheck } from 'lucide-react';
import { useState } from 'react';

export function CopyButton({ value, label = 'Copiar', className = '' }: { value: string; label?: string; className?: string }) {
  const { toast } = useToast();
  const [done, setDone] = useState(false);

  const onCopy = async () => {
    const ok = await copyToClipboardSafe(value);
    setDone(ok);
    toast({
      title: ok ? 'Copiado!' : 'Não foi possível copiar',
      description: ok
        ? 'Texto enviado para a área de transferência.'
        : 'Seu navegador bloqueou o acesso. Use Ctrl/Cmd+C ou verifique permissões/iframe.',
      variant: ok ? 'default' : 'destructive',
    });
    if (ok) setTimeout(() => setDone(false), 1200);
  };

  return (
    <Button onClick={onCopy} className={className} variant="outline" size="sm">
      {done ? <ClipboardCheck className="mr-2 h-4 w-4" /> : <Clipboard className="mr-2 h-4 w-4" />}
      {done ? 'Copiado' : label}
    </Button>
  );
}
