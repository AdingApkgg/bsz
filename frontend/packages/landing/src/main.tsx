/* @refresh reload */
import { render } from "solid-js/web";
import App from "./app";
import "./app.css";

const root = document.getElementById("app");
if (!root) throw new Error("#app root not found");
render(() => <App />, root);
