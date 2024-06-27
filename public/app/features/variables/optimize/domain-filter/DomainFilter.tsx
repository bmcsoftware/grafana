import React, { useReducer, useState, useEffect, useRef } from 'react';

import { SelectableValue } from '@grafana/data';
import { Button, Icon, IconName, useTheme2 } from '@grafana/ui';

import { SearchResult } from '../components/search-result/SearchResult';
import { TagList } from '../components/tag-list/TagList';

const searchConfig = {
  searchPlaceholder: 'Search',
  listItem: {
    iconName: 'plus-circle' as IconName,
    iconTooltip: 'Add item',
  },
};

export interface DomainFilterProps {
  resultItems: SelectableValue[];
  onSearch: (query: string) => void;
  onDomainDrillDown: (item: SelectableValue) => void;
  onDomainSelected: (selected: SelectableValue[]) => void;
  onBreadCrumbsItemClick: (item: SelectableValue) => void;
  breadcrumbsItems: SelectableValue [];
  loading?: boolean
  selected: SelectableValue[];
  onCancel: () => void;
  onNavigate: (query: string, toPage: number) => void;
  count: number;
}
export const DomainFilter: React.FC<DomainFilterProps> = (props) => {
  const [showSearch, toggleSearch] = useReducer((showSearch) => !showSearch, false);
  const [searchQuery, setSearchQuery] = useState('');
  const [startPage, setStartPage] = useState(1);
  const searchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.addEventListener("mousedown", onOutsideClick);
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
   };
  });

  const theme = useTheme2();

  const onDomainClicked = (item: SelectableValue) => {
    if(item.selected){
      const selected = props.selected.filter((domain) => domain.value !== item.value);
      onItemRemoved(selected);
    } else {
      onDomainSelected(item);
    }
  }
  const onDomainSelected= (selectedItem: SelectableValue) => {
    
    if (props.selected.find((domain) => domain.value === selectedItem.value)) {
      return;
    }
    const domains = props.selected.concat([selectedItem])
    props.onDomainSelected(domains);
  };

  const getDomainTitle = (item: SelectableValue) => item.label as string;

  const onItemRemoved = (items: SelectableValue[]) => {
    props.onDomainSelected(items);
  };
   
  const styles = {
    button: {
      color:  `${theme.colors.text.primary}`,
      background: `${theme.colors.background.primary}`,
      width: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `1px solid ${theme.colors.border.medium}`
    }
  }
  const onCancel = () => {
    props.onCancel();
    if(showSearch){
      toggleSearch();
    }
  }


  const onNavigate = (query: string, toPage: number) => {
    props.onNavigate(query, toPage);
  }

 const onSearch = (searchQuery: string) => {
   setSearchQuery(searchQuery)
   props.onSearch(searchQuery)
  }

  const onOutsideClick = (e: MouseEvent) => {
    const {target} = e;
    if (showSearch && !searchRef.current?.contains(target as HTMLBaseElement)) {
        toggleSearch();
    }
  };

  return (
    <>
      <div className="gf-form-inline gf-form-inline--xs-view-flex-column flex-grow-1">
        <div style={{ alignItems: 'center', height:'100%' }}
        >
          {props.selected.length > 0 ? (
            <TagList
              tags={props.selected}
              getTooltip={getDomainTitle}
              onRemove={onItemRemoved}
              getTitle={getDomainTitle}
            />
          ) : (
            <TagList
              tags={[{ id: "all", label: "All Domains"}]}
              getTooltip={getDomainTitle}
              getTitle={getDomainTitle}
            />
          )}

        </div>
        <Button style={styles.button} variant={'secondary'} size={'md'} className="gf-form-label pointer" onClick={toggleSearch}>
          <Icon size={"xl"} name={!showSearch ? 'angle-right' : 'angle-down'} />
        </Button>
        { props.selected.length > 0 &&
          (<Button style={styles.button} variant={'secondary'} size={'md'}  onClick={onCancel}>
          <Icon name="trash-alt" />
        </Button>)}
      </div>
      {showSearch && (
        <div ref={searchRef}
          style={{
            backgroundColor: theme.colors.background.primary,
            padding: '8px',
            position: 'absolute',
            zIndex: 1,
            left: '60px',
            top: '40px',
            border: `1px solid ${theme.colors.border.medium}`,
            minWidth: '606px',
            maxWidth: '50vw'
          }}
        >
            <SearchResult
              searchQuery={searchQuery}
              startPage={startPage}
              onPageChanged={setStartPage}
              resultItems={props.resultItems}
              loading={props.loading}
              searchInputWidth={40}
              onSearch={(searchQuery: string) => onSearch(searchQuery)}
              config={searchConfig}
              onItemClicked={onDomainClicked}
              onItemDrillDown={props.onDomainDrillDown}
              breadcrumbsItems={props.breadcrumbsItems}
              onBreadCrumbsItemClick={props.onBreadCrumbsItemClick}
              onClose={toggleSearch}
              onNavigate={(query: string, toPage: number) => onNavigate(query, toPage)}
              count={props?.count}/>
        </div>
      )}

    </>
  );
};
