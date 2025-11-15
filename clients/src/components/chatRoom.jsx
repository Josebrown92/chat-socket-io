import { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { fetchMessages } from "../api/messages";

export default function ChatRoom({ room }) {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch history on mount
  useEffect(() => {
    loadMessages(page);
  }, [room]);

  const loadMessages = async (pageNum) => {
    const data = await fetchMessages(room, pageNum);
    
    // Append older messages at the top
    setMessages((prev) => [...data.messages.reverse(), ...prev]);
    setHasMore(data.pagination.hasMore);
  };

  // Listen for real-time messages
  useEffect(() => {
    if (!socket) return;

    socket.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => socket.off("receive_message");
  }, [socket]);

  return (
    <div>
      {hasMore && <button onClick={() => {
        const next = page + 1;
        setPage(next);
        loadMessages(next);
      }}>Load older messages</button>}

      {messages.map((m, i) => (
        <p key={i}><b>{m.sender.username}</b>: {m.content}</p>
      ))}
    </div>
  );
}

