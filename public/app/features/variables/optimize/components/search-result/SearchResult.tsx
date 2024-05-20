import React, { useState, MouseEvent, KeyboardEvent } from 'react';

import { SelectableValue } from '@grafana/data';
import {
  Button,
  EmptySearchResult,
  Input,
  HorizontalGroup,
  IconName,
  LoadingPlaceholder,
  VerticalGroup,
  Icon,
  Pagination
} from '@grafana/ui';

import {DEFAULT_PAGINATION} from "../../OptimizeVariablePicker";
import {BreadCrumbs} from "../breadcrumbs/BreadCrumbs";
import { SelectableListGroup } from '../selectable-list-group/SelectableListGroup';

export interface SearchResultProp {
  onSearch: (query: string) => void;
  searchQuery: string;
  onItemClicked: (selected: SelectableValue) => void;
  onItemDrillDown?: (selected: SelectableValue) => void;
  onBreadCrumbsItemClick?: (selected: SelectableValue) => void;
  breadcrumbsItems: SelectableValue [],
  resultItems: SelectableValue[];
  containerClassName?: string;
  width?: string;
  searchInputWidth?: number;
  loading?: boolean;
  config?: {
    searchButton?: string;
    emptyResultMsg?: string;
    searchPlaceholder?: string;
    listItem?: {
      iconName: IconName;
      iconTooltip?: string;
    };
  };
  onClose: () => void;
  onNavigate: (query: string, toPage: number) => void;
  count: number;
  startPage: number;
  onPageChanged: (page: number) => void;
}
export const SearchResult: React.FC<SearchResultProp> = (props: SearchResultProp) => {
  const [queryValue, setQueryValue] = useState(props.searchQuery || '');
  const [currentPage, setCurrentPage] = useState(props.startPage);
    
  const onQueryChange = (value: string) => {
    setQueryValue(value);
  };

  const onSearchClicked = (e: MouseEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    props.onPageChanged(1);
    props.onSearch(queryValue);
  };

  const onSearchKeyPressed = (keyboardEvent: KeyboardEvent<HTMLInputElement>) => {
    if (keyboardEvent.key === 'Enter') {
      keyboardEvent.preventDefault();
      setCurrentPage(1);
      props.onPageChanged(1);
      props.onSearch(queryValue);
    }
  };

   const onItemDrillDown = (selected: SelectableValue): void => {
    if(props.onItemDrillDown){
      setQueryValue('');
      setCurrentPage(1);
      props.onPageChanged(1);
      props.onItemDrillDown(selected);
    }
  }

  const onBreadCrumbsItemClick = (selected: SelectableValue) => {
    if(props.onBreadCrumbsItemClick){
      setQueryValue('');
      setCurrentPage(1);
      props.onPageChanged(1);
      props.onBreadCrumbsItemClick(selected);
    }

  }

  const styles = {
    closeIconContainer: {
      right: '10px',
      position: 'absolute' as 'absolute',
      cursor: 'pointer',
      diplay: 'flex',
      alignItems: 'center'
    },
    pagination: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '10px'
    },
    paginationResults: {
      right: '20px',
      position: 'absolute' as 'absolute'
    },
    resultContainer: {
      maxHeight:'60vh',
      overflow: 'hidden auto',
      width: '100%'
    }
  };


  let resultContainer;
  if (props.loading) {
    resultContainer = <LoadingPlaceholder text="Loading..." />;
  } else {
    resultContainer =
      props.resultItems?.length > 0 ? (
        <SelectableListGroup
          listItem={props.config?.listItem ?? { iconName: 'plus-circle' }}
          items={props.resultItems}
          onItemDrillDown={onItemDrillDown}
          onClick={props.onItemClicked}
        />
      ) : (
        <EmptySearchResult>{props.config?.emptyResultMsg || 'No items'}</EmptySearchResult>
      );
  }
  const onNavigate = (toPage: number) => {
    setCurrentPage(toPage);
    props.onPageChanged(toPage);
    props.onNavigate(queryValue, toPage);
  }

  const getNumberOfPages = (count: number): number => {
    if(count && count > 0){
      return Math.ceil(count/DEFAULT_PAGINATION.size);
    }
    return 0;
  }

  const prefixIcon = <Icon name="search" />;

  function getNumerOfItemsPerPage(currentPage: number, count: number): number {
    const numberOfPages = getNumberOfPages(count);
    if(currentPage === numberOfPages){
      return count;
    }
    return currentPage * DEFAULT_PAGINATION.size;
  }

  function getPaginationNum(count: number): string {
    if(count && count > 0 && count > DEFAULT_PAGINATION.size){
      return (((currentPage - 1) * DEFAULT_PAGINATION.size) + 1) + " - "
        + getNumerOfItemsPerPage(currentPage, count) + " of ";
    }
    return '';
  }

  function onKeyPress(keyboardEvent: KeyboardEvent<HTMLInputElement>) {
    if(keyboardEvent.key === 'Enter'){
      keyboardEvent.preventDefault()
    }
  }

  return (
    <>
      <VerticalGroup className={props.containerClassName} width={props.width}>
        <HorizontalGroup>
          <Input
            prefix={prefixIcon}
            width={props.searchInputWidth}
            placeholder={props.config?.searchPlaceholder || 'Type to search'}
            value={queryValue}
            onChange={(elm) => onQueryChange(elm.currentTarget.value)}
            onKeyPress={(ev)=>  onKeyPress(ev) }
            onKeyUp={onSearchKeyPressed}
          ></Input>
          <Button variant={'secondary'} onClick={onSearchClicked} >
            {props.config?.searchButton || 'Search'}
          </Button>
          <div 
            onClick={() => props.onClose()}
            style={styles.closeIconContainer} >
          <Icon
            name={'times'}
            size={'xl'}
            title={'Close'}
          />
          </div>
        </HorizontalGroup>
        <BreadCrumbs items={props.breadcrumbsItems} onClick={onBreadCrumbsItemClick}></BreadCrumbs>
        <div style={styles.resultContainer}>
          {resultContainer}
        </div>
        <div style={styles.pagination}>
          <Pagination className={"search-results-pagination"} currentPage={currentPage}
                      numberOfPages={getNumberOfPages(props.count)}
                      onNavigate={(toPage: number) => onNavigate(toPage)}></Pagination>
          <span style={styles.paginationResults}>{getPaginationNum(props.count)} {props.count} results </span>
        </div>
      </VerticalGroup>
    </>
  );
};
