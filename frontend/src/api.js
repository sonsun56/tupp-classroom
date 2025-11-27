import axios from "axios";

const api = axios.create({
  baseURL: "https://tupp-classroom.onrender.com",  // Backend URL จาก Render
});

export default api;
