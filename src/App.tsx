import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import SlotPage from "./pages/Slot";
import "./App.css";

function App() {
  return <SlotPage />;
}

export default App;
