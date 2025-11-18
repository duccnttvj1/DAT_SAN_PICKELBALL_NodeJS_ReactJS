// Chatbot.js
import React, { useState } from "react";
import axios from "axios";
import { Container, Form, Button, Card, Spinner } from "react-bootstrap";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "../styles/Chatbot.css";

function Chatbot() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:3001/api/chat", {
        message: input,
      });

      const botMsg = { role: "assistant", content: res.data.reply };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errMsg = {
        role: "assistant",
        content: "Xin lỗi, AI đang bận. Vui lòng thử lại sau!",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  return (
    <Container className="mt-4 chatbot-container">
      <Card className="chatbot-card">
        <Card.Header className="chatbot-header">
          <h5>Chat với PickelBot</h5>
        </Card.Header>
        <Card.Body className="chatbot-body">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`message-wrapper ${
                msg.role === "user" ? "user-message" : "ai-message"
              }`}
            >
              <div className="message-bubble">
                <small className="sender-label">
                  {msg.role === "user" ? "Bạn" : "AI Pickleball"}
                </small>
                {msg.role === "assistant" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <span>{msg.content}</span>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message-wrapper ai-message">
              <div className="message-bubble">
                <Spinner animation="grow" size="sm" /> Đang suy nghĩ...
              </div>
            </div>
          )}
        </Card.Body>
        <Card.Footer className="chatbot-footer">
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="input-formWrapper"
          >
            <Form.Control
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hỏi gì đó..."
              disabled={loading}
              className="chat-input"
            />
            <Button type="submit" disabled={loading} className="send-button">
              Gửi
            </Button>
          </Form>
        </Card.Footer>
      </Card>
    </Container>
  );
}

export default Chatbot;
