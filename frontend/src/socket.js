// src/socket.js
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL;

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  withCredentials: false,
  autoConnect: true,
});

export default socket;
