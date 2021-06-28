export let mod: Function;

export async function initUtil() {
    const res = await fetch('wasm/cutil.wasm');
    const bytes = await res.arrayBuffer();
    const results = await WebAssembly.instantiate(bytes);
    mod = results.instance.exports.mod as Function;
}
