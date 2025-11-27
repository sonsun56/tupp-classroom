import axios from "axios";

const api = axios.create({
  baseURL: "https://tupp-classroom.onrender.com",
});

export default api;
