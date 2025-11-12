'use client';

import * as React from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { FinancialCategory } from '@/lib/types';
import { triggerRevalidation } from '@/lib/actions';

const COMPANY_ID = '1';

interface NewCategoryDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  categoryType: 'Entrada' | 'Saída';
  onCategoryCreated: (newCategory: FinancialCategory) => void;
}

export function NewCategoryDialog({
  isOpen,
  setIsOpen,
  categoryType,
  onCategoryCreated,
}: NewCategoryDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [categoryName, setCategoryName] = React.useState('');

  const handleSave = async () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Erro de conexão.' });
      return;
    }
    if (!categoryName.trim()) {
        toast({ variant: 'destructive', title: 'Nome inválido', description: 'O nome da categoria não pode estar em branco.' });
        return;
    }

    setIsSaving(true);
    try {
      const categoriesCollection = collection(firestore, 'companies', COMPANY_ID, 'financialCategories');
      const newDocRef = await addDoc(categoriesCollection, {
        name: categoryName,
        type: categoryType,
        createdAt: serverTimestamp(),
      });

      const newCategory: FinancialCategory = {
        id: newDocRef.id,
        name: categoryName,
        type: categoryType,
      };

      await triggerRevalidation('/financeiro/novo');
      await triggerRevalidation('/categorias');
      
      onCategoryCreated(newCategory);
      setCategoryName('');
      setIsOpen(false);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: error.message || 'Não foi possível criar a categoria.',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCategoryName('');
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Categoria de {categoryType}</DialogTitle>
          <DialogDescription>
            Crie uma nova categoria para organizar seus lançamentos.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nome
            </Label>
            <Input
              id="name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="col-span-3"
              placeholder='Ex: Venda de Passagem'
              autoFocus
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
            Salvar Categoria
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
