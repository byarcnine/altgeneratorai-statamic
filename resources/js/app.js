import App from "./App.vue";
import "../css/main.css";

Statamic.booting(() => {
    Statamic.$components.register("aialtgen", App);
});
