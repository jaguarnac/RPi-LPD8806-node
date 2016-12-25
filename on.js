(function(){
    'use strict';
    var LEDStrip = require('./rpi-lpd8806').LEDStrip;
    var Color = require('./rpi-lpd8806').Color;

    var led = new LEDStrip(32);
    led.fill(new Color(160,32,240,1));
    led.update();
})();
