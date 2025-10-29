import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { apiGet, apiPost, apiPut } from "../lib/api";

export default function ChatApp({ socket }) {
  const { user, token, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [presence, setPresence] = useState({});
  const endRef = useRef(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", avatarUrl: "" });
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupMembers, setGroupMembers] = useState({ members: [], admin: null });
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    const debounce = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await apiGet(`/api/users?q=${encodeURIComponent(query)}`, token);
        setSearchResults(results.filter((u) => u.id !== user?.id));
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [query, token, user]);

  useEffect(() => {
    async function loadChats() {
      try {
        const data = await apiGet("/api/chats", token);
        setChats(data);
        if (data.length > 0 && !active) {
          setActive(data[0]);
        }
      } catch (err) {
        console.error("Failed to load chats:", err);
      } finally {
        setLoading(false);
      }
    }
    if (token) loadChats();
  }, [token]);

  useEffect(() => {
    if (!active) {
      setMessages([]);
      return;
    }
    async function loadMessages() {
      try {
        const data = await apiGet(
          `/api/chats/${active.id || active._id}/messages`,
          token
        );
        setMessages(data);
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    }
    loadMessages();
  }, [active, token]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!active?.isGroup || !showGroupInfo) return;
    async function loadMembers() {
      try {
        const info = await apiGet(`/api/chats/${active.id || active._id}/members`, token);
        setGroupMembers(info);
      } catch (err) {
        console.error("Failed to load group members:", err);
      }
    }
    loadMembers();
  }, [active, showGroupInfo, token]);

  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => console.info("[socket] connected", socket.id));
    socket.on("disconnect", (reason) => console.info("[socket] disconnected", reason));
    socket.on("connect_error", (err) => console.error("[socket] connect_error", err));

    function handleNewMessage(message) {
      const chatId = message.chat || message.chatId;

      if (String(chatId) === String(active?.id || active?._id) && active) {
        setMessages((prev) => {
          const exists = prev.some(
            (m) => String(m.id || m._id) === String(message.id || message._id)
          );
          if (exists) return prev;
          return [...prev, message];
        });
      }

      setChats((prev) => {
        const exists = prev.some((c) => String(c.id || c._id) === String(chatId));
        if (exists) {
          return prev.map((c) =>
            String(c.id || c._id) === String(chatId) ? { ...c, lastMessage: message } : c
          );
        }

        (async () => {
          try {
            const chat = await apiGet(`/api/chats/${chatId}`, token);
            setChats((cur) => [chat, ...cur]);
          } catch (err) {
            console.error("Failed to fetch chat for incoming message:", err);
          }
        })();
        return prev;
      });
    }

    function handleTypingEvent(data) {
      setChats((prev) =>
        prev.map((c) =>
          (c.id || c._id) === data.chatId ? { ...c, typing: data.typing } : c
        )
      );
    }

    socket.on("message:new", handleNewMessage);
    socket.on("typing", handleTypingEvent);
    socket.on("user:presence", (data) => {
      setChats((prev) =>
        prev.map((c) =>
          c.members?.some((m) => m.id === data.userId || m._id === data.userId)
            ? {
                ...c,
                members: c.members.map((m) =>
                  (m.id || m._id) === data.userId
                    ? { ...m, isOnline: data.isOnline, lastSeen: data.lastSeen }
                    : m
                ),
              }
            : c
        )
      );
    });

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("typing", handleTypingEvent);
      socket.off("user:presence");
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
    };
  }, [socket, active]);

  async function send(e) {
    e?.preventDefault();
    if (!active || !input.trim()) return;
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      chat: active.id || active._id,
      sender: user.id,
      content: input.trim(),
      createdAt: new Date().toISOString(),
      status: { [user.id]: "sent" },
      optimistic: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInput("");
    try {
      socket.emit(
        "message:send",
        {
          chatId: active.id || active._id,
          content: optimisticMsg.content,
        },
        (ack) => {
          if (ack && ack.ok && ack.message) {
            setMessages((prev) => {
              const realId = ack.message.id || ack.message._id;
              const already = prev.some((m) => String(m.id || m._id) === String(realId));
              if (already) {
                return prev.filter((m) => m.id !== tempId);
              }
              return prev.map((m) => (m.id === tempId ? ack.message : m));
            });
          } else if (ack && ack.error) {
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            alert("Message failed: " + ack.error);
          }
        }
      );
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      console.error("Failed to send message:", err);
    }
  }

  function toggleSelectMember(userId) {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function createOneToOne(userId) {
    try {
      const chat = await apiPost(
        "/api/chats",
        { memberIds: [userId], isGroup: false },
        token
      );
      setChats((prev) => [chat, ...prev]);
      setActive(chat);
      setQuery("");
      setSearchResults([]);
    } catch (err) {
      console.error("Failed to create chat:", err);
    }
  }

  async function createGroup() {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    try {
      const chat = await apiPost(
        "/api/chats",
        {
          memberIds: selectedMembers,
          isGroup: true,
          name: groupName.trim(),
        },
        token
      );
      setChats((prev) => [chat, ...prev]);
      setActive(chat);
      setQuery("");
      setSearchResults([]);
      setGroupMode(false);
      setGroupName("");
      setSelectedMembers([]);
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  }

  function getChatTitle(chat) {
    if (chat.isGroup) return chat.name;
    const other = chat.members?.find((m) => m.id !== user?.id && m._id !== user?.id);
    return other?.name || other?.username || "Unknown";
  }

  function renderPresence(chat) {
    if (chat.isGroup) return null;
    const other = chat.members?.find((m) => m.id !== user?.id && m._id !== user?.id);
    if (!other) return null;
    if (other.isOnline) return " 🟢";
    if (other.lastSeen) {
      const date = new Date(other.lastSeen);
      const now = new Date();
      const diff = now - date;
      const hours = Math.floor(diff / 3600000);
      if (hours < 24) return ` 🕐 ${hours}h ago`;
      return ` 🕐 ${Math.floor(hours / 24)}d ago`;
    }
    return "";
  }

  const safeChats = chats || [];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="me">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{user?.name || user?.username || "User"}</span>
            <div>
              <button
                onClick={() => {
                  setEditingProfile((v) => !v);
                  setProfileForm({
                    name: user?.name || "",
                    avatarUrl: user?.avatarUrl || "",
                  });
                }}
                style={{
                  background: "transparent",
                  color: "var(--subtext)",
                  marginRight: 8,
                  padding: "4px 8px",
                }}
              >
                Edit
              </button>
              <button
                onClick={logout}
                style={{
                  background: "transparent",
                  color: "var(--subtext)",
                  padding: "4px 8px",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        <div className="users-header">Chats</div>
        <div style={{ padding: "8px 12px", borderBottom: "1px solid #1f2c34" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => {
                setGroupMode((v) => !v);
                setSelectedMembers([]);
                setGroupName("");
              }}
              style={{ background: groupMode ? "var(--accent)" : "#26323a" }}
            >
              {groupMode ? "Cancel Group" : "New Group"}
            </button>
          </div>
          <input
            placeholder={
              groupMode ? "Search users to add to group" : "Search users to start a chat"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: "100%" }}
          />
          {query && (
            <div style={{ marginTop: 8, maxHeight: 180, overflow: "auto" }}>
              {searching && <div className="typing">Searching…</div>}
              {!searching && searchResults.length === 0 && (
                <div className="typing">No users found</div>
              )}
              {!searching && searchResults.length > 0 && (
                <ul className="users">
                  {searchResults.map((u) => (
                    <li
                      key={u.id}
                      onClick={() =>
                        groupMode ? toggleSelectMember(u.id) : createOneToOne(u.id)
                      }
                      className={
                        groupMode && selectedMembers.includes(u.id) ? "self" : ""
                      }
                      style={{ cursor: "pointer" }}
                    >
                      {u.name || u.username}{" "}
                      <span style={{ color: "var(--subtext)" }}>@{u.username}</span>
                    </li>
                  ))}
                </ul>
              )}
              {groupMode && (
                <div style={{ padding: "8px 0" }}>
                  <input
                    placeholder="Group name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    style={{ width: "100%", margin: "8px 0" }}
                  />
                  <button type="button" onClick={createGroup}>
                    Create Group
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <ul className="users">
          {safeChats.length === 0 ? (
            <li style={{ padding: "16px", textAlign: "center", color: "var(--subtext)" }}>
              No chats yet. Search for users to start a conversation.
            </li>
          ) : (
            safeChats.map((c) => (
              <li
                key={c.id || c._id}
                onClick={() => setActive(c)}
                className={active?.id === c.id ? "self" : ""}
                style={{ cursor: "pointer" }}
              >
                {getChatTitle(c)} {c.typing ? "…typing" : ""}
                {renderPresence(c)}
              </li>
            ))
          )}
        </ul>
      </aside>
      <main className="chat">
        <header className="chat-header">
          {active
            ? getChatTitle(active)
            : safeChats.length
            ? "Select a chat"
            : "Start a conversation"}
          {active?.isGroup && (
            <button
              onClick={() => setShowGroupInfo((v) => !v)}
              style={{
                float: "right",
                background: "transparent",
                color: "var(--subtext)",
              }}
            >
              {showGroupInfo ? "Hide Info" : "Group Info"}
            </button>
          )}
        </header>
        <div className="messages">
          {active &&
            messages.map((m) => {
              const isMine = String(m.sender) === String(user?.id);
              return (
                <div key={m.id || m._id} className={`msg ${isMine ? "mine" : ""}`}>
                  <div className="meta">
                    <span className="author">{isMine ? "You" : "Them"}</span>
                    <span className="time">
                      {new Date(m.createdAt || m.time).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="bubble">
                    {m.content}
                    {isMine && (
                      <span
                        style={{ marginLeft: 8, color: "var(--subtext)", fontSize: 12 }}
                      >
                        {renderTicks(m, active, user?.id)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          <div ref={endRef} />
          {!active && !safeChats.length && (
            <div className="typing" style={{ padding: 16 }}>
              Use the search box to find a user and start a chat.
            </div>
          )}
        </div>
        {active && (
          <form className="input" onSubmit={send}>
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (socket) {
                  socket.emit("typing", {
                    chatId: active.id || active._id,
                    typing: true,
                  });
                }
              }}
              placeholder="Type a message"
            />
            <button type="submit">Send</button>
          </form>
        )}
        {active?.isGroup && showGroupInfo && (
          <div
            style={{
              padding: 12,
              borderTop: "1px solid #1f2c34",
              background: "var(--panel)",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Group Members</div>
            <ul className="users">
              {groupMembers.members.map((m) => (
                <li key={m.id || m._id}>
                  {m.name || m.username}{" "}
                  {groupMembers.admin === (m.id || m._id) ? "(admin)" : ""}
                  {groupMembers.admin === user?.id && (m.id || m._id) !== user?.id && (
                    <button
                      style={{ float: "right", background: "#26323a" }}
                      onClick={async () => {
                        await apiPost(
                          `/api/chats/${active.id || active._id}/members/remove`,
                          { userId: m.id || m._id },
                          token
                        ).catch(async () => {
                          // fallback to DELETE endpoint
                          await fetch(
                            `${
                              import.meta.env.VITE_API_URL || "http://localhost:5000"
                            }/api/chats/${active.id || active._id}/members/${
                              m.id || m._id
                            }`,
                            {
                              method: "DELETE",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                            }
                          );
                        });
                        const info = await apiGet(
                          `/api/chats/${active.id || active._id}/members`,
                          token
                        );
                        setGroupMembers(info);
                      }}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

function renderTicks(message, chat, selfId) {
  // For 1:1: check the other member's status
  const statuses = message.status ? Object.values(message.status) : [];
  const seen = statuses.includes("seen");
  const delivered = statuses.includes("delivered") || seen;
  if (seen) return "✔✔";
  if (delivered) return "✔✔";
  return "✔";
}
