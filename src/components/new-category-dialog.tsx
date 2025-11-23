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
import { triggerRevalidation } from '@/lib/actions';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

interface NewCategoryDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function NewCategoryDialog({
  isOpen,
  setIsOpen,
}: NewCategoryDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [categoryName, setCategoryName] = React.useState('');
  const [categoryType, setCategoryType] = React.useState<'Entrada' | 'Saída'>('Entrada');

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
      const categoriesCollection = collection(firestore, 'financialCategories');
      await addDoc(categoriesCollection, {
        name: categoryName,
        type: categoryType,
        createdAt: serverTimestamp(),
      });

      await triggerRevalidation('/categorias');
      await triggerRevalidation('/financeiro/novo');
      
      setCategoryName('');
      setCategoryType('Entrada');
      setIsOpen(false);
       toast({
        title: 'Sucesso!',
        description: 'Nova categoria criada.',
      });

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
      setCategoryType('Entrada');
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Tipo</Label>
            <RadioGroup 
                defaultValue={categoryType}
                onValueChange={(value: 'Entrada' | 'Saída') => setCategoryType(value)}
                className="col-span-3 flex gap-4"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Entrada" id="r-in" />
                    <Label htmlFor="r-in">Entrada</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Saída" id="r-out" />
                    <Label htmlFor="r-out">Saída</Label>
                </div>
            </RadioGroup>
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
