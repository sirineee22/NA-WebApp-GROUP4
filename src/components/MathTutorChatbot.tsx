import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { MessageCircle, Send, X, Lightbulb, BookOpen, ChevronDown } from 'lucide-react';
import { Badge } from './ui/badge';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  suggestedTopics?: string[];
}

export const MathTutorChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [providerLabel, setProviderLabel] = useState<string>('Hugging Face');

  // Add custom CSS for scrollbar
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .messages-container::-webkit-scrollbar {
        width: 8px;
      }
      .messages-container::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 4px;
      }
      .messages-container::-webkit-scrollbar-thumb {
        background: #94a3b8;
        border-radius: 4px;
      }
      .messages-container::-webkit-scrollbar-thumb:hover {
        background: #64748b;
      }
      .messages-container {
        scrollbar-width: thin;
        scrollbar-color: #94a3b8 #f1f5f9;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Get current lesson context from URL or props
  const getCurrentContext = () => {
    const path = window.location.pathname;
    if (path.includes('gauss')) return 'Gauss Elimination Method';
    if (path.includes('lu')) return 'LU Decomposition';
    if (path.includes('jacobi')) return 'Jacobi Iterative Method';
    if (path.includes('interpolation')) return 'Polynomial Interpolation';
    if (path.includes('determinant')) return 'Matrix Determinants';
    if (path.includes('systemes-lineaires')) return 'Linear Systems';
    if (path.includes('equations-non-lineaires')) return 'Non-linear Equations';
    return 'Numerical Methods';
  };

  const scrollToBottom = () => {
    const messagesContainer = document.querySelector('.messages-container') as HTMLElement;
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  };

  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check if scrolling is needed
  useEffect(() => {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      const checkScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainer as HTMLElement;
        setShowScrollIndicator(scrollHeight > clientHeight && scrollTop < scrollHeight - clientHeight - 10);
      };
      
      messagesContainer.addEventListener('scroll', checkScroll);
      checkScroll(); // Check initially
      
      return () => messagesContainer.removeEventListener('scroll', checkScroll);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // 1) Try Hugging Face first (free)
      try {
        const hfResponse = await fetch('http://localhost:8000/api/huggingface/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: inputValue,
            user_id: 1,
            context: getCurrentContext(),
            lesson_id: null
          })
        });

        if (!hfResponse.ok) throw new Error(`HF HTTP ${hfResponse.status}`);

        const hfData = await hfResponse.json();
        const aiMessageHF: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: hfData.response,
          isUser: false,
          timestamp: new Date(),
          suggestedTopics: hfData.suggested_topics
        };
        setMessages(prev => [...prev, aiMessageHF]);
        setSuggestedTopics(hfData.suggested_topics || []);
        setProviderLabel(hfData.model_used ? `Hugging Face (${hfData.model_used})` : 'Hugging Face');
        return; // done
      } catch (hfErr) {
        console.warn('HF failed, falling back to DeepSeek:', hfErr);
      }

      // 2) Fallback to DeepSeek router (has its own local fallback)
      const dsResponse = await fetch('http://localhost:8000/api/chatbot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          user_id: 1,
          context: getCurrentContext(),
          lesson_id: null
        })
      });

      if (!dsResponse.ok) throw new Error(`DS HTTP ${dsResponse.status}`);
      const dsData = await dsResponse.json();
      const aiMessageDS: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: dsData.response,
        isUser: false,
        timestamp: new Date(),
        suggestedTopics: dsData.suggested_topics
      };
      setMessages(prev => [...prev, aiMessageDS]);
      setSuggestedTopics(dsData.suggested_topics || []);
      setProviderLabel('DeepSeek (or local fallback)');
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Désolé, je rencontre des difficultés techniques. Réessaie dans quelques instants.',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedTopic = (topic: string) => {
    const question = `Peux-tu m'expliquer ${topic.toLowerCase()} ?`;
    setInputValue(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 z-40"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-end p-6 z-50">
                     <Card className="w-96 h-[600px] flex flex-col overflow-hidden">
            <CardHeader className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    Math Tutor AI
                  </CardTitle>
                  <p className="text-sm text-gray-600">Powered by {providerLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  {showScrollIndicator && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={scrollToBottom}
                      className="text-blue-600 hover:text-blue-700"
                      title="Aller en bas"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0">
              {/* Suggested Topics */}
              {suggestedTopics.length > 0 && (
                <div className="p-3 border-b bg-blue-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Sujets suggérés:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTopics.map((topic, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-blue-200 transition-colors"
                        onClick={() => handleSuggestedTopic(topic)}
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div 
                className="flex-1 overflow-y-auto p-4 space-y-4 messages-container"
                style={{
                  height: '300px',
                  maxHeight: '300px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#CBD5E0 #F7FAFC',
                  overflowY: 'scroll'
                }}
              >
                {/* Scroll Indicator */}
                {showScrollIndicator && (
                  <div className="text-center mb-2">
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full border border-blue-200">
                      <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                      <span>📜 Faites défiler pour voir plus</span>
                      <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                )}
                
                {/* Always visible scroll hint */}
                <div className="text-center mb-2 text-xs text-gray-400">
                  💡 Utilisez la molette de la souris ou la barre de défilement à droite
                </div>
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Pose ta question de mathématiques !</p>
                    <p className="text-xs mt-1">Ex: "Comment résoudre un système linéaire ?"</p>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg break-words ${
                        message.isUser
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                          : 'bg-gray-100 text-gray-900 border border-gray-200'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                      <div className={`text-xs mt-2 ${message.isUser ? 'text-blue-100' : 'text-gray-500'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-3 py-2 rounded-lg border">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex space-x-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Pose ta question de mathématiques..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={isLoading || !inputValue.trim()}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};
