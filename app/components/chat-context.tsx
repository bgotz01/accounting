"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ChatContextType = {
    openConversationId: string | null;
    openConversation: (id: string) => void;
    clearOpenRequest: () => void;
};

const ChatContext = createContext<ChatContextType>({
    openConversationId: null,
    openConversation: () => { },
    clearOpenRequest: () => { },
});

export function ChatProvider({ children }: { children: ReactNode }) {
    const [openConversationId, setOpenConversationId] = useState<string | null>(null);

    const openConversation = useCallback((id: string) => {
        setOpenConversationId(id);
    }, []);

    const clearOpenRequest = useCallback(() => {
        setOpenConversationId(null);
    }, []);

    return (
        <ChatContext.Provider value={{ openConversationId, openConversation, clearOpenRequest }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChatContext() {
    return useContext(ChatContext);
}
