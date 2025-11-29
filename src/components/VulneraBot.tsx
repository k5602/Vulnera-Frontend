import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isAuthenticated as isAuthenticatedStore } from '../utils/api/auth-store';
import { apiClient } from '../utils/api/client';
import { logger } from '../utils/logger';

/** Extract error message from unknown error types */
function extractErrorMessage(error: unknown, fallback = 'An unknown error occurred'): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message);
    }
    return fallback;
}

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    references?: string[];
    timestamp: Date;
}

interface LLMResponse {
    answer: string;
    references?: string[];
}

export default function VulneraBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            text: "Greetings. I am Vulnero-AI, your vulnerability analysis assistant. How can I assist you today?",
            sender: 'bot',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Check for authentication using the centralized store
        const checkAuth = () => {
            setIsAuthenticated(isAuthenticatedStore());
        };

        checkAuth();

        // Listen for storage events to handle login/logout across tabs
        // This is sufficient - storage events fire whenever auth state changes
        window.addEventListener('storage', checkAuth);

        return () => {
            window.removeEventListener('storage', checkAuth);
        };
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    if (!isAuthenticated) return null;

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputValue,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);



        try {
            // Use apiClient to handle CSRF tokens automatically
            const response = await apiClient.post<LLMResponse>('/api/v1/llm/query', {
                context: "User is asking via the web chat interface.",
                query: userMessage.text
            });

            if (!response.ok) {
                logger.warn('LLM Query failed', { status: response.status, error: response.error });
                // Safely extract error message from unknown error type
                const err = response.error as Record<string, unknown> | string | undefined;
                const errorMsg = typeof err === 'string' ? err :
                    (err?.message as string) ||
                    (err?.details as string) ||
                    (err?.error as string) ||
                    (err?.detail as string) ||
                    'Network response was not ok';
                throw new Error(errorMsg);
            }

            const data = (response.data || {}) as Partial<LLMResponse>;

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: data.answer || "I apologize, but I received an invalid response from the server.",
                sender: 'bot',
                references: data.references || [],
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error: unknown) {
            logger.error('Error querying LLM', { error: extractErrorMessage(error) });
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: `System Error: ${extractErrorMessage(error, 'Unable to connect to the server.')}`,
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floating Toggle Button */}
            <motion.button
                className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-black border border-cyber-500 shadow-[0_0_15px_rgba(0,229,209,0.5)] flex items-center justify-center text-cyber-500 hover:bg-cyber-950 hover:text-cyber-300 transition-colors duration-300 group"
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Toggle Vulnero bot Chat"
            >
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyber-500"></span>
                        </span>
                    </div>
                )}
            </motion.button>

            {/* Tooltip Pointer */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: 1, duration: 0.5 }}
                        className="fixed bottom-8 right-24 z-40 bg-black/80 backdrop-blur border border-cyber-500/50 text-cyber-400 text-xs font-mono py-1 px-3 rounded pointer-events-none hidden md:block"
                    >
                        <div className="absolute top-1/2 -right-1 w-2 h-2 bg-black border-t border-r border-cyber-500/50 transform rotate-45 -translate-y-1/2"></div>
                        VULNERO_BOT
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] flex flex-col bg-black/90 backdrop-blur-md border border-cyber-500 rounded-lg shadow-[0_0_30px_rgba(0,229,209,0.2)] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-500/30 bg-cyber-950/50">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-cyber-500 animate-pulse"></div>
                                <h3 className="text-cyber-500 font-mono font-bold tracking-wider">VULNERA_AI</h3>
                            </div>
                            <div className="text-xs text-cyber-700 font-mono">ONLINE</div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-cyber-700 scrollbar-track-transparent">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-lg p-3 text-sm font-mono ${msg.sender === 'user'
                                            ? 'bg-cyber-900/50 text-cyber-50 border border-cyber-700'
                                            : 'bg-black/50 text-cyber-100 border border-cyber-500/50'
                                            }`}
                                    >
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                        {msg.references && msg.references.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-cyber-500/20">
                                                <p className="text-xs text-cyber-500 mb-1">References:</p>
                                                <ul className="list-disc list-inside text-xs text-cyber-300 space-y-1">
                                                    {msg.references.map((ref, idx) => (
                                                        <li key={idx}>
                                                            <a href={ref} target="_blank" rel="noopener noreferrer" className="hover:text-cyber-100 hover:underline truncate block">
                                                                {ref}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        <div className="mt-1 text-[10px] opacity-50 text-right">
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-black/50 border border-cyber-500/50 rounded-lg p-3">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-cyber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-2 h-2 bg-cyber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2 h-2 bg-cyber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="p-3 border-t border-cyber-500/30 bg-black/80">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Enter command or query..."
                                    className="w-full bg-cyber-950/30 text-cyber-100 border border-cyber-700 rounded-md py-2 pl-3 pr-10 focus:outline-none focus:border-cyber-500 focus:ring-1 focus:ring-cyber-500 font-mono text-sm placeholder-cyber-800"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !inputValue.trim()}
                                    className="absolute right-2 p-1 text-cyber-500 hover:text-cyber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}