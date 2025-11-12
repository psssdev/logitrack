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
import { PlusCircle, MoreHorizontal } from 'lucide-react';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { FinancialCategory } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';
import { NewCategoryDialog } from '@/components/new-category-dialog';

const COMPANY_ID = '1';

export default function CategoriasPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [isNewCategoryOpen, setIsNewCategoryOpen] = React.useState(false);

  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(
      collection(firestore, 'companies', COMPANY_ID, 'financialCategories'),
      orderBy('name', 'asc')
    );
  }, [firestore, isUserLoading, user]);

  const { data: categories, isLoading } = useCollection<FinancialCategory>(categoriesQuery);
  const pageIsLoading = isLoading || isUserLoading;

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
              <CategoryList categories={categories || []} />
            )}
          </CardContent>
        </Card>
      </div>
      <NewCategoryDialog
        isOpen={isNewCategoryOpen}
        setIsOpen={setIsNewCategoryOpen}
      />
    </>
  );
}

function CategoryList({ categories }: { categories: FinancialCategory[] }) {
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
                    <Badge variant={category.type === 'Entrada' ? 'default' : 'destructive'} className={category.type === 'Entrada' ? 'bg-green-600' : ''}>
                        {category.type}
                    </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
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
  
