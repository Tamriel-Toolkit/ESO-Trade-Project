import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/ui/navbar';
import { Compass, Store, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="exchange-page">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="exchange-frame max-w-lg w-full text-center p-8 relative overflow-hidden">
          {/* Subtle background crest accent */}
          <div className="absolute -top-12 -right-12 text-primary/5 pointer-events-none" aria-hidden="true">
            <Compass className="size-48" />
          </div>

          <div className="inline-flex p-4 bg-recess border border-primary/40 mb-5 text-primary" aria-hidden="true">
            <ShieldAlert className="size-10" />
          </div>

          <h1 className="font-sans text-5xl font-extrabold text-primary  mb-2">
            404
          </h1>
          <h2 className="font-sans text-lg font-bold   text-foreground mb-4">
            Page not found
          </h2>

          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            This page isn't here. Return to the marketplace or start again from home.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/marketplace" className="exchange-primary w-full sm:w-auto">
                <Store className="size-4" />
                <span>Browse marketplace</span>
            </Link>

            <Link to="/" className="exchange-secondary w-full sm:w-auto">
                <ArrowLeft className="size-4" />
                <span>Return home</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
