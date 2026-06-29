export { keys } from "./query-keys.js";
export function cn(...classes) {
    return classes.filter(Boolean).join(" ");
}
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
export function slugify(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-");
}
//# sourceMappingURL=index.js.map