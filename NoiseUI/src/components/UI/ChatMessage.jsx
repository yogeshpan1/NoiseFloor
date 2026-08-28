export default function ChatMessage({ role, content, suggestions, onSuggestionClick }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-gold/15 text-text-primary'
            : 'border border-white/10 bg-bg-card text-text-secondary'
        }`}
      >
        <div>{content}</div>
        {suggestions && suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((s) => {
              const item = typeof s === 'string' ? { label: s, ask: s } : s;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onSuggestionClick?.(item.ask)}
                  className="rounded-full border border-gold/30 px-3 py-1.5 text-xs font-medium text-gold-bright transition-colors hover:bg-gold/10"
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
