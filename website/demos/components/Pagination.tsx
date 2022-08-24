import React from "react";

export interface PaginationProps {
  totalItems: number, 
  itemsPerPage: number,
  setCurrentPage: (page:number) => void
}

const Pagination = ({totalItems, itemsPerPage, setCurrentPage}: PaginationProps) => {
  const pages: number[] = []
  for (let i = 1; i <= Math.ceil(totalItems / itemsPerPage); i++) {
    pages.push(i)
  }
  return (
    <div>
      { 
        pages.map((page, index) => {
          return <button key={index} onClick={() => setCurrentPage(page)}>{page}</button> 
        })
      }
    </div>
  )
}

export default Pagination
