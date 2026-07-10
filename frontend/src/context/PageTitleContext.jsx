import { createContext, useContext, useState, useEffect } from 'react';

const PageTitleContext = createContext(null);

export function PageTitleProvider({ children }) {
  const [title, setTitle] = useState('Dashboard');
  return <PageTitleContext.Provider value={{ title, setTitle }}>{children}</PageTitleContext.Provider>;
}

export function usePageTitleContext() {
  const ctx = useContext(PageTitleContext);
  if (!ctx) throw new Error('usePageTitleContext must be used within a PageTitleProvider');
  return ctx;
}

/**
 * Call this at the top of any page component to set the topbar heading:
 *   usePageTitle('My Skills');
 */
export function usePageTitle(title) {
  const { setTitle } = usePageTitleContext();
  useEffect(() => {
    setTitle(title);
  }, [title, setTitle]);
}
