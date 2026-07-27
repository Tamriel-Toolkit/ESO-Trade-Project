import { useState } from "react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select"

import Navbar from '../components/ui/navbar'

function Marketplace() {

  const [selectedCategory1, setSelectedCategory1] = useState("");
  const [selectedCategory2, setSelectedCategory2] = useState("");

  return (
    <div className="body">
      <Navbar />
      <h1>Marketplace</h1>
      <NativeSelect onValueChange={setSelectedCategory1}>
        <NativeSelectOptGroup label="Category 1">
          <NativeSelectOption value="option1">Option 1</NativeSelectOption>
          <NativeSelectOption value="option2">Option 2</NativeSelectOption>
        </NativeSelectOptGroup>
        <NativeSelectOptGroup label="Category 2">
          <NativeSelectOption value="option3">Option 3</NativeSelectOption>
          <NativeSelectOption value="option4">Option 4</NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect>
      <NativeSelect onValueChange={setSelectedCategory2}>
        <NativeSelectOptGroup label="Category 1">
          <NativeSelectOption value="option1">Option 1</NativeSelectOption>
          <NativeSelectOption value="option2">Option 2</NativeSelectOption>
        </NativeSelectOptGroup>
        <NativeSelectOptGroup label="Category 2">
          <NativeSelectOption value="option3">Option 3</NativeSelectOption>
          <NativeSelectOption value="option4">Option 4</NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect>
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