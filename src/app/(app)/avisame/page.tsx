'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Client, Address, Company } from '@/lib/types';
import { collection, doc } from 'firebase/firestore';
import { MessageCircle, Megaphone, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

const COMPANY_ID = '1';

// Combined type for easier handling
type ClientWithAddresses = Client & { addresses: Address[] };

const openWhatsApp = (phone: string, message: string) => {
    const cleanedPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
};


export default function AvisamePage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [selectedCity, setSelectedCity] = useState<string | null>(null);

    // Fetch company settings for the message template
    const companyRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'companies', COMPANY_ID);
    }, [firestore]);
    const { data: company, isLoading: isLoadingCompany } = useDoc<Company>(companyRef);

    // Fetch all clients
    const clientsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'companies', COMPANY_ID, 'clients');
    }, [firestore]);
    const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);

    // Fetch all addresses for all clients (less efficient, but works for this structure)
    // A better approach in a real-world scenario might be a denormalized city field on the client.
    const allAddressesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'companies', COMPANY_ID, 'addresses'); // This is a conceptual query
    }, [firestore]);
    // This hook isn't real, so we'll fetch addresses per client below. This is a placeholder.


    const [clientsWithAddresses, setClientsWithAddresses] = useState<ClientWithAddresses[]>([]);
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);

    useMemo(() => {
        if (!clients || !firestore) return;

        const fetchAllAddresses = async () => {
            setIsLoadingAddresses(true);
            const clientsData = await Promise.all(
                clients.map(async (client) => {
                    const addressesCollection = collection(firestore, 'companies', COMPANY_ID, 'clients', client.id, 'addresses');
                    const addressesSnap = await require('firebase/firestore').getDocs(addressesCollection);
                    const addresses = addressesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Address));
                    return { ...client, addresses };
                })
            );
            setClientsWithAddresses(clientsData);
            setIsLoadingAddresses(false);
        };

        fetchAllAddresses();
    }, [clients, firestore]);

    const isLoading = isLoadingClients || isLoadingCompany || isLoadingAddresses;

    const { cities, filteredClients } = useMemo(() => {
        if (!clientsWithAddresses) return { cities: [], filteredClients: [] };
        
        const citySet = new Set<string>();
        clientsWithAddresses.forEach(client => {
            client.addresses.forEach(address => {
                if (address.cidade) {
                    citySet.add(address.cidade);
                }
            });
        });

        const sortedCities = Array.from(citySet).sort((a, b) => a.localeCompare(b));

        const filtered = selectedCity
            ? clientsWithAddresses.filter(client => 
                client.addresses.some(address => address.cidade === selectedCity)
              )
            : [];

        return { cities: sortedCities, filteredClients: filtered };

    }, [clientsWithAddresses, selectedCity]);

    const handleNotifyAll = () => {
        if (!selectedCity || !company) return;

        const messageTemplate = company.msgChegueiCidade || "Olá! Estamos na sua cidade ({cidade}) para realizar entregas hoje. Fique atento!";
        const message = messageTemplate.replace('{cidade}', selectedCity);

        filteredClients.forEach((client, index) => {
             // Stagger the calls to avoid the browser blocking too many popups
            setTimeout(() => {
                openWhatsApp(client.telefone, message);
            }, index * 300);
        });

        toast({
            title: `Notificando ${filteredClients.length} clientes`,
            description: `Avisos para a cidade de ${selectedCity} estão sendo preparados.`,
        });
    };
    
    const handleNotifySingle = (client: Client) => {
        if (!selectedCity || !company) return;
        const messageTemplate = company.msgChegueiCidade || "Olá! Estamos na sua cidade ({cidade}) para realizar entregas hoje. Fique atento!";
        const message = messageTemplate.replace('{cidade}', selectedCity);
        openWhatsApp(client.telefone, message);
    };


    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center">
                <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Avisa-me</h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Megaphone className="h-6 w-6" />
                        Notificar Clientes por Cidade
                    </CardTitle>
                    <CardDescription>
                        Envie um aviso em massa para todos os clientes de uma cidade específica.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="max-w-sm space-y-2">
                        <label htmlFor="city-select" className="text-sm font-medium">Selecione uma Cidade</label>
                        {isLoading ? (
                            <Skeleton className="h-10 w-full" />
                        ) : (
                            <Select onValueChange={setSelectedCity} disabled={cities.length === 0}>
                                <SelectTrigger id="city-select">
                                    <SelectValue placeholder={cities.length > 0 ? "Escolha uma cidade..." : "Nenhum cliente com endereço"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {cities.map(city => (
                                        <SelectItem key={city} value={city}>
                                            {city}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                    
                    {selectedCity && (
                         <Card>
                             <CardHeader className="flex flex-row items-center justify-between">
                                 <div>
                                    <CardTitle>Clientes em {selectedCity}</CardTitle>
                                    <CardDescription>{filteredClients.length} cliente(s) encontrado(s).</CardDescription>
                                 </div>
                                 <Button onClick={handleNotifyAll} disabled={filteredClients.length === 0}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Avisar Todos ({filteredClients.length})
                                 </Button>
                             </CardHeader>
                             <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-48 w-full" />
                                ) : filteredClients.length > 0 ? (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Nome</TableHead>
                                                    <TableHead>Telefone</TableHead>
                                                    <TableHead className="text-right">Ação</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredClients.map(client => (
                                                    <TableRow key={client.id}>
                                                        <TableCell className="font-medium">{client.nome}</TableCell>
                                                        <TableCell>{client.telefone}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="outline" size="sm" onClick={() => handleNotifySingle(client)}>
                                                                <MessageCircle className="mr-2 h-4 w-4" />
                                                                Avisar
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed text-center">
                                        <p className="text-muted-foreground">Nenhum cliente encontrado para esta cidade.</p>
                                    </div>
                                )}
                             </CardContent>
                         </Card>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}
