const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// Only 2 slots: sender and receiver
let clients = {
  sender: null,
  receiver: null
};

wss.on("connection", (ws) => {
  console.log("New connection");

  ws.on("message", (message) => {
    let data;
    try { data = JSON.parse(message); }
    catch(e) { return; }

    // --- REGISTER ---
    if (data.type === "register") {
      const role = data.role; // "sender" or "receiver"
      if (role !== "sender" && role !== "receiver") return;

      clients[role] = ws;
      ws.role = role;
      console.log(`Registered: ${role}`);
      console.log(`Active clients: sender=${!!clients.sender} receiver=${!!clients.receiver}`);

      // Tell this client their registration was acknowledged
      ws.send(JSON.stringify({ type: "registered", role }));

      // If both are now connected, notify both
      if (clients.sender && clients.receiver) {
        clients.sender.send(JSON.stringify({ type: "paired" }));
        clients.receiver.send(JSON.stringify({ type: "paired" }));
        console.log("Both paired!");
      }
    }

    // --- VIBRATE (sender -> receiver) ---
    if (data.type === "vibrate") {
      if (clients.receiver && clients.receiver.readyState === WebSocket.OPEN) {
        clients.receiver.send(JSON.stringify({
          type: "vibrate",
          pattern: data.pattern
        }));
      }
    }

    // --- WAVE (both directions) ---
    if (data.type === "wave") {
      const target = ws.role === "sender" ? clients.receiver : clients.sender;
      if (target && target.readyState === WebSocket.OPEN) {
        target.send(JSON.stringify({ type: "wave", from: data.from }));
      }
    }
  });

  ws.on("close", () => {
    const role = ws.role;
    if (role && clients[role] === ws) {
      clients[role] = null;
      console.log(`Disconnected: ${role}`);

      // Notify the other side that peer left
      const other = role === "sender" ? clients.receiver : clients.sender;
      if (other && other.readyState === WebSocket.OPEN) {
        other.send(JSON.stringify({ type: "peer_left" }));
      }
    }
  });

  ws.on("error", (err) => {
    console.error("WS error:", err.message);
  });
});

console.log(`WebSocket server running on port ${PORT}`);
