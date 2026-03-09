'use client';

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  // Server-side state
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
  // Pagination info
  totalPages?: number;
  total?: number;
  isLoading?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  sorting,
  onSortingChange,
  pagination,
  onPaginationChange,
  columnFilters,
  onColumnFiltersChange,
  totalPages = 1,
  total = 0,
  isLoading = false,
}: DataTableProps<TData, TValue>) {
  const defaultPagination: PaginationState = { pageIndex: 0, pageSize: 20 };
  const currentPagination = pagination ?? defaultPagination;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // Server-side handling
    manualSorting: true,
    manualPagination: true,
    manualFiltering: true,
    state: {
      sorting,
      pagination: currentPagination,
      columnFilters,
    },
    onSortingChange: onSortingChange
      ? (updater) => {
          const newSorting = typeof updater === 'function' ? updater(sorting ?? []) : updater;
          onSortingChange(newSorting);
        }
      : undefined,
    onPaginationChange: onPaginationChange
      ? (updater) => {
          const newPagination =
            typeof updater === 'function'
              ? updater(pagination ?? { pageIndex: 0, pageSize: 20 })
              : updater;
          onPaginationChange(newPagination);
        }
      : undefined,
    onColumnFiltersChange: onColumnFiltersChange
      ? (updater) => {
          const newFilters = typeof updater === 'function' ? updater(columnFilters ?? []) : updater;
          onColumnFiltersChange(newFilters);
        }
      : undefined,
    pageCount: totalPages,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-neutral-200">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                    <span className="ml-2 text-neutral-500">Caricamento...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-neutral-500">
                  Nessun risultato trovato.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {total > 0 ? `${total} risultati totali` : 'Nessun risultato'}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Precedente
          </Button>
          <span className="text-sm text-neutral-600">
            Pagina {(pagination?.pageIndex ?? 0) + 1} di {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Successiva
          </Button>
        </div>
      </div>
    </div>
  );
}
