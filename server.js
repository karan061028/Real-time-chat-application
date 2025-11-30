const http = require("http");
const express = require("express");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const users = {}; // { socketId: { name, color } }
const colors = ["#ff595e","#ffca3a","#8ac926","#1982c4","#6a4c93"];

function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
}

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("new-user", (username) => {
        const color = getRandomColor();
        users[socket.id] = { name: username, color };
        io.emit("online-users", users);
        socket.broadcast.emit("message", `${username} joined the chat`);
    });

    socket.on("user-messages", (data) => {
        const timestamp = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
        io.emit("message", { user: data.user, text: data.text, color: users[socket.id].color, time: timestamp });
    });

    socket.on("typing", (isTyping) => {
        socket.broadcast.emit("typing", { name: users[socket.id]?.name, typing: isTyping });
    });

    socket.on("private-message", ({ toId, text }) => {
        const timestamp = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
        io.to(toId).emit("message", {
            user: users[socket.id].name,
            text,
            color: users[socket.id].color,
            time: timestamp,
            private: true
        });
    });

    socket.on("disconnect", () => {
        const user = users[socket.id];
        if(user){
            io.emit("message", `${user.name} left the chat`);
            delete users[socket.id];
            io.emit("online-users", users);
        }
    });
});

app.use(express.static(path.resolve("public")));
app.get("/", (req,res)=> res.sendFile(path.join(__dirname,"public","index.html")));

const PORT = 7000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
