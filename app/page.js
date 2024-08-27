"use client";

import { useState } from "react";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from "@mui/material";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Add the user's message to the chat history
      const newMessage = { role: "user", content: query };
      const updatedMessages = [...messages, newMessage];

      // Send the chat history to the backend
      const res = await fetch("/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: updatedMessages,
        }),
      });

      const data = await res.json();

      // Add the assistant's response to the chat history and process the response
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: processResponse(data.message) },
      ]);
      setQuery(""); // Clear the input field
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]); // Clear the chat history
    setQuery(""); // Clear the input field
  };

  // Function to process the response text into structured components
  const processResponse = (text) => {
    const lines = text.split("\n").filter((line) => line.trim() !== ""); // Split by newlines and remove empty lines
    const elements = [];

    lines.forEach((line, index) => {
      // Detect lists by checking if the line starts with a bullet point or a number
      if (line.trim().startsWith("*")) {
        elements.push(
          <ListItem key={index}>
            <ListItemText primary={line.trim().substring(1).trim()} />
          </ListItem>
        );
      } else if (/^\d+\./.test(line.trim())) {
        elements.push(
          <ListItem key={index}>
            <ListItemText primary={line.trim()} />
          </ListItem>
        );
      } else {
        // Otherwise, treat it as a paragraph
        elements.push(
          <Typography key={index} variant="body1" paragraph>
            {line.trim()}
          </Typography>
        );
      }
    });

    return <List>{elements}</List>;
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      <Typography variant="h4" gutterBottom>
        Rate My Professor Chat
      </Typography>

      <Paper
        variant="outlined"
        sx={{ p: 2, height: "400px", overflowY: "auto" }}
      >
        <List>
          {messages.map((message, index) => (
            <ListItem key={index} alignItems="flex-start">
              <ListItemText
                primary={message.role === "user" ? "You" : "Assistant"}
                secondary={
                  typeof message.content === "string"
                    ? message.content
                    : message.content
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          mt: 2,
        }}
      >
        <TextField
          label="Type your message"
          variant="outlined"
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
        />

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading || !query}
            fullWidth
          >
            {loading ? <CircularProgress size={24} /> : "Send"}
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            onClick={handleNewChat}
            disabled={loading}
            fullWidth
          >
            New Chat
          </Button>
        </Box>
      </Box>

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
    </Container>
  );
}
