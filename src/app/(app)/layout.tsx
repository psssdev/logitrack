
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  ChevronLeft,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  Users,
  Truck,
  MapPin,
  DollarSign,
  Building,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { FirebaseClientProvider } from '@/firebase';
import { AuthGuard, useCompany } from '@/components/auth-guard';
import { Skeleton } from '@/components/ui/skeleton';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/encomendas', icon: Package, label: 'Encomendas' },
  { href: '/clientes', icon: Users, label: 'Clientes' },
  { href: '/motoristas', icon: Truck, label: 'Motoristas' },
  { href: '/origens', icon: MapPin, label: 'Origens' },
  { href: '/financeiro', icon: DollarSign, label: 'Financeiro' },
  { href: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { href: '/configuracoes', icon: Settings, label: 'Configurações' },
];


function CompanyBranding() {
  const { company, isLoading } = useCompany();

  if (isLoading) {
    return (
        <div className="flex items-center gap-2 font-semibold">
            <Skeleton className="h-6 w-6 rounded-sm" />
            <Skeleton className="h-5 w-24" />
        </div>
    );
  }

  return (
    <Link
      href="/"
      className="flex items-center gap-2 font-semibold"
    >
      {company?.logoUrl ? (
        <img src={company.logoUrl} alt="Logo da Empresa" className="h-6 w-auto" />
      ) : (
        <Logo className="h-6 w-6" />
      )}
      <span>{company?.nomeFantasia || 'LogiTrack'}</span>
    </Link>
  );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  return (
    <FirebaseClientProvider>
      <AuthGuard>
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
          <div
            className={cn(
              'hidden border-r bg-muted/40 md:block transition-all duration-300',
              isSidebarOpen ? 'md:w-[220px] lg:w-[280px]' : 'w-0'
            )}
          >
            {isSidebarOpen && (
              <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                  <CompanyBranding />
                </div>
                <div className="flex-1">
                  <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    <NavLinks />
                  </nav>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden md:flex"
              >
                <ChevronLeft
                  className={cn(
                    'h-5 w-5 transition-transform',
                    !isSidebarOpen && 'rotate-180'
                  )}
                />
              </Button>

              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 md:hidden"
                  >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col">
                  <SheetHeader>
                    <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                  </SheetHeader>
                  <nav className="grid gap-2 text-lg font-medium">
                    <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                        <CompanyBranding />
                    </div>
                    <NavLinks />
                  </nav>
                </SheetContent>
              </Sheet>

              <div className="w-full flex-1">
                {/* Can add a global search here */}
              </div>
              <ThemeToggle />
              <UserMenu />
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
              {children}
            </main>
          </div>
        </div>
      </AuthGuard>
    </FirebaseClientProvider>
  );
}

const NavLinks = () => {
  const pathname = usePathname();
  return (
    <>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
            pathname.startsWith(item.href) && 'bg-muted text-primary'
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </>
  );
};

const UserMenu = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="rounded-full">
          <Avatar>
            <AvatarImage
              src="https://picsum.photos/seed/user-avatar/40/40"
              data-ai-hint="person face"
            />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          <span className="sr-only">Toggle user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Configurações</DropdownMenuItem>
        <DropdownMenuItem>Suporte</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">Sair</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
