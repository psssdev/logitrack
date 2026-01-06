'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3, ChevronLeft, Home, Menu, Package, Users, Truck,
  MapPin, Megaphone, CircleDollarSign, Bus, Ticket, Settings, QrCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { FirebaseClientProvider } from '@/firebase';
import { AuthGuard } from '@/components/auth-guard';
import { Logo } from '@/components/logo';
import { useUser } from '@/firebase';
import { ScrollArea } from '@/components/ui/scroll-area';

const navItems = [
  { href: '/inicio', icon: Home, label: 'Início' },
  { href: '/encomendas', icon: Package, label: 'Encomendas' },
  { href: '/vender-passagem', icon: Ticket, label: 'Vender Passagem' },
  { href: '/clientes', icon: Users, label: 'Clientes' },
  { href: '/cobrancas', icon: CircleDollarSign, label: 'Cobranças' },
  { href: '/financeiro', icon: CircleDollarSign, label: 'Financeiro' },
  { href: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { href: '/veiculos', icon: Bus, label: 'Veículos' },
  { href: '/motoristas', icon: Truck, label: 'Motoristas' },
  { href: '/origens', icon: MapPin, label: 'Origens' },
  { href: '/destinos', icon: MapPin, label: 'Destinos' },
  { href: '/avisame', icon: Megaphone, label: 'Avisa-me' },
  { href: '/pix-config', icon: QrCode, label: 'Partilhar Pix' },
  { href: '/configuracoes', icon: Settings, label: 'Configurações' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = React.useState(false);

  // Persiste preferência do usuário
  React.useEffect(() => {
    const saved = localStorage.getItem('sidebar:open');
    if (saved !== null) setIsSidebarOpen(saved === '1');
  }, []);
  React.useEffect(() => {
    localStorage.setItem('sidebar:open', isSidebarOpen ? '1' : '0');
  }, [isSidebarOpen]);

  return (
    <FirebaseClientProvider>
      <AuthGuard>
          <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <aside
              className={cn(
                'hidden border-r bg-muted/40 md:block transition-all duration-300',
                isSidebarOpen ? 'md:w-[220px] lg:w-[280px]' : 'w-0'
              )}
              aria-label="Navegação lateral"
            >
              {isSidebarOpen && (
                <div className="flex h-full max-h-screen flex-col gap-2">
                  <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Link href="/inicio" className="flex items-center gap-2 font-semibold">
                      <Logo className="h-6 w-6" />
                      <span>LogiTrack</span>
                    </Link>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                      <NavLinks onLinkClick={() => {}} />
                    </nav>
                  </div>
                </div>
              )}
            </aside>

            <div className="flex flex-col">
              <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen((v) => !v)}
                  className="hidden md:flex"
                  aria-label={isSidebarOpen ? 'Recolher menu lateral' : 'Expandir menu lateral'}
                >
                  <ChevronLeft
                    className={cn('h-5 w-5 transition-transform', !isSidebarOpen && 'rotate-180')}
                  />
                </Button>

                <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 md:hidden" aria-label="Abrir menu">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="flex flex-col">
                    <SheetHeader>
                      <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                    </SheetHeader>
                    <nav className="grid gap-2 text-lg font-medium">
                      <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
                        <Link href="/inicio" className="flex items-center gap-2 font-semibold" onClick={() => setIsMobileSheetOpen(false)}>
                          <Logo className="h-6 w-6" />
                          <span>LogiTrack</span>
                        </Link>
                      </div>
                      <ScrollArea className="flex-1">
                          <NavLinks onLinkClick={() => setIsMobileSheetOpen(false)} />
                      </ScrollArea>
                    </nav>
                  </SheetContent>
                </Sheet>

                <div className="w-full flex-1" />

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

const NavLinks = ({ onLinkClick }: { onLinkClick: () => void }) => {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== '/inicio' && pathname.startsWith(href + '/'));

  return (
    <>
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 transition-all',
              active ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-primary'
            )}
            aria-current={active ? 'page' : undefined}
            onClick={onLinkClick}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
};

const UserMenu = () => {
  const { user } = useUser() || {};
  const initials =
    (user?.displayName || user?.email || 'US')
      .split('@')[0]
      .split(' ')
      .map((p) => p[0]?.toUpperCase())
      .slice(0, 2)
      .join('') || 'US';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="rounded-full" aria-label="Abrir menu do usuário">
          <Avatar>
            <AvatarImage src={user?.photoURL || undefined} alt="Avatar" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Suporte</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/">Sair</Link></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
