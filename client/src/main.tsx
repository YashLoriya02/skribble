import ReactDOM from "react-dom/client";
import {BrowserRouter} from "react-router-dom";
import App from "./App";
import "./index.css";
import {SFX} from "./audio/sound.ts";

SFX.init();

window.addEventListener(
    "pointerdown",
    () => {
        SFX.unlock();
    },
    {once: true}
);


ReactDOM.createRoot(document.getElementById("root")!).render(
    // <React.StrictMode>
        <BrowserRouter>
            <App/>
        </BrowserRouter>
    // </React.StrictMode>
);
