"use client";

import { createContext, useContext, useState } from "react";

type MobileMenuContextType = {
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
};

const MobileMenuContext = createContext<MobileMenuContextType>({
    mobileOpen: false,
    setMobileOpen: () => { },
});

export function MobileMenuProvider({ children }: { children: React.ReactNode }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    return (
        <MobileMenuContext.Provider value={{ mobileOpen, setMobileOpen }}>
            {children}
        </MobileMenuContext.Provider>
    );
}

export function useMobileMenu() {
    return useContext(MobileMenuContext);
}
