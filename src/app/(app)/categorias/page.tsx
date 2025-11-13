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
import { PlusCircle, MoreHorizontal, Edit, Trash } from 'lucide-react';
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
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { NewCategoryDialog } from '@/components/new-category-dialog';
import { EditCategoryDialog } from '@/components/edit-category-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { triggerRevalidation } from '@/lib/actions';

const COMPANY_ID = '1';

export default function CategoriasPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [isNewCategoryOpen, setIsNewCategoryOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<FinancialCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = React.useState<FinancialCategory | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);

  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(
      collection(firestore, 'companies', COMPANY_ID, 'financialCategories'),
      orderBy('name', 'asc')
    );
  }, [firestore, isUserLoading, user]);

  const { data: categories, isLoading } = useCollection<FinancialCategory>(categoriesQuery);
  const pageIsLoading = isLoading || isUserLoading;

  const handleEdit = (category: FinancialCategory) => {
    setEditingCategory(category);
  };

  const handleDelete = (category: FinancialCategory) => {
    setDeletingCategory(category);
    setIsDeleteAlertOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!firestore || !deletingCategory) return;
    try {
      await deleteDoc(doc(firestore, 'companies', COMPANY_ID, 'financialCategories', deletingCategory.id));
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


  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <h1 className="flex-1 text-2xl font-semibold md:text-3xl">
            Categorias Financeiras
          </h1>
          <Button size="sm" className="h-8 gap-1" onClick={() => setIsNewCategoryOpen(true)}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Nova Categoria
            </span>
          </Button>
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
                categories={categories || []} 
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
  
