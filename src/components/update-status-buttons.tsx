'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Order, Company } from '@/lib/types';
import { PackageCheck, Truck, Loader2 } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { triggerRevalidation } from '@/lib/actions';

const COMPANY_ID = '1';

const openWhatsApp = (phone: string, message: string) => {
    const cleanedPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

export function UpdateStatusButtons({ order }: { order: Order }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const companyRef = useMemoFirebase(() => {
    if(!firestore) return null;
    return doc(firestore, 'companies', COMPANY_ID);
  }, [firestore]);

  const { data: company } = useDoc<Company>(companyRef);

  const handleUpdateStatus = (status: 'EM_ROTA' | 'ENTREGUE') => {
    startTransition(async () => {
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
            return;
        }

        const orderRef = doc(firestore, 'companies', COMPANY_ID, 'orders', order.id);

        try {
            await updateDoc(orderRef, {
                status: status,
                timeline: arrayUnion({
                    status: status,
                    at: serverTimestamp(),
                    userId: user.uid,
                })
            });

            if (company) {
                const trackingLink = `${company.linkBaseRastreio || 'https://rastreio.com/'}${order.codigoRastreio}`;
                let messageTemplate: string | undefined;

                if (status === 'EM_ROTA') {
                    messageTemplate = company.msgEmRota;
                } else if (status === 'ENTREGUE') {
                    messageTemplate = company.msgEntregue;
                }

                if (messageTemplate) {
                    let message = messageTemplate;
                    message = message.replace('{cliente}', order.nomeCliente);
                    message = message.replace('{codigo}', order.codigoRastreio);
                    message = message.replace('{link}', trackingLink);
                    openWhatsApp(order.telefone, message);
                }
            }


            // Revalidate paths to reflect changes
            await triggerRevalidation(`/encomendas/${order.id}`);
            await triggerRevalidation('/encomendas');
            await triggerRevalidation('/dashboard');

            toast({
                title: 'Sucesso',
                description: `Status da encomenda atualizado. Verifique o WhatsApp para notificar.`,
            });
        } catch (error: any) {
            console.error("Error updating status:", error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Não foi possível atualizar o status.',
            });
        }
    });
  };

  return (
    <>
      {order.status === 'PENDENTE' && (
        <Button
          onClick={() => handleUpdateStatus('EM_ROTA')}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
          Marcar como Em Rota
        </Button>
      )}
      {order.status === 'EM_ROTA' && (
        <Button
          onClick={() => handleUpdateStatus('ENTREGUE')}
          disabled={isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
          Marcar como Entregue
        </Button>
      )}
    </>
  );
}
