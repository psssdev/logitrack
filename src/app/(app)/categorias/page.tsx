'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlusCircle, MoreHorizontal, Edit, Trash, Sparkles } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { FinancialCategory } from '@/lib/types';
import { collection, query, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { NewCategoryDialog } from '@/components/new-category-dialog';
import { EditCategoryDialog } from '@/components/edit-category-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { triggerRevalidation } from '@/lib/actions';


const defaultExpenseCategories = [
    { name: "Combustível", type: "Saída" },
    { name: "Alimentação", type: "Saída" },
    { name: "Hospedagem", type: "Saída" },
    { name: "Manutenção", type: "Saída" },
    { name: "Pedágio", type: "Saída" },
    { name: "Salário/Pró-labore", type: "Saída" },
    { name: "Impostos", type: "Saída" },
    { name: "Outros", type: "Saída" },
];


export default function CategoriasPage() {
  const firestore = useFirestore();
  const { user, companyId, isUserLoading } = useUser();
  const { toast } = useToast();

  const [isNewCategoryOpen, setIsNewCategoryOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<FinancialCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = React.useState<FinancialCategory | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
  const [isCreatingDefaults, setIsCreatingDefaults] = React.useState(false);

  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !companyId) return null;
    return query(
      collection(firestore, 'companies', companyId, 'financialCategories')
    );
  }, [firestore, companyId, isUserLoading]);

  const { data: categories, isLoading } = useCollection<FinancialCategory>(categoriesQuery);
  const pageIsLoading = isLoading || isUserLoading;

  // Sort categories client-side
  const sortedCategories = React.useMemo(() => {
    if (!categories) return [];
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const handleEdit = (category: FinancialCategory) => {
    setEditingCategory(category);
  };

  const handleDelete = (category: FinancialCategory) => {
    setDeletingCategory(category);
    setIsDeleteAlertOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!firestore || !deletingCategory || !companyId) return;
    try {
      await deleteDoc(doc(firestore, 'companies', companyId, 'financialCategories', deletingCategory.id));
      await triggerRevalidation('/categorias');
      await triggerRevalidation('/financeiro/novo');
      toast({
        title: "Categoria excluída",
        description: `A categoria "${deletingCategory.name}" foi removida.`,
      });
    } catch(error: any) {
        toast({
            variant: "destructive",
            title: "Erro ao excluir",
            description: error.message,
        });
    } finally {
        setIsDeleteAlertOpen(false);
        setDeletingCategory(null);
    }
  }

  const handleCreateDefaultCategories = async () => {
    if (!firestore || !companyId) {
        toast({ variant: "destructive", title: "Erro de conexão" });
        return;
    }
    setIsCreatingDefaults(true);
    try {
        const categoriesCollection = collection(firestore, 'companies', companyId, 'financialCategories');
        const existingCategoryNames = new Set(categories?.map(c => c.name.toLowerCase()));
        
        const batch = writeBatch(firestore);
        let count = 0;

        defaultExpenseCategories.forEach(defaultCategory => {
            if (!existingCategoryNames.has(defaultCategory.name.toLowerCase())) {
                const newDocRef = doc(categoriesCollection);
                batch.set(newDocRef, defaultCategory);
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
            await triggerRevalidation('/categorias');
            await triggerRevalidation('/financeiro/despesa/nova');
            toast({
                title: "Categorias Adicionadas!",
                description: `${count} novas categorias padrão de despesa foram criadas.`
            });
        } else {
             toast({
                description: `Todas as categorias padrão já existem.`
            });
        }

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro ao criar categorias",
            description: error.message,
        });
    } finally {
        setIsCreatingDefaults(false);
    }
  };


  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center flex-wrap gap-2">
          <h1 className="flex-1 text-2xl font-semibold md:text-3xl">
            Categorias Financeiras
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleCreateDefaultCategories} disabled={isCreatingDefaults}>
                <Sparkles className="h-3.5 w-3.5" />
                 <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Adicionar Padrões
                </span>
            </Button>
            <Button size="sm" className="h-8 gap-1" onClick={() => setIsNewCategoryOpen(true)}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Nova Categoria
                </span>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Categorias</CardTitle>
            <CardDescription>
              Crie e organize as categorias para suas receitas e despesas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pageIsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <CategoryList 
                categories={sortedCategories || []} 
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <NewCategoryDialog
        isOpen={isNewCategoryOpen}
        setIsOpen={setIsNewCategoryOpen}
      />
      
      {editingCategory && (
        <EditCategoryDialog
            isOpen={!!editingCategory}
            setIsOpen={(isOpen) => !isOpen && setEditingCategory(null)}
            category={editingCategory}
        />
      )}

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                   Esta ação não pode ser desfeita. Isso excluirá permanentemente a categoria <span className="font-bold">"{deletingCategory?.name}"</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface CategoryListProps {
    categories: FinancialCategory[];
    onEdit: (category: FinancialCategory) => void;
    onDelete: (category: FinancialCategory) => void;
}

function CategoryList({ categories, onEdit, onDelete }: CategoryListProps) {
    if (categories.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 p-12 text-center">
          <p className="text-muted-foreground">Nenhuma categoria cadastrada.</p>
          <p className="text-sm text-muted-foreground/80">
            Adicione uma categoria para começar a organizar suas finanças.
          </p>
        </div>
      );
    }
  
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>
                    <Badge variant={category.type === 'Entrada' ? 'secondary' : 'destructive'} >
                        {category.type}
                    </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => onEdit(category)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                             <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(category)}>
                                <Trash className="mr-2 h-4 w-4" />
                                Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
