(function(){
	'use strict';
    var Color = require('./rpi-lpd8806').Color, 
        ColorHSV = require('./rpi-lpd8806').colorHSV,
        LEDStrip = require('./rpi-lpd8806').LEDStrip,
        range = require('./utils').range;
    
    var num = 32; //change this to match number of LEDs on your strip
    var led = new LEDStrip(num);
    
    led.all_off();
    var colors = [ 
        {r:255,g:0,b:0},
        {r:0,g:255,b:0},
        {r:0,g:0,b:255},
        {r:255,b:255,g:255}
    ];
    
    //TODO: me no like callback! me smash!!!!
    
    //fading
    function fadeAnim(cb){
        var c = 0, r, g, b, step = 0.01, level = 0.01, dir = step;
        function frame(){
           r = colors[c].r;
           g = colors[c].g; 
           b = colors[c].b;
           
           if (level > 0.0){
               led.fill(new Color(r,g,b,level));
               led.update();
               if (level >= 0.99){
                   dir = -step;
               }
               level += dir;
               setTimeout(frame,5);
           } else {
               c++;
               level = 0.01;
               dir = step;
               if (c == 4){
                   cb();
               }
           }
           frame();
        }
        
    }
	
})();