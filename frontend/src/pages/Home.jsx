import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Store, Shield, Layers, Sword, Gem, FlaskConical, ScrollText, Armchair, Package, ChevronRight, ArrowRight } from "lucide-react";
import Navbar from "../components/ui/navbar";
import { getEsoIconUrl } from "@/lib/utils";
import '../styles/home.css';

async function fetchCategories() {
  const allCategories = await import("../api/api").then(module => module.default);
  return allCategories();
}

const categoryIcons = { Weapons: Sword, Apparel: Shield, Jewelry: Gem, Consumables: FlaskConical, Materials: Layers, Glyphs: ScrollText, Furnishings: Armchair, Miscellaneous: Package };

function CategoryCard({ category }) {
  const Icon = categoryIcons[category] || Layers;
  return <Link to={`/marketplace?category=${encodeURIComponent(category)}`} className="exchange-category">
    <Icon size={24} aria-hidden="true" /><span>{category}</span><ChevronRight size={16} aria-hidden="true" />
  </Link>;
}

function DisplayItem({ icon, className, children }) {
  return <div className={`exchange-display-item ${className}`}><img src={getEsoIconUrl(icon)} alt="" onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} /><span>{children}</span></div>;
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

  return <div className="exchange-page">
    <Navbar />
    {/* Main Content Body Container */}
    <main className="exchange-container exchange-home">
      {/* Grand Hero Marquee Card: approved C composition with restrained framing. */}
      <section className="exchange-home-opening">
        <div className="exchange-intro">
          <p className="exchange-eyebrow"><Store size={18} aria-hidden="true" />The Elder Scrolls Online</p>
          <h1>The guild<br /><span>marketplace.</span></h1>
          <p className="exchange-intro-description">Equipment, materials, and rare finds.<br />Discover what Tamriel's traders have to offer.</p>
          {/* Quick Action Navigation */}
          <div className="exchange-intro-actions">
            <Link to="/marketplace" className="exchange-primary"><Store size={18} aria-hidden="true" />Browse marketplace<ArrowRight size={16} aria-hidden="true" /></Link>
            <Link to="/characters" className="exchange-quiet">Your characters<ChevronRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
        {/* Subtle background geometry and existing artwork are decorative, not recommendations. */}
        <div className="exchange-wares" aria-hidden="true">
          <div className="exchange-display-arch" /><div className="exchange-display-orbit" />
          <span className="exchange-display-heading">Arms · Materials · Rarities</span>
          <DisplayItem icon="gear_breton_ring_a.png" className="exchange-display-left">Jewelry</DisplayItem>
          <DisplayItem icon="gear_argonian_staff_d.png" className="exchange-display-center">Weapons</DisplayItem>
          <DisplayItem icon="styleitemicon_u46_solsticeargonians.png" className="exchange-display-right">Materials</DisplayItem>
          <div className="exchange-display-plinth" />
        </div>
      </section>
      {/* Categories Grid Section */}
      <section aria-labelledby="categories-title">
        <div className="exchange-home-section-heading"><h2 id="categories-title"><Layers size={22} aria-hidden="true" />Browse the market</h2><span>{categories.length} categories</span></div>
        {/* Categories Grid */}
        {loading ? <div className="exchange-state" role="status">Loading ESO Marketplace categories…</div> : <div className="exchange-category-grid">{categories.map(category => <CategoryCard key={category} category={category} />)}</div>}
      </section>
      {/* Feature Statistics Highlights */}
      <section className="exchange-home-context" aria-label="About the marketplace">
        <div><ScrollText size={22} aria-hidden="true" /><p><strong>155,476 catalog items</strong><span>Explore the ESO item catalog.</span></p></div>
        <div><Store size={22} aria-hidden="true" /><p><strong>Seen at guild traders</strong><span>Shared by players. Availability may change.</span></p></div>
        <Link to="/characters"><Shield size={22} aria-hidden="true" /><p><strong>Your characters, equipped</strong><span>Roster, gear, and trait research.</span></p><ChevronRight size={16} aria-hidden="true" /></Link>
      </section>
    </main>
  </div>;
}

export default Home;
