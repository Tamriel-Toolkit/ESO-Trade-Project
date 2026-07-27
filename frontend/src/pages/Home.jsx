import { useEffect, useState } from "react"
import { ArrowUpIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import Navbar from "../components/ui/navbar"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import "../api/api"

async function fetchCategories() {
  const allCategories = await import("../api/api").then(module => module.default);
  return allCategories();
}

function ButtonDemo() {
  return (
    <div className="flex flex-wrap items-center gap-2 md:flex-row">
      <Button variant="outline" onClick={() => console.log("clicked")}>Button</Button>
      <Button variant="outline" size="icon" aria-label="Submit">
        <ArrowUpIcon />
      </Button>
    </div>
  )
}

function CategoryCard({ category }) {
  return (
    <Card style={{ display: "inline-block", width: "100%" }}>
      <CardHeader>
        <CardTitle>{category}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Render items for this category here */}
      </CardContent>
    </Card>
  )
}

function Home() {
  const [categories, setCategories] = useState([]);
  
  useEffect(() => {
    fetchCategories().then((data) => {
      if (data) {
        setCategories(Object.keys(data));
        console.log(Object.keys(data));
        console.log(data);
      }
    });
  }, []);

  return (
    <div className="body">
      <Navbar />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        {categories.map((category) => (
          <CategoryCard key={category} category={category} />
        ))}
      </div>
    </div>
  )

}
export default Home
