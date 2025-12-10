import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SlotPage from "./pages/Slot";
import "./App.css";
import Login from "./pages/login/Login";
import Home from "./pages/Home";
import CreateUser from "./pages/login/CreateUser";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/create-user" element={<CreateUser />} />
        <Route path="/home" element={<SlotPage />} />
      </Routes>
    </BrowserRouter>
  );
}


export default App;
