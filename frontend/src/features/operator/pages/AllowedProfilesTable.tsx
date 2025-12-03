import { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export type AllowedProfileRow = {
  id: string;
  serviceTypeId: number;
  serviceType: string;
  rideTypeId: number;
  rideType: string;
  vehicleTypeId: number;
  vehicleType: string;
  profileName?: string;
  minPrice: number;
  notes?: string;
};

function formatLabel(value: string): string {
  if (!value) return "";
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function AllowedProfilesTable({
  data,
  onEdit,
  pageSize = 10,
}: {
  data: AllowedProfileRow[];
  onEdit?: (row: AllowedProfileRow) => void;
  pageSize?: number;
}) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  // Ensure current page is valid if data length changes
  useEffect(() => {
    const maxPage = Math.max(0, totalPages - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [data.length, pageSize, totalPages, page]);

  const paginatedData = useMemo(() => {
    const start = page * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  const startIndex = data.length === 0 ? 0 : page * pageSize + 1;
  const endIndex = Math.min((page + 1) * pageSize, data.length);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white/80 shadow-sm">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b border-gray-200 bg-white">
            <TableHead className="w-1/3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
              Service Type
            </TableHead>
            <TableHead className="w-1/3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
              Ride Type
            </TableHead>
            <TableHead className="w-1/3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
              Vehicle Type
            </TableHead>
            {onEdit && (
              <TableHead className="w-[80px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={onEdit ? 4 : 3}
                className="px-4 py-6 text-center text-gray-600"
              >
                No allowed profiles found.
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((row) => (
              <TableRow
                key={row.id}
                className="border-b border-gray-200/70 bg-white/40 transition-colors hover:bg-gray-100/80"
              >
                <TableCell className="whitespace-nowrap px-4 py-3 text-gray-900">
                  {formatLabel(row.serviceType)}
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-3 text-gray-900">
                  {formatLabel(row.rideType)}
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-3 text-gray-900">
                  {row.vehicleType}
                </TableCell>
                {onEdit && (
                  <TableCell className="px-4 py-3 text-right">
                    <button
                      className="text-xs font-medium text-gray-400 hover:text-gray-900 hover:underline"
                      onClick={() => onEdit(row)}
                    >
                      Edit
                    </button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination footer */}
      {data.length > pageSize && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white/80 px-4 py-2 text-xs text-gray-600">
          <div>
            Showing {startIndex}-{endIndex} of {data.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => canPrev && setPage((p) => p - 1)}
              disabled={!canPrev}
            >
              Previous
            </Button>
            <span className="text-gray-700">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => canNext && setPage((p) => p + 1)}
              disabled={!canNext}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
