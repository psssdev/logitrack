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
import { useAuth, FirebaseClientProvider, useFirestore, useUser } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COMPANY_ID = '1';

// Função para criar o perfil do usuário no Firestore
async function provisionUserProfile(firestore: any, user: User) {
    const userRef = doc(firestore, 'users', user.uid);
    try {
        await setDoc(userRef, {
            displayName: user.displayName || user.email,
            email: user.email,
            companyId: COMPANY_ID,
            role: 'admin', // Assume o primeiro usuário como admin
            createdAt: serverTimestamp(),
        }, { merge: true }); // Use merge para não sobrescrever dados existentes desnecessariamente
    } catch (error) {
        console.error("Error provisioning user profile:", error);
        // Opcional: Lançar um erro aqui para ser pego pelo bloco catch principal
        throw new Error("Failed to create user profile.");
    }
}


function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!auth || !firestore) {
        toast({
            variant: 'destructive',
            title: 'Erro de Configuração',
            description: 'Os serviços de autenticação ou banco de dados não estão disponíveis.',
        });
        return;
    }
    setIsLoading(true);

    try {
      // Tenta fazer o login primeiro
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Se o login for bem-sucedido, garante que o perfil existe
      await provisionUserProfile(firestore, userCredential.user);
      toast({
        title: 'Login bem-sucedido!',
        description: 'Redirecionando para o painel...',
      });
      router.push('/inicio');

    } catch (error: any) {
        // Se o login falhar porque o usuário não existe, tenta criá-lo
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
            try {
                toast({
                    title: 'Usuário não encontrado. Tentando criar conta...',
                });
                const newUserCredential = await createUserWithEmailAndPassword(auth, email, password);
                // Após criar, provisiona o perfil
                await provisionUserProfile(firestore, newUserCredential.user);
                
                toast({
                    title: 'Conta criada com sucesso!',
                    description: 'Login bem-sucedido. Redirecionando...',
                });
                router.push('/inicio');
            } catch (signupError: any) {
                 toast({
                    variant: 'destructive',
                    title: 'Erro no Cadastro',
                    description: signupError.message || 'Não foi possível criar a conta.',
                });
            }
        } else {
             // Lida com outros erros de login (senha errada, etc.)
             toast({
                variant: 'destructive',
                title: 'Erro no Login',
                description: error.message || 'Ocorreu um erro desconhecido.',
            });
        }
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
            Entre com seu email para acessar o painel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Senha</Label>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                'Entrar ou Cadastrar'
              )}
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


export default function LoginPage() {
    return (
        <FirebaseClientProvider>
            <LoginPageContent />
        </FirebaseClientProvider>
    )
}
