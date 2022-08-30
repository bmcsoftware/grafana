import React, { useState } from 'react';
import { useQueryParams } from 'app/core/hooks/useQueryParams';
import { getFiltersFromUrlParams } from '../misc';
import { ReportConsoleAction } from './ReportConsoleAction';

interface Props {
  onSearch?: (query?: string) => void;
  isFolder: boolean;
}

export const ReportConsoleFilter: React.FC<Props> = ({ isFolder, onSearch }) => {
  const [queryParams, setQueryParams] = useQueryParams();
  // This key is used to force a rerender on the inputs when the filters are cleared
  const [filterKey, _] = useState<number>(Math.floor(Math.random() * 100));
  const queryStringKey = `queryString-${filterKey}`;

  const { query, state, types = [], view = 'folder', sort } = getFiltersFromUrlParams(queryParams);

  const handleQueryStringChange = (value?: string) => {
    setQueryParams({ query: value || null });
    onSearch?.(value);
  };

  const handleStatusChange = (item: string) => {
    setQueryParams({ state: item });
  };

  const handleTypesChange = (items: string[]) => {
    setQueryParams({ types: items?.join(',') });
  };

  const handleViewChange = (item: string) => {
    setQueryParams({ view: item });
  };

  const handleSortChange = (item: string) => {
    setQueryParams({ sort: item });
  };

  // const handleClearFiltersClick = () => {
  //   setQueryParams({
  //     query: null,
  //     types: null,
  //     state: null,
  //     view: null,
  //     sort: null,
  //   });
  //   setTimeout(() => setFilterKey(filterKey + 1), 100);
  // };

  return (
    <ReportConsoleAction
      key={queryStringKey}
      isFolder={isFolder}
      onLayoutChange={handleViewChange}
      onQueryChange={handleQueryStringChange}
      onReportTypeChange={handleTypesChange}
      onSortChange={handleSortChange}
      onStateChange={handleStatusChange}
      search={{
        query,
        state,
        types,
        view,
        sort,
      }}
    />
  );
};
