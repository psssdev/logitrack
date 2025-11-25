'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { useAuth, FirebaseClientProvider } from '@/firebase';
import {
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

function getFriendlyAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/invalid-credential':
      return 'Email ou senha inválidos. Por favor, verifique e tente novamente.';
    case 'auth/user-not-found':
      return 'Nenhuma conta encontrada com este email.';
    case 'auth/wrong-password':
      return 'Senha incorreta. Por favor, tente novamente.';
    case 'auth/invalid-email':
      return 'O formato do email é inválido.';
    default:
      return 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.';
  }
}


function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!auth) {
      toast({
        variant: 'destructive',
        title: 'Erro de Configuração',
        description: 'O serviço de autenticação não está disponível no momento.',
      });
      return;
    }

    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/inicio');
    } catch (error: any) {
      const friendlyMessage = getFriendlyAuthErrorMessage(error.code);
      toast({
        variant: 'destructive',
        title: 'Erro no Login',
        description: friendlyMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl">LogiTrack</CardTitle>
          <CardDescription>
            Acesse sua conta para gerenciar as operações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4 pt-4">
            <AuthFields
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              isLoading={isLoading}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Entrar'}
            </Button>
          </form>
           <div className="mt-4 text-center text-sm">
            <Link
              href="/rastreio"
              className="underline text-muted-foreground hover:text-primary"
            >
              Rastrear uma encomenda
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const AuthFields = ({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  isLoading,
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  isLoading: boolean;
}) => (
  <>
    <div className="grid gap-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        placeholder="seu@email.com"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
      />
    </div>
    <div className="grid gap-2">
      <Label htmlFor="password">Senha</Label>
      <div className="relative">
        <Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          minLength={6}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          onClick={() => setShowPassword((prev) => !prev)}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          <span className="sr-only">
            {showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          </span>
        </Button>
      </div>
    </div>
  </>
);


export default function LoginPage() {
  return (
    <FirebaseClientProvider>
      <AuthForm />
    </FirebaseClientProvider>
  );
}
