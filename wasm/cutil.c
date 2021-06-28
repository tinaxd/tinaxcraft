#include <emscripten.h>

#include <math.h>

EMSCRIPTEN_KEEPALIVE
double mod(double x, double m) {
    double result = fmod(x, m);
    if (result < 0) result += m;
    return result;
}
