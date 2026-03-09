'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';

interface Dog {
  id: string;
  name: string;
  breed: string;
  ownerName: string;
  size: 'small' | 'medium' | 'large';
  verified: boolean;
  createdAt: string;
}

const columns: ColumnDef<Dog>[] = [
  {
    accessorKey: 'name',
    header: 'Nome',
  },
  {
    accessorKey: 'breed',
    header: 'Razza',
  },
  {
    accessorKey: 'ownerName',
    header: 'Proprietario',
  },
  {
    accessorKey: 'size',
    header: 'Taglia',
    cell: ({ row }) => {
      const size = row.getValue('size') as string;
      const label = { small: 'Piccolo', medium: 'Medio', large: 'Grande' }[size] ?? size;
      return <Badge variant="outline">{label}</Badge>;
    },
  },
  {
    accessorKey: 'verified',
    header: 'Verificato',
    cell: ({ row }) =>
      row.getValue('verified') ? (
        <Badge variant="success">Si</Badge>
      ) : (
        <Badge variant="outline">No</Badge>
      ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Aggiunto il',
    cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString('it-IT'),
  },
];

const mockDogs: Dog[] = [
  {
    id: '1',
    name: 'Rex',
    breed: 'Pastore Tedesco',
    ownerName: 'Mario Rossi',
    size: 'large',
    verified: true,
    createdAt: '2024-01-20',
  },
  {
    id: '2',
    name: 'Luna',
    breed: 'Golden Retriever',
    ownerName: 'Laura Bianchi',
    size: 'large',
    verified: true,
    createdAt: '2024-02-15',
  },
  {
    id: '3',
    name: 'Milo',
    breed: 'Chihuahua',
    ownerName: 'Giuseppe Verdi',
    size: 'small',
    verified: false,
    createdAt: '2024-03-05',
  },
];

export default function DogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Cani</h1>
        <p className="text-neutral-500">Tutti i cani registrati sulla piattaforma</p>
      </div>

      <DataTable columns={columns} data={mockDogs} total={mockDogs.length} totalPages={1} />
    </div>
  );
}
