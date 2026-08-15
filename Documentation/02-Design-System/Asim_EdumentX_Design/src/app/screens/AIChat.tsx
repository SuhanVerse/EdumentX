import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { Send, ChevronLeft, Star, X, Sparkles } from "lucide-react";
import { TUTORS } from "../data/mockData";
import { colors, radius, font } from "../theme/tokens";
import { StatusBar } from "../components/shared/StatusBar";
import { BottomNav } from "../components/shared/BottomNav";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  tutors?: typeof TUTORS;
}

const AI_RESPONSES: Record<string, { text: string; showTutors?: boolean }> = {
  default: { text: "I found some great tutors matching your request! Here are the top picks based on your location and preferences.", showTutors: true },
  maths: { text: "Great choice! Mathematics is one of our most popular subjects. Here are the top-rated maths tutors near you:", showTutors: true },
  budget: { text: "Looking for affordable tutors? I found tutors with monthly rates under Rs 3,000 near you:", showTutors: true },
  lalitpur: { text: "Here are verified tutors available in the Lalitpur area:", showTutors: true },
};

export function AIChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "ai",
      text: "Hi! I'm your EdumentX AI assistant. I can help you find the perfect tutor based on your subject, location, budget, and schedule. What are you looking for?",
    },
  ]);
  const [constraints, setConstraints] = useState<string[]>([
    "Maths",
    "Under Rs 3,000",
    "Lalitpur",
    "Verified only",
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const removeConstraint = (c: string) => {
    setConstraints((prev) => prev.filter((x) => x !== c));
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const lower = text.toLowerCase();
      let response = AI_RESPONSES.default;
      if (lower.includes("math")) response = AI_RESPONSES.maths;
      else if (lower.includes("3,000") || lower.includes("budget") || lower.includes("cheap")) response = AI_RESPONSES.budget;
      else if (lower.includes("lalitpur") || lower.includes("patan")) response = AI_RESPONSES.lalitpur;

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: response.text,
        tutors: response.showTutors ? TUTORS.slice(0, 3) : undefined,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1100);
  };

  const canSend = input.trim().length > 0;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: colors.paper,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        fontFamily: font,
      }}
    >
      {/* Dark slate header */}
      <div style={{ background: colors.slate, flexShrink: 0 }}>
        <StatusBar dark />
        <div style={{ padding: "0 20px 16px" }}>
          {/* Top row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => navigate("/student/home")}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronLeft size={24} color={colors.inverse} />
            </button>

            {/* Avatar pill with online dot */}
            <div style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: colors.ai,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={20} color={colors.inverse} />
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: -1,
                  right: -1,
                  width: 11,
                  height: 11,
                  borderRadius: 999,
                  background: colors.verify,
                  border: `2px solid ${colors.slate}`,
                }}
              />
            </div>

            {/* Title column */}
            <div>
              <span
                style={{
                  display: "inline-block",
                  width: "100%",
                  fontSize: 17,
                  fontWeight: 500,
                  color: colors.inverse,
                  borderBottom: `2px solid ${colors.amber}`,
                  paddingBottom: 2,
                }}
              >
                AI Assistant
              </span>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                Online
              </div>
            </div>
          </div>

          {/* Removable constraint pills */}
          {constraints.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {constraints.map((c) => (
                <div
                  key={c}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: colors.aiTint,
                    border: `1px solid ${colors.ai}`,
                    borderRadius: 999,
                    padding: "5px 10px",
                    fontSize: 12,
                    fontWeight: 500,
                    color: colors.ai,
                  }}
                >
                  <span>{c}</span>
                  <button
                    onClick={() => removeConstraint(c)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <X size={13} color={colors.ai} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, paddingBottom: 150 }}>
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              style={{
                marginBottom: 16,
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                gap: 8,
              }}
            >
              {!isUser && (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: colors.ai,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <Sparkles size={15} color={colors.inverse} />
                </div>
              )}

              <div style={{ maxWidth: "80%" }}>
                <div
                  style={{
                    background: isUser ? colors.green : colors.card,
                    border: isUser ? "none" : `1px solid ${colors.hairline}`,
                    borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    padding: "10px 14px",
                  }}
                >
                  <p
                    style={{
                      fontSize: 15,
                      lineHeight: 1.5,
                      margin: 0,
                      color: isUser ? colors.inverse : colors.text,
                    }}
                  >
                    {msg.text}
                  </p>
                </div>

                {/* Suggested tutor cards */}
                {msg.tutors && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    {msg.tutors.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => navigate(`/student/tutor/${t.id}`)}
                        style={{
                          background: colors.paper,
                          borderRadius: radius.well,
                          border: `1px solid ${colors.hairline}`,
                          padding: 10,
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          cursor: "pointer",
                        }}
                      >
                        <img
                          src={t.avatar}
                          alt={t.name}
                          style={{ width: 36, height: 36, borderRadius: 999, objectFit: "cover", flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>
                            {t.name}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                            <Star size={11} color={colors.amber} fill={colors.amber} />
                            <span style={{ fontSize: 11, color: colors.muted }}>{t.rating}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: colors.green, whiteSpace: "nowrap" }}>
                          Rs {t.rate.toLocaleString()}/mo
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                background: colors.ai,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              <Sparkles size={15} color={colors.inverse} />
            </div>
            <div
              style={{
                background: colors.card,
                border: `1px solid ${colors.hairline}`,
                borderRadius: "16px 16px 16px 4px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: colors.placeholder,
                    animation: "aiTypingPulse 1s ease-in-out infinite",
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <style>{`@keyframes aiTypingPulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }`}</style>

      {/* Composer */}
      <div
        style={{
          position: "absolute",
          bottom: 72,
          left: 0,
          right: 0,
          background: colors.sand,
          borderTop: `1px solid ${colors.hairline}`,
          padding: "12px 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Ask about tutors, subjects, rates…"
            style={{
              flex: 1,
              height: 44,
              background: colors.card,
              border: `1px solid ${colors.hairline}`,
              borderRadius: 999,
              padding: "0 18px",
              fontSize: 15,
              color: colors.text,
              outline: "none",
              fontFamily: font,
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!canSend}
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              background: canSend ? colors.amber : colors.hairline,
              border: "none",
              cursor: canSend ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Send size={18} color={colors.inverse} />
          </button>
        </div>
      </div>

      <BottomNav role="student" />
    </div>
  );
}
