'use client';

import { useState, useEffect } from 'react';
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
import { useFirestore, useUser, useStore } from '@/firebase';
import { doc, Timestamp, arrayUnion, writeBatch, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientDebt {
    clientId: string;
    nomeCliente: string;
    telefone?: string;
    totalPendente: number;
    orderCount: number;
    pendingOrders: Order[];
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  boleto: 'Boleto',
  link: 'Link',
  haver: 'A Haver', 
};

interface RecordPaymentDialogProps {
  clientDebt: ClientDebt | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onPaymentRecorded: () => void;
}

export function RecordPaymentDialog({
  clientDebt,
  isOpen,
  setIsOpen,
  onPaymentRecorded,
}: RecordPaymentDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { selectedStore } = useStore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    if (clientDebt) {
      setPaymentAmount(clientDebt.totalPendente);
      setPaymentMethod('pix');
      setPaymentNotes('');
      setPaymentDate(new Date());
    }
  }, [clientDebt]);

  if (!clientDebt) return null;

  const handleSave = async () => {
    if (!firestore || !user || !selectedStore || !paymentDate || !paymentMethod || !paymentAmount || paymentAmount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Erro de Validação',
        description: 'Preencha um valor e método de pagamento válidos.',
      });
      return;
    }
    setIsSaving(true);
    
    const batch = writeBatch(firestore);
    let amountToDistribute = paymentAmount;

    try {
        // Sort orders to pay off oldest first
        const sortedOrders = [...clientDebt.pendingOrders].sort((a, b) => {
            const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateA.getTime() - dateB.getTime();
        });

        for (const order of sortedOrders) {
            if (amountToDistribute <= 0) break;

            const paidOnOrder = order.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
            const pendingOnOrder = order.valorEntrega - paidOnOrder;
            if (pendingOnOrder <= 0) continue;

            const amountToPayOnThisOrder = Math.min(amountToDistribute, pendingOnOrder);
            
            const paymentRecord = {
                amount: amountToPayOnThisOrder,
                method: paymentMethod,
                date: Timestamp.fromDate(paymentDate),
                notes: paymentNotes || `Pagamento parcial de ${clientDebt.nomeCliente}`
            };

            const orderRef = doc(firestore, 'stores', selectedStore.id, 'orders', order.id);

            const newTotalPaid = paidOnOrder + amountToPayOnThisOrder;
            const isOrderFullyPaid = newTotalPaid >= order.valorEntrega;

            batch.update(orderRef, {
                payments: arrayUnion(paymentRecord),
                pago: isOrderFullyPaid,
                ...(isOrderFullyPaid && { dataPagamento: Timestamp.fromDate(paymentDate) }),
                updatedAt: serverTimestamp(),
            });

            amountToDistribute -= amountToPayOnThisOrder;
        }

      await batch.commit();

      toast({
        title: 'Pagamento Registrado!',
        description: `Recebido ${paymentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de ${clientDebt.nomeCliente}.`,
      });
      onPaymentRecorded();
      setIsOpen(false);

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
            Registre um pagamento para o cliente{' '}
            <span className="font-mono font-bold text-foreground">
              {clientDebt.nomeCliente}
            </span>
            .
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
           <div className="p-4 bg-muted/50 rounded-md">
                <p className="text-sm text-muted-foreground">Valor total pendente</p>
                <p className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(clientDebt.totalPendente)}</p>
           </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Valor Pago
            </Label>
            <Input
              id="amount"
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.valueAsNumber || 0)}
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
            <Select
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              defaultValue={paymentMethod}
            >
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
