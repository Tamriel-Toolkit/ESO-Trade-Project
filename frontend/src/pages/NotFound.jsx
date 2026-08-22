import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/ui/navbar';
import { Compass, Store, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0d] text-[#e0d8c3] flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center border border-[#2a2c33] bg-[#121218]/90 p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle background crest accent */}
          <div className="absolute -top-12 -right-12 text-[#c5a059]/5 pointer-events-none">
            <Compass className="size-48" />
          </div>

          <div className="inline-flex p-4 bg-[#0a0a0d] border border-[#c5a059]/40 mb-5 text-[#c5a059]">
            <ShieldAlert className="size-10" />
          </div>

          <h1 className="font-cinzel text-5xl font-extrabold text-[#d4af37] tracking-wider mb-2">
            404
          </h1>
          <h2 className="font-cinzel text-lg font-bold uppercase tracking-widest text-[#e0d8c3] mb-4">
            Lost in the Aether
          </h2>

          <p className="text-[#a89f91] text-sm leading-relaxed mb-8">
            The scrolls speak of no such destination in Tamriel. The marketplace or path you seek has vanished into Oblivion.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/marketplace" className="w-full sm:w-auto">
              <Button
                variant="default"
                className="w-full sm:w-auto rounded-none gap-2 font-cinzel font-bold text-xs uppercase bg-[#c5a059] hover:bg-[#d4af37] text-[#0a0a0d] border border-[#c5a059]"
              >
                <Store className="size-4" />
                <span>Live Marketplace</span>
              </Button>
            </Link>

            <Link to="/" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto rounded-none gap-2 font-cinzel font-semibold text-xs uppercase border-[#2a2c33] text-[#a89f91] hover:text-[#e0d8c3] hover:border-[#c5a059]/40"
              >
                <ArrowLeft className="size-4" />
                <span>Return Home</span>
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
