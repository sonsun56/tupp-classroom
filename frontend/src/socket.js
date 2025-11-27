// frontend/src/socket.js
import { io } from "socket.io-client";
import api from "./api";

const socket = io(api.defaults.baseURL || "http://localhost:4000", {
  withCredentials: false,
});

export default socket;
