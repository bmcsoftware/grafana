import { UrlQueryMap } from '@grafana/data';

interface FilterState {
  query?: string;
  types?: string[];
  state?: string;
  view?: string;
  sort?: string;
}
export const getFiltersFromUrlParams = (queryParams: UrlQueryMap): FilterState => {
  const query = queryParams['query'] === undefined ? undefined : String(queryParams['query']);
  const types = queryParams['types'] === undefined ? undefined : String(queryParams['types']).split(',');
  const state = queryParams['state'] === undefined ? undefined : String(queryParams['state']);
  const view = queryParams['view'] === undefined ? undefined : String(queryParams['view']);
  const sort = queryParams['sort'] === undefined ? undefined : String(queryParams['sort']);
  return { query, types, view, sort, state };
};
