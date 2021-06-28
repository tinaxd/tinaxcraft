#include <emscripten.h>

#include <math.h>

EMSCRIPTEN_KEEPALIVE
double mod(double x, double m) {
    double result = fmod(x, m);
    if (result < 0) result += m;
    return result;
}

EMSCRIPTEN_KEEPALIVE
int int_mod(int x, int m) {
    return ((x % m) + m) % m;
}
