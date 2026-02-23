const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

let clients = {};

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "register") {
      clients[data.userId] = ws;
      console.log("Registered:", data.userId);
    }

    if (data.type === "vibrate") {
      const target = clients[data.to];
      if (target) {
        target.send(JSON.stringify({
          type: "vibrate",
          pattern: data.pattern
        }));
      }
    }
  });

  ws.on("close", () => {
    for (let id in clients) {
      if (clients[id] === ws) {
        delete clients[id];
      }
    }
  });
});

console.log("WebSocket running...");
