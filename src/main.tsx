import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { bootstrapNative } from "./lib/capacitorBootstrap";
import { initTheme } from "./lib/theme";

initTheme();
createRoot(document.getElementById("root")!).render(<App />);
void bootstrapNative();
