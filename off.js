(function(){
    'use strict';
    var LEDStrip = require('./rpi-lpd8806').LEDStrip;
    var led = new LEDStrip(32);
    led.all_off();
})();
