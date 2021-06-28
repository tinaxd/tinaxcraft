export let mod: Function;
export let intMod: Function;

export async function initUtil() {
    const res = await fetch('wasm/cutil.wasm');
    const bytes = await res.arrayBuffer();
    const results = await WebAssembly.instantiate(bytes);
    mod = results.instance.exports.mod as Function;
    intMod = results.instance.exports.int_mod as Function;
}
