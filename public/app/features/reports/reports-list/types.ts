import { Dispatch } from 'react';
import { Action } from 'redux';
import { SelectableValue } from '@grafana/data';

export enum ReportSearchItemType {
  ReportItem = 'report-item',
  ReportFolder = 'report-folder',
}

export enum SearchLayout {
  List = 'list',
  Folders = 'folders',
}

export interface ReportSection {
  id: number;
  title: string;
  expanded?: boolean;
  url: string;
  icon?: string;
  checked?: boolean;
  items: ReportSectionItem[];
  toggle?: (section: ReportSection) => Promise<ReportSection>;
  selected?: boolean;
  itemsFetching?: boolean;
  type: ReportSearchItemType;
}

export interface ReportSectionItem {
  checked?: boolean;
  folderId?: number;
  folderTitle?: string;
  id: number;
  selected?: boolean;
  title: string;
  url: string;
  description: string;
  cronExp: string;
  type: ReportSearchItemType;
  enabled: boolean;
  info: ReportItemExtraInfo;
}

export interface ReportItemExtraInfo {
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastAt: string;
  nextAt: string;
  status: number;
}

export interface SearchAction extends Action {
  payload?: any;
}

export interface ReportQuery {
  query: string;
  sort: SelectableValue | null;
  layout: SearchLayout;
}

export type SearchReducer<S> = [S, Dispatch<SearchAction>];
interface UseSearchParams {
  queryParsing?: boolean;
  dashboard?: any;
}

export type UseSearch = <S>(
  query: ReportQuery,
  reducer: SearchReducer<S>,
  params: UseSearchParams
) => { state: S; dispatch: Dispatch<SearchAction>; onToggleSection: (section: ReportSection) => void };

export type OnToggleChecked = (item: ReportSectionItem | ReportSection) => void;
export type OnEnableItems = () => void;
export type OnDisableItems = () => void;
export type OnDeleteItems = () => void;
export type OnCloneItem = () => void;
export type OnExecuteReportsOnce = () => void;

export interface RouteParams {
  query?: string | null;
  sort?: string | null;
  layout?: SearchLayout | null;
  folderId?: string | null;
}
