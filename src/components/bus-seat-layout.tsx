'use client'

import React from 'react';
import type { Vehicle, SeatLayout } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Armchair, Tv, DoorOpen,Accessibility, CircleOff, Utensils, GlassWater } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface BusSeatLayoutProps {
  vehicle: Vehicle;
  selectedSeats: string[];
  onSeatSelect: (seats: string[]) => void;
}

const Seat = ({ 
    id, 
    status, 
    isSelected, 
    onClick 
}: { 
    id: string | null; 
    status: 'available' | 'occupied'; 
    isSelected: boolean; 
    onClick: (id: string) => void;
}) => {
    if (!id) {
        return <div className="w-8 h-8" />;
    }

    const isAvailable = status === 'available';
    const isOccupied = status === 'occupied';

    const seatIcon = (
        <Armchair className={cn(
            "w-7 h-7 transition-colors",
            isOccupied ? "text-red-400" : "text-gray-400",
            isSelected && "text-blue-500",
            isAvailable && "hover:text-green-500 cursor-pointer",
        )} />
    );

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8"
                        onClick={() => isAvailable && onClick(id)}
                        disabled={isOccupied}
                        aria-label={`Assento ${id}`}
                    >
                        {seatIcon}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Assento {id}</p>
                    {isOccupied && <p className="text-red-500">Ocupado</p>}
                    {isSelected && <p className="text-blue-500">Selecionado</p>}
                    {isAvailable && !isSelected && <p className="text-green-500">Disponível</p>}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

const Deck = ({ 
    title, 
    layout, 
    occupiedSeats, 
    selectedSeats, 
    onSeatClick 
}: { 
    title: string; 
    layout: { [key: string]: (string | null)[] };
    occupiedSeats: string[];
    selectedSeats: string[];
    onSeatClick: (id: string) => void;
}) => (
    <div>
        <h3 className="font-semibold text-lg mb-2 text-center">{title}</h3>
        <div className="bg-muted/50 p-4 rounded-lg border-2 border-dashed flex flex-col items-center">
            {Object.values(layout).map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-1 my-1">
                    {row.map((seatId, seatIndex) => {
                        const status = seatId && occupiedSeats.includes(seatId) ? 'occupied' : 'available';
                        return (
                            <Seat 
                                key={`${rowIndex}-${seatIndex}`}
                                id={seatId}
                                status={status}
                                isSelected={seatId ? selectedSeats.includes(seatId) : false}
                                onClick={onSeatClick}
                            />
                        )
                    })}
                </div>
            ))}
        </div>
    </div>
);


export function BusSeatLayout({ vehicle, selectedSeats, onSeatSelect }: BusSeatLayoutProps) {
  if (!vehicle.seatLayout) {
    return <p className="text-muted-foreground">Este veículo não possui um mapa de assentos configurado.</p>;
  }

  const handleSeatClick = (seatId: string) => {
    const isSelected = selectedSeats.includes(seatId);
    if (isSelected) {
      onSeatSelect(selectedSeats.filter(id => id !== seatId));
    } else {
      onSeatSelect([...selectedSeats, seatId]);
    }
  };
  
  const occupied = vehicle.occupiedSeats || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Selecione os Assentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {vehicle.seatLayout.upperDeck && (
            <Deck 
                title="Piso Superior"
                layout={vehicle.seatLayout.upperDeck}
                occupiedSeats={occupied}
                selectedSeats={selectedSeats}
                onSeatClick={handleSeatClick}
            />
        )}
         {vehicle.seatLayout.lowerDeck && (
            <Deck 
                title="Piso Inferior"
                layout={vehicle.seatLayout.lowerDeck}
                occupiedSeats={occupied}
                selectedSeats={selectedSeats}
                onSeatClick={handleSeatClick}
            />
        )}

        <div className="flex flex-wrap gap-4 items-center justify-center pt-4 border-t">
            <div className="flex items-center gap-1"><Armchair className="w-5 h-5 text-gray-400" /> Disponível</div>
            <div className="flex items-center gap-1"><Armchair className="w-5 h-5 text-blue-500" /> Selecionado</div>
            <div className="flex items-center gap-1"><Armchair className="w-5 h-5 text-red-400" /> Ocupado</div>
        </div>
      </CardContent>
    </Card>
  );
}
