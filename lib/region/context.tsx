'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type Region = 'us' | 'ca';

interface RegionContextValue {
  region: Region;
  setRegion: (r: Region) => void;
}

const RegionContext = createContext<RegionContextValue>({
  region: 'us',
  setRegion: () => {},
});

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [region, setRegionState] = useState<Region>('us');

  useEffect(() => {
    const stored = localStorage.getItem('fcs-region') as Region | null;
    if (stored === 'us' || stored === 'ca') setRegionState(stored);
  }, []);

  function setRegion(r: Region) {
    setRegionState(r);
    localStorage.setItem('fcs-region', r);
  }

  return (
    <RegionContext.Provider value={{ region, setRegion }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion(): RegionContextValue {
  return useContext(RegionContext);
}
