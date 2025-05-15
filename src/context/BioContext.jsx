import React, { createContext, useContext, useState } from 'react';

const BioContext = createContext();

export { BioContext };

export function BioProvider({ children }) {
  const [bioData, setBioData] = useState(null);

  return (
    <BioContext.Provider value={{ bioData, setBioData }}>
      {children}
    </BioContext.Provider>
  );
}

export function useBio() {
  return useContext(BioContext);
}
