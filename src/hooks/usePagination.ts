import { useState, useMemo } from 'react';

export function usePagination<T>({
  items,
  itemsPerPage = 20,
}: {
  items: T[];
  itemsPerPage?: number;
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const pagination = useMemo(() => {
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = items.slice(startIndex, startIndex + itemsPerPage);

    return {
      currentItems,
      currentPage,
      totalPages,
      totalItems: items.length,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  }, [items, currentPage, itemsPerPage]);

  return {
    ...pagination,
    goToPage: setCurrentPage,
    nextPage: () => setCurrentPage(p => p + 1),
    previousPage: () => setCurrentPage(p => Math.max(1, p - 1)),
  };
}

