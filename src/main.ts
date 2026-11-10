import "./style.css";
import { initApp } from "./ui/app";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Root element #app not found");
}

const query = new URLSearchParams(location.search);
if (query.get("qa") === "1" && query.get("art") === "1") {
  void import("./ui/character-review").then(({ initCharacterReview }) => initCharacterReview(root));
} else initApp(root);
