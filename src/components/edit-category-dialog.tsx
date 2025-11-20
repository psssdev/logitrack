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
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { FinancialCategory } from '@/lib/types';
import { triggerRevalidation } from '@/lib/actions';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { financialCategorySchema } from '@/lib/schemas';

interface EditCategoryDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  category: FinancialCategory;
}

export function EditCategoryDialog({
  isOpen,
  setIsOpen,
  category,
}: EditCategoryDialogProps) {
  const firestore = useFirestore();
  const { companyId } = useUser();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const [categoryName, setCategoryName] = React.useState(category.name);
  const [categoryType, setCategoryType] = React.useState<'Entrada' | 'Saída'>(category.type);

  React.useEffect(() => {
    if (isOpen) {
      setCategoryName(category.name);
      setCategoryType(category.type);
    }
  }, [isOpen, category]);

  const handleSave = async () => {
    if (!firestore || !companyId) {
      toast({ variant: 'destructive', title: 'Erro de conexão.' });
      return;
    }
    
    const validation = financialCategorySchema.safeParse({ name: categoryName, type: categoryType });
    if(!validation.success) {
        toast({ variant: 'destructive', title: 'Dados inválidos', description: validation.error.errors[0].message });
        return;
    }

    setIsSaving(true);
    try {
      const categoryRef = doc(firestore, 'companies', companyId, 'financialCategories', category.id);
      await updateDoc(categoryRef, {
        name: categoryName,
        type: categoryType,
      });

      await triggerRevalidation('/categorias');
      await triggerRevalidation('/financeiro/novo');
      
      setIsOpen(false);
       toast({
        title: 'Sucesso!',
        description: 'Categoria atualizada.',
      });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: error.message || 'Não foi possível atualizar a categoria.',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Categoria</DialogTitle>
          <DialogDescription>
            Altere as informações da categoria.
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
                value={categoryType}
                onValueChange={(value: 'Entrada' | 'Saída') => setCategoryType(value)}
                className="col-span-3 flex gap-4"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Entrada" id="r-in-edit" />
                    <Label htmlFor="r-in-edit">Entrada</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Saída" id="r-out-edit" />
                    <Label htmlFor="r-out-edit">Saída</Label>
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
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
