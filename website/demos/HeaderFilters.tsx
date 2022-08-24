import { createContext, useContext, useMemo, useState } from 'react';
import { css } from '@linaria/core';
import { faker } from '@faker-js/faker';

import DataGrid, { useFocusRef } from '../../src';
import type { Column, HeaderRendererProps } from '../../src';
import type { Omit } from '../../src/types';
import type { Props } from './types';

import Pagination from './components/Pagination';

const rootClassname = css`
  display: flex;
  flex-direction: column;
  block-size: 100%;
  gap: 10px;

  > .rdg {
    flex: 1;
  }
`;

const toolbarClassname = css`
  display: flex;
  flex-direction: row-reverse;
  text-align: end;
`;

const filterColumnClassName = 'filter-cell';

const filterContainerClassname = css`
  .${filterColumnClassName} {
    line-height: 35px;
    padding: 0;

    > div {
      padding-block: 0;
      padding-inline: 8px;

      &:first-child {
        border-block-end: 1px solid var(--rdg-border-color);
      }
    }
  }
`;

const filterClassname = css`
  inline-size: 100%;
  padding: 4px;
  font-size: 14px;
`;

interface GlobalRows {
  search: string;
}

interface GlobalRowsFilter extends GlobalRows {
  enabled: boolean;
}

interface Row {
  id: number;
  task: string;
  priority: string;
  issueType: string;
  developer: string;
  complete: number;
}

interface Filter extends Omit<Row, 'id' | 'complete'> {
  complete: number | undefined;
  enabled: boolean;
}

// Context is needed to read filter values otherwise columns are
// re-created when filters are changed and filter loses focus
const FilterContext = createContext<Filter | undefined>(undefined);

function inputStopPropagation(event: React.KeyboardEvent<HTMLInputElement>) {
  if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.stopPropagation();
  }
}

function selectStopPropagation(event: React.KeyboardEvent<HTMLSelectElement>) {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.stopPropagation();
  }
}

export default function HeaderFilters({ direction }: Props) { 
  const [rows] = useState(createRows);
  const [globalFilters, setGlobalFilters] = useState<GlobalRowsFilter>({
    search: '',
    enabled: true
  }); 
  const [filters, setFilters] = useState<Filter>({
    task: '',
    priority: 'All',
    issueType: 'All',
    developer: '',
    complete: undefined,
    enabled: true
  });
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const lastItemIndex = currentPage * itemsPerPage
  const firstItemIndex = lastItemIndex - itemsPerPage
  const currentItems = rows.slice(firstItemIndex, lastItemIndex)

  const developerOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.developer))).map((d) => ({
        label: d,
        value: d
      })),
    [rows]
  );

  const columns = useMemo((): readonly Column<Row>[] => {
    return [
      {
        key: 'id',
        name: 'ID',
        width: 50
      },
      {
        key: 'task',
        name: 'Title',
        headerCellClass: filterColumnClassName,
        headerRenderer: (p) => (
          <FilterRenderer<Row, unknown, HTMLInputElement> {...p}>
            {({ filters, ...rest }) => (
              <input
                {...rest}
                className={filterClassname}
                value={filters.task}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    task: e.target.value
                  })
                }
                onKeyDown={inputStopPropagation}
              />
            )}
          </FilterRenderer>
        )
      },
      {
        key: 'priority',
        name: 'Priority',
        headerCellClass: filterColumnClassName,
        headerRenderer: (p) => (
          <FilterRenderer<Row, unknown, HTMLSelectElement> {...p}>
            {({ filters, ...rest }) => (
              <select
                {...rest}
                className={filterClassname}
                value={filters.priority}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    priority: e.target.value
                  })
                }
                onKeyDown={selectStopPropagation}
              >
                <option value="All">All</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            )}
          </FilterRenderer>
        )
      },
      {
        key: 'issueType',
        name: 'Issue Type',
        headerCellClass: filterColumnClassName,
        headerRenderer: (p) => (
          <FilterRenderer<Row, unknown, HTMLSelectElement> {...p}>
            {({ filters, ...rest }) => (
              <select
                {...rest}
                className={filterClassname}
                value={filters.issueType}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    issueType: e.target.value
                  })
                }
                onKeyDown={selectStopPropagation}
              >
                <option value="All">All</option>
                <option value="Bug">Bug</option>
                <option value="Improvement">Improvement</option>
                <option value="Epic">Epic</option>
                <option value="Story">Story</option>
              </select>
            )}
          </FilterRenderer>
        )
      },
      {
        key: 'developer',
        name: 'Developer',
        headerCellClass: filterColumnClassName,
        headerRenderer: (p) => (
          <FilterRenderer<Row, unknown, HTMLInputElement> {...p}>
            {({ filters, ...rest }) => (
              <input
                {...rest}
                className={filterClassname}
                value={filters.developer}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    developer: e.target.value
                  })
                }
                onKeyDown={inputStopPropagation}
                list="developers"
              />
            )}
          </FilterRenderer>
        )
      },
      {
        key: 'complete',
        name: '% Complete',
        headerCellClass: filterColumnClassName,
        headerRenderer: (p) => (
          <FilterRenderer<Row, unknown, HTMLInputElement> {...p}>
            {({ filters, ...rest }) => (
              <input
                {...rest}
                type="number"
                className={filterClassname}
                value={filters.complete}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    complete: Number.isFinite(e.target.valueAsNumber)
                      ? e.target.valueAsNumber
                      : undefined
                  })
                }
                onKeyDown={inputStopPropagation}
              />
            )}
          </FilterRenderer>
        )
      }
    ];
  }, []);

  const filteredRows = useMemo(() => {
    return currentItems.filter((r) => {
        return (
        (globalFilters.search ? [r.task, r.priority, r.issueType, r.developer, r.complete.toString].some(item => item.toString().includes(globalFilters.search)) : true) &&
        (filters.task ? r.task.includes(filters.task) : true) &&
        (filters.priority !== 'All' ? r.priority === filters.priority : true) &&
        (filters.issueType !== 'All' ? r.issueType === filters.issueType : true) &&
        (filters.developer
          ? r.developer.toLowerCase().startsWith(filters.developer.toLowerCase())
          : true) &&
        (filters.complete !== undefined ? r.complete >= filters.complete : true)
      );
    });
  }, [currentItems, globalFilters, filters]);

  function clearFilters() {
    setGlobalFilters({
      search: '',
      enabled: true
    });
    setFilters({
      task: '',
      priority: 'All',
      issueType: 'All',
      developer: '',
      complete: undefined,
      enabled: true
    });
  }

  function toggleFilters() {
    setGlobalFilters((globalFilters) => ({
      ...globalFilters,
      enabled: !globalFilters.enabled
    }));
    setFilters((filters) => ({
      ...filters,
      enabled: !filters.enabled
    }));
  }

  return (
    <div className={rootClassname}>
      <div className={toolbarClassname}>
        <button type="button" onClick={toggleFilters}>
          Toggle Filters
        </button>{' '}
        <button type="button" onClick={clearFilters}>
          Clear Filters
        </button>
        {
        globalFilters.enabled &&
        <input
          placeholder="Global search"
          className={filterClassname}
          value={globalFilters.search}
          onChange={(e) =>
            setGlobalFilters({
              ...globalFilters,
              search: e.target.value
            })
          } 
          onKeyDown={inputStopPropagation}
        />
        }
      </div>
      <FilterContext.Provider value={filters}>
        <DataGrid
          className={filters.enabled ? filterContainerClassname : undefined}
          columns={columns}
          rows={filteredRows}
          headerRowHeight={filters.enabled ? 70 : undefined}
          direction={direction}
        />
        <div style={{display: 'flex'}}>
          <Pagination totalItems={rows.length} itemsPerPage={itemsPerPage} setCurrentPage={setCurrentPage}/>
          <select
            style={{marginLeft: '10px'}}
            value={itemsPerPage}
            onChange={(e) =>
              setItemsPerPage(parseInt(e.target.value, 10))
            }
            onKeyDown={selectStopPropagation}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
          </select>
        </div>
        </FilterContext.Provider>
      <datalist id="developers">
        {developerOptions.map(({ label, value }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </datalist>
    </div>
  );
}

function FilterRenderer<R, SR, T extends HTMLOrSVGElement>({
  isCellSelected,
  column,
  children
}: HeaderRendererProps<R, SR> & {
  children: (args: {
    ref: React.RefObject<T>;
    tabIndex: number;
    filters: Filter;
  }) => React.ReactElement;
}) {
  const filters = useContext(FilterContext)!;
  const { ref, tabIndex } = useFocusRef<T>(isCellSelected);

  return (
    <>
      <div>{column.name}</div>
      {filters.enabled && <div>{children({ ref, tabIndex, filters })}</div>}
    </>
  );
}

function createRows() {
  const rows: Row[] = [];
  for (let i = 1; i < 500; i++) {
    rows.push({
      id: i,
      task: `Task ${i}`,
      complete: Math.min(100, Math.round(Math.random() * 110)),
      priority: ['Critical', 'High', 'Medium', 'Low'][Math.floor(Math.random() * 4)],
      issueType: ['Bug', 'Improvement', 'Epic', 'Story'][Math.floor(Math.random() * 4)],
      developer: faker.name.fullName()
    });
  }
  return rows;
}
