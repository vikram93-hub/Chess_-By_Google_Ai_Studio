import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Smile } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface OnlineChatDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  playerName: string;
}

const QUICK_PHRASES = [
  'Good luck! ⚔️',
  'Well played! 👏',
  'Nice move! 🎯',
  'Check! 👑',
  'Thinking... ⏳',
  'Good game! 🤝',
];

export const OnlineChatDrawer: React.FC<OnlineChatDrawerProps> = ({
  isOpen,
  onToggle,
  messages,
  onSendMessage,
  playerName,
}) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleQuickPhrase = (phrase: string) => {
    onSendMessage(phrase);
  };

  return (
    <div className="flex flex-col h-full bg-[#111726]/90 border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/80 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-200">Match Chat</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">Live</span>
      </div>

      {/* Message Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[180px] sm:max-h-[220px]">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-slate-500 text-xs italic">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender === playerName;
            const isSys = m.sender === 'System';

            if (isSys) {
              return (
                <div key={m.id} className="text-center py-1">
                  <span className="text-[10px] text-indigo-400/90 italic bg-indigo-950/40 border border-indigo-500/20 px-2 py-0.5 rounded-full inline-block">
                    {m.text}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[9px] text-slate-400 mb-0.5 px-1">{m.sender}</span>
                <div
                  className={`text-xs px-2.5 py-1.5 rounded-xl max-w-[85%] break-words ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/60'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Phrases */}
      <div className="p-1.5 bg-slate-900/40 border-t border-slate-800/60 overflow-x-auto no-scrollbar flex items-center gap-1">
        {QUICK_PHRASES.map((phrase) => (
          <button
            key={phrase}
            onClick={() => handleQuickPhrase(phrase)}
            className="text-[10px] font-medium whitespace-nowrap px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0 border border-slate-700/60"
          >
            {phrase}
          </button>
        ))}
      </div>

      {/* Input box */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5 p-2 bg-slate-900/80 border-t border-slate-800/80">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send message..."
          maxLength={150}
          className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
