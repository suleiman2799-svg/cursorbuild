import React from "react";
import ReactDOM from "react-dom/client";
import { CursorBuildProvider } from "@cursorbuild/react";
import App from "./App";
import "./style.css";
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><CursorBuildProvider><App /></CursorBuildProvider></React.StrictMode>);