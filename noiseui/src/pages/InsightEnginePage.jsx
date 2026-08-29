import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { retrieve, classifyQuery, SUGGESTIONS } from '../utils/insightEngine';
import { fadeInUp, headingReveal } from '../utils/helpers';
import { useScrollReveal } from '../hooks/useScrollReveal';
import GlassCard from '../components/UI/GlassCard';
import ChatMessage from '../components/UI/ChatMessage';

function passageBlock(hits) {
  return (
    <div className="flex flex-col gap-3">
      {hits.map((h) => (
        <div key={h.passage.id}>
          <p>{h.passage.text}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-gold/70">
            Source · {h.passage.title} · relevance {(h.score * 100).toFixed(0)}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function InsightEnginePage() {
  const [ref, isVisible] = useScrollReveal();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Namaste 🙏 I'm grounded strictly in the verified NoiseFloor dataset — three crisis windows, four hypothesis tests, 96 source countries and every logged event date. What would you like to know?",
      suggestions: SUGGESTIONS.slice(0, 3),
    },
  ]);
  const [input, setInput] = useState('');
  const rankingRef = useRef({ hits: [], shown: 0, topic: '' });

  const ask = (raw) => {
    const q = raw.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setInput('');

    setTimeout(() => {
      const kind = classifyQuery(q);
      let reply;

      if (kind === 'greet') {
        reply = {
          content: "Namaste again! Ask me anything grounded in NoiseFloor's verified findings.",
          suggestions: SUGGESTIONS.slice(0, 3),
        };
      } else if (kind === 'thanks') {
        reply = { content: 'Anytime — dig deeper on the last topic, or start a new thread:', suggestions: SUGGESTIONS.slice(0, 3) };
      } else if (kind === 'followup' && rankingRef.current.hits.length) {
        const { hits, shown } = rankingRef.current;
        const next = hits.slice(shown, shown + 3);
        if (next.length) {
          rankingRef.current.shown = shown + next.length;
          reply = { content: passageBlock(next) };
        } else {
          reply = {
            content: `That's everything the verified corpus holds on "${rankingRef.current.topic}". Try one of these:`,
            suggestions: SUGGESTIONS.slice(0, 3),
          };
        }
      } else {
        const hits = retrieve(q, undefined, undefined, 3);
        if (!hits.length) {
          reply = {
            content: "Nothing in the verified NoiseFloor corpus matches that — I only answer from this project's data, never invent facts. Try one of these:",
            suggestions: SUGGESTIONS.slice(0, 3),
          };
        } else {
          const fullRanking = retrieve(q, undefined, undefined, 99);
          rankingRef.current = { hits: fullRanking, shown: hits.length, topic: q };
          reply = { content: passageBlock(hits) };
        }
      }

      setMessages((m) => [...m, { role: 'assistant', ...reply }]);
    }, 350 + Math.random() * 300);
  };

  return (
    <section className="px-6 py-16 sm:py-20">
      <div ref={ref} className="mx-auto max-w-4xl">
        <motion.h2
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={headingReveal}
          className="mb-2 text-h2 font-serif font-bold text-text-primary"
        >
          Insight Engine
        </motion.h2>
        <motion.p
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="mb-8 max-w-2xl text-sm text-text-secondary"
        >
          Ask questions in plain English. A hand-built inverted index + TF-IDF retrieval engine
          answers strictly from NoiseFloor's own verified data — retrieved text is quoted
          verbatim, never generated.
        </motion.p>

        <motion.div initial="hidden" animate={isVisible ? 'visible' : 'hidden'} variants={fadeInUp}>
          <GlassCard hover={false} className="p-0">
            <div className="flex max-h-[520px] min-h-[320px] flex-col gap-4 overflow-y-auto p-6">
              {messages.map((m, i) => (
                <ChatMessage key={i} role={m.role} content={m.content} suggestions={m.suggestions} onSuggestionClick={ask} />
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="flex items-center gap-2 border-t border-white/10 p-4"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the findings, a crisis, or the data…"
                className="min-h-[44px] flex-1 rounded-lg border border-white/10 bg-bg-secondary px-4 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-gold/40 focus:outline-none"
              />
              <button
                type="submit"
                className="flex min-h-[44px] w-11 shrink-0 items-center justify-center rounded-lg bg-gold-gradient text-bg-primary"
                aria-label="Send"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </form>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}
