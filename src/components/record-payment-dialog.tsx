'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Textarea } from './ui/textarea';
import type { Order, PaymentMethod } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COMPANY_ID = '1';

const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  boleto: 'Boleto',
  link: 'Link',
  haver: 'A Haver', // Shouldn't be selectable here but included for completeness
};

interface RecordPaymentDialogProps {
  order: Order | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onPaymentRecorded: () => void;
}

export function RecordPaymentDialog({
  order,
  isOpen,
  setIsOpen,
  onPaymentRecorded,
}: RecordPaymentDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [paymentNotes, setPaymentNotes] = useState('');

  if (!order) return null;
  
  const handleSave = async () => {
    if (!firestore || !paymentDate || !paymentMethod) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Preencha todos os campos obrigatórios.'});
        return;
    }
    setIsSaving(true);

    const orderRef = doc(firestore, 'companies', COMPANY_ID, 'orders', order.id);

    try {
      await updateDoc(orderRef, {
        pago: true,
        formaPagamento: paymentMethod, // Update the payment method from 'haver' to the actual one
        dataPagamento: Timestamp.fromDate(paymentDate), // Save payment date
        notasPagamento: paymentNotes, // Save any notes
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Pagamento Registrado!',
        description: `A encomenda ${order.codigoRastreio} foi marcada como paga.`,
      });
      onPaymentRecorded(); // Callback to refresh the parent component
      setIsOpen(false); // Close the dialog
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: error.message || 'Não foi possível registrar o pagamento.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>
            Confirme os detalhes do pagamento para a encomenda{' '}
            <span className="font-mono font-bold text-foreground">
              {order.codigoRastreio}
            </span>
            .
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Valor
            </Label>
            <Input
              id="amount"
              type="number"
              value={order.valorEntrega}
              disabled
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="payment-date" className="text-right">
              Data Pag.
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'col-span-3 justify-start text-left font-normal',
                    !paymentDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? (
                    format(paymentDate, 'PPP', { locale: ptBR })
                  ) : (
                    <span>Escolha uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={setPaymentDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="payment-method" className="text-right">
              Forma
            </Label>
             <Select onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} defaultValue={paymentMethod}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(paymentMethodLabels)
                  .filter(([key]) => key !== 'haver') // Don't allow selecting 'A Haver' again
                  .map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
           <div className="grid grid-cols-4 items-start gap-4">
             <Label htmlFor="notes" className="text-right pt-2">
                Notas
             </Label>
            <Textarea
              id="notes"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Ex: Pagamento parcial, ref. a 2 entregas, etc."
              className="col-span-3"
            />
           </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isSaving}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
