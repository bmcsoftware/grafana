import { SelectableValue, UrlQueryMap, UrlQueryValue } from '@grafana/data';
import { IconName } from '@grafana/ui';
import moment from 'moment-timezone';
import { DEFAULT_SORT, SECTION_STORAGE_KEY } from './constants';
import { ReportQuery, ReportSection, ReportSectionItem, SearchAction } from './types';

/**
 * Returns value as date if value is timestamp, otherwise return the value.
 */
export const convertTimeStampToDate = (value: any, format: string, timezone: string) => {
  if (value === 0 || !moment(value).isValid()) {
    return undefined;
  }
  const dateTime = timezone === 'browser' ? moment.unix(value) : moment.unix(value).tz(timezone);
  const formattedDateTime = dateTime.format(format);
  return formattedDateTime;
};

/**
 * Find items with property 'selected' set true in a list of folders and their items.
 * Does recursive search in the items list.
 * @param sections
 */
export const findSelected = (sections: any): ReportSection | ReportSectionItem | null => {
  let found = null;
  for (const section of sections) {
    if (section.expanded && section.items.length) {
      found = findSelected(section.items);
    }
    if (section.selected) {
      found = section;
    }
    if (found) {
      return found;
    }
  }

  return null;
};

/**
 * Merge multiple reducers into one, keeping the state structure flat (no nested
 * separate state for each reducer). If there are multiple state slices with the same
 * key, the latest reducer's state is applied.
 * Compared to Redux's combineReducers this allows multiple reducers to operate
 * on the same state or different slices of the same state. Useful when multiple
 * components have the same structure but different or extra logic when modifying it.
 * If reducers have the same action types, the action types from the rightmost reducer
 * take precedence
 * @param reducers
 */
export const mergeReducers = (reducers: any[]) => (prevState: any, action: SearchAction) => {
  return reducers.reduce((nextState, reducer) => ({ ...nextState, ...reducer(nextState, action) }), prevState);
};

/**
 * Collect ids of all checked reports. Used for delete, enable, disable operation
 * @param sections
 */
export const getCheckedIds = (sections: ReportSection[]): number[] => {
  const emptyResults: number[] = [];

  if (!sections.length) {
    return emptyResults;
  }

  return sections.reduce((ids: number[], section: ReportSection) => {
    const checkedItems = section.items.filter((item: ReportSectionItem) => item.checked);
    if (checkedItems) {
      return [...ids, ...checkedItems.map((item: ReportSectionItem) => item.id)];
    }
    return [...ids];
  }, []);
};

export const getCheckedItems = (selection: ReportSection[]): ReportSectionItem[] => {
  return selection.reduce((acc: ReportSectionItem[], result: ReportSection) => {
    const filteredItems: ReportSectionItem[] = result.items.filter((item: ReportSectionItem) => item.checked);
    if (filteredItems) {
      acc = [...acc, ...filteredItems];
    }
    return acc;
  }, []);
};

/**
 * Check if search query has filters enabled. Excludes folderId
 * @param query
 */
export const hasFilters = (query: ReportQuery) => {
  if (!query) {
    return false;
  }
  return Boolean(query.query || query.sort);
};

/**
 * Get section icon depending on expanded state. Currently works for folder icons only
 * @param section
 */
export const getSectionIcon = (section: ReportSection): IconName => {
  return section.expanded ? 'folder-open' : 'folder';
};

/**
 * Get storage key for a reports folder by its title
 * @param title
 */
export const getSectionStorageKey = (title: string) => {
  if (!title) {
    return '';
  }
  return `${SECTION_STORAGE_KEY}.${title.toLowerCase()}`;
};

/**
 * Remove undefined keys from url params object and format non-primitive values
 * @param params
 * @param folder
 */
export const parseRouteParams = (params: UrlQueryMap, folder?: UrlQueryValue) => {
  const cleanedParams = Object.entries(params).reduce((obj, [key, val]) => {
    if (!val) {
      return obj;
    } else if (key === 'sort') {
      return { ...obj, sort: { value: val } };
    }
    return { ...obj, [key]: val };
  }, {} as Partial<ReportQuery>);

  if (folder) {
    const folderStr = `folder:${folder}`;
    return {
      params: { ...cleanedParams, query: `${folderStr} ${(cleanedParams.query ?? '').replace(folderStr, '')}` },
    };
  }
  return { params: cleanedParams };
};

/**
 * Sort sections (dashboards) results object by given sort order
 * @param results
 * @param sortOrder
 */
export const sortSectionResults = (results: ReportSection[], sortOrder: SelectableValue): ReportSection[] => {
  switch (sortOrder ? sortOrder.value : DEFAULT_SORT.value) {
    case 'alpha-asc': {
      const sortedSections = results.sort((a: ReportSection, b: ReportSection) =>
        a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1
      );
      sortedSections.map((res) => sortReportsResults(res.items, sortOrder));
      return sortedSections;
    }
    case 'alpha-desc': {
      const sortedSections = results.sort((a: ReportSection, b: ReportSection) =>
        b.title.toLowerCase() > a.title.toLowerCase() ? 1 : -1
      );
      sortedSections.map((res) => sortReportsResults(res.items, sortOrder));
      return sortedSections;
    }
    default: {
      return results;
    }
  }
};

/**
 * Sort sections items (reports) results object by given sort order
 * @param results
 * @param sortOrder
 */
export const sortReportsResults = (results: ReportSectionItem[], sortOrder: SelectableValue): ReportSectionItem[] => {
  switch (sortOrder ? sortOrder.value : DEFAULT_SORT.value) {
    case 'alpha-asc': {
      const sortedReports = results.sort((a: ReportSectionItem, b: ReportSectionItem) =>
        a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1
      );
      return sortedReports;
    }
    case 'alpha-desc': {
      const sortedReports = results.sort((a: ReportSectionItem, b: ReportSectionItem) =>
        b.title.toLowerCase() > a.title.toLowerCase() ? 1 : -1
      );
      return sortedReports;
    }
    default: {
      return results;
    }
  }
};
