export function mod(x: number, m: number): number {
    return ((x % m) + m) % m;
}

export function intMod(x: number, m: number): number {
    return mod(x, m);
}

export function clamp(x: number, min: number, max: number): number {
    if (x < min) x = min;
    if (x > max) x = max;
    return x;
}
