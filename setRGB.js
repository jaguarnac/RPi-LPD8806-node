(function(){
    'use strict';
    var LEDStrip = require('./rpi-lpd8806').LEDStrip;
    var Color = require('./rpi-lpd8806').Color;

    var args = process.argv.slice(2);

    var r  = args[0];
    var g  = args[1];
    var b  = args[2];
    var l  = args[3];

    if (!r || Number.isNaN(r)  || r < 0){ r = 0; }
    if (!g || Number.isNaN(g)  || g < 0){ g = 0; }
    if (!b || Number.isNaN(b)  || b < 0){ b = 0; }
    if (!l || Number.isNaN(l)  || l < 0){ l = 1; }

    if ( r > 255){ r = 255; }
    if ( g > 255){ g = 255; }
    if ( b > 255){ b = 255; }
    if (l > 1){ l = 0; }

    var led = new LEDStrip(32);
    led.fill(new Color(r,g,b,l));
    led.update();
})();
