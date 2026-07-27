import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

import Navbar from '../components/ui/navbar'

function Marketplace() {
  return (
    <div className="body">
      <Navbar />
      <h1>Marketplace</h1>
      <Pagination style={{ display: "flex", justifyContent: "flex-end", marginTop: "2rem" }}>
        <PaginationPrevious>Previous</PaginationPrevious>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink>1</PaginationLink>
          </PaginationItem>
          <PaginationEllipsis />
          <PaginationItem>
            <PaginationLink>10</PaginationLink>
          </PaginationItem>
        </PaginationContent>
        <PaginationNext>Next</PaginationNext>
      </Pagination>
    </div>
  );
}

export default Marketplace;