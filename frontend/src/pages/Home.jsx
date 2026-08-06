import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Store, Shield, Sparkles, TrendingUp, ChevronRight, Layers, Award, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "../components/ui/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

async function fetchCategories() {
  const allCategories = await import("../api/api").then(module => module.default);
  return allCategories();
}

function CategoryCard({ category }) {
  return (
    <Card className="eso-card rounded-none transition-all duration-200 hover:border-[#c5a059]/80 group">
      <CardHeader className="p-4 pb-2 border-b border-[#2a2c33] bg-[#161620]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-none bg-[#0a0a0d] border border-[#c5a059]/40 text-[#c5a059]">
              <Layers className="size-4" />
            </div>
            <CardTitle className="font-cinzel text-base text-[#e0d8c3] group-hover:text-[#d4af37] transition-colors">
              {category}
            </CardTitle>
          </div>
          <ChevronRight className="size-4 text-[#8a8275] group-hover:text-[#c5a059] group-hover:translate-x-0.5 transition-all" />
        </div>
      </CardHeader>
      <CardContent className="p-4 text-xs text-[#a89f91] flex items-center justify-between">
        <span>Authentic TTC Market Metrics</span>
        <Link
          to={`/marketplace`}
          className="font-cinzel text-[11px] font-bold text-[#c5a059] hover:underline uppercase tracking-wider flex items-center gap-1"
        >
          Explore <ChevronRight className="size-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

function Home() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories().then((data) => {
      if (data) {
        setCategories(Object.keys(data));
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="body bg-[#0a0a0d] text-[#e0d8c3]">
      <Navbar />

      {/* Hero Banner Header */}
      <section className="relative p-6 md:p-10 mb-8 bg-[#121218] border border-[#c5a059]/30 text-center shadow-2xl overflow-hidden">
        {/* Subtle Background Accent Lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#c5a059_1px,transparent_1px)] [background-size:24px_24px] opacity-5 pointer-events-none"></div>
        <div className="relative z-10 max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none bg-[#c5a059]/10 border border-[#c5a059]/40 text-[#d4af37] text-xs font-cinzel tracking-widest uppercase">
            <Sparkles className="size-3.5 text-[#c5a059]" />
            Official Tamriel Trade Guild Intelligence
          </div>

          <h1 className="font-cinzel text-3xl md:text-5xl font-extrabold text-[#e0d8c3] tracking-wide uppercase leading-tight">
            Elder Scrolls Online <span className="text-[#c5a059]">Marketplace</span>
          </h1>

          <div className="eso-divider max-w-md mx-auto"></div>

          <p className="text-sm md:text-base text-[#a89f91] max-w-2xl mx-auto leading-relaxed">
            Real-time market analytics, active guild trader kiosk scans, and 155,476 authentic price index records direct from Tamriel's trading guilds.
          </p>

          {/* Quick Action Navigation */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link to="/marketplace">
              <Button size="lg" className="rounded-none font-cinzel font-bold bg-[#c5a059] text-[#0a0a0d] hover:bg-[#d4af37] tracking-wider uppercase gap-2 shadow-lg">
                <Store className="size-4" />
                Browse Kiosk Marketplace
              </Button>
            </Link>

            <Link to="/characters">
              <Button size="lg" variant="outline" className="rounded-none font-cinzel font-semibold border-[#c5a059]/40 bg-[#161620] text-[#e0d8c3] hover:border-[#c5a059] hover:bg-[#1f1f2e] tracking-wider uppercase gap-2">
                <Award className="size-4 text-[#c5a059]" />
                Roster & Crafters
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Statistics Highlights */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="eso-card p-5 text-center space-y-1 border-b-2 border-b-[#c5a059]">
          <TrendingUp className="size-6 text-[#c5a059] mx-auto mb-2" />
          <h3 className="font-cinzel text-lg font-bold text-[#e0d8c3]">155,476 Items</h3>
          <p className="text-xs text-[#a89f91]">Catalog market price stats imported directly from official TTC PriceTableNA archives.</p>
        </div>

        <div className="eso-card p-5 text-center space-y-1 border-b-2 border-b-[#c5a059]">
          <Zap className="size-6 text-[#c5a059] mx-auto mb-2" />
          <h3 className="font-cinzel text-lg font-bold text-[#e0d8c3]">Live Kiosk Scans</h3>
          <p className="text-xs text-[#a89f91]">Native in-game ESOTrade addon sync & automated Desktop watcher pipeline.</p>
        </div>

        <div className="eso-card p-5 text-center space-y-1 border-b-2 border-b-[#c5a059]">
          <Shield className="size-6 text-[#c5a059] mx-auto mb-2" />
          <h3 className="font-cinzel text-lg font-bold text-[#e0d8c3]">100% Authentic Data</h3>
          <p className="text-xs text-[#a89f91]">No synthetic or hallucinated listings. ZOS TOS compliant trading house hooks.</p>
        </div>
      </section>

      {/* Categories Grid Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#2a2c33]">
        <h2 className="font-cinzel text-xl font-bold text-[#e0d8c3] tracking-wider uppercase flex items-center gap-2">
          <Store className="size-5 text-[#c5a059]" />
          Marketplace Categories
        </h2>
        <span className="text-xs text-[#8a8275] font-mono">{categories.length} Categories Registered</span>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="eso-card p-12 text-center text-[#8a8275] font-cinzel text-sm">
          Loading Tamriel Market Taxonomy...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {categories.map((category) => (
            <CategoryCard key={category} category={category} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;
