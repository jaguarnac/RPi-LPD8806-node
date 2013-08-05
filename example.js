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
    
    /**
     * A kinda hacky utility to play animations in sequense
     */
    function animSequense(anims){
        var anim, current;
        if (!anims || !Array.isArray(anims)){
            return false;
        }
        if (anims.length === 0){
            return false;
        }
        
        function next(){
            if ('undefined' === typeof current){
                current = 0;
            } else {
                current ++;
            }
            if (current < anims.length){
                anim = anims[current];
                if (anim && 'function' == typeof anim){
                    anim(next);
                } else {
                    next();
                }
            } else {
                return false;
            }
        }
        next();
        
    }
    
    //Animation creator
    function create_anim(strip, data, fnFrame, timeout, name){
        var ended = false,_e,fnEnd;
        
        function end(){
            strip.all_off();
            ended = true;
            if (fnEnd && 'function' === typeof fnEnd ){
                fnEnd();
            }
        }
        
        function frame(){
            strip.update();
            if (fnFrame && 'function' === typeof fnFrame ){
                _e = fnFrame(strip,data);
                if ( _e === false ){
                    end();
                }
            } else {
                end();
            }
            if (!ended){
                setTimeout(frame,timeout);
            }
        }
        
        function start(cb){
            if (name){
                console.log("Starting animation: " + name);
            }
            fnEnd = cb;
            strip.all_off();
            frame();
        }
        
        return start;
    }
    
    //fading
    var fadeAnim = create_anim( 
            led,
            {
                'c' : 0,
                'step' : 0.01,
                'level' : 0.01,
                'dir' : 0.01
            },
            function frame(strip, data){
                var r = colors[data.c].r,
                g = colors[data.c].g,
                b = colors[data.c].b;
                
                if (data.level > 0.0){
                    strip.fill(new Color(r,g,b,data.level));
                    if (data.level >= 0.99){
                        data.dir = - data.step;
                    }
                    data.level += data.dir;
                } else {
                    data.c++;
                    data.level = 0.01;
                    data.dir = data.step;
                    if (data.c == 4){
                        return false;
                    }
                }
            },
            50,
            'fade'
    );
    
    var sine_1 = create_anim(
            led,
            {
                'i': 0,
                'color': new Color(255,0,0)
            },
            function(strip, data){
                strip.anim_wave(data.color,4);
                data.i++;
                if (data.i >= strip.lastIndex){
                    return false;
                }
            },
            150,
            'sine-1'
    );
    
    var sine_2 = create_anim(
            led,
            {
                'i': 0,
                'color': new Color(0,0,100)
            },
            function(strip, data){
                strip.anim_wave(data.color,4);
                data.i++;
                if (data.i >= strip.lastIndex){
                    return false;
                }
            },
            150,
            'sine-2'
    );
    
    //rolling rainbow
    var rainbow = create_anim(
            led, 
            { 'i':0 },
            function(strip, data){
                strip.anim_rainbow();
                data.i++;
                if (data.i > 384){
                    return false;
                }
            },
            10,
            'rainbow'
    );
    
    //evenly distributed rainbow
    var rolling_rainbow = create_anim(
            led, 
            { 'i':0 },
            function(strip, data){
                strip.anim_rainbow_cycle();
                data.i++;
                if (data.i > 384 *2){
                    return false;
                }
            },
            10,
            'rolling rainbow'
    );
    
    //wipe
    var wipe = create_anim( 
            led,
            {
                'c' : 0,
                'i' : 0
            },
            function frame(strip, data){
                var c = new Color(colors[data.c].r, colors[data.c].g, colors[data.c].b);
                if (data.i <= strip.lastIndex){
                    strip.anim_color_wipe(c);
                    data.i++;
                } else {
                    data.c++;
                    data.i = 0;
                    if (data.c == 4){
                        return false;
                    }
                }
            },
            30,
            'wipe'
    );
    
    //chase
    var chase = create_anim( 
            led,
            {
                'c' : 0,
                'i': 0
            },
            function frame(strip, data){
                var c = new Color(colors[data.c].r, colors[data.c].g, colors[data.c].b);
                if (data.i <= strip.lastIndex){
                    strip.anim_color_chase(c);
                    data.i++;
                } else {
                    data.c++;
                    data.i = 0;
                    if (data.c == 4){
                        return false;
                    }
                }
            },
            30,
            'chase'
    );
    
    //scanner: single color and changing color
    var scanner_red = create_anim(
            led,
            {
                'color': new Color(255, 0, 0),
                'i': 0
            }, function(strip, data){
                strip.anim_larson_scanner(data.color);
                data.i++;
                if (data.i >= strip.lastIndex *4){
                    return false;
                }
            },
            30,
            'K.I.T.T.'
    );
    
    var scanner_rainbow = create_anim(
            led,
            {
                'i': 0
            }, function(strip, data){
                strip.anim_larson_rainbow(2, 0.5);
                data.i++;
                if (data.i >= strip.lastIndex *4){
                    return false;
                }
            },
            30,
            'Rainbow Scanner'
    );
        

        

    
    animSequense([fadeAnim, 
                  sine_1, 
                  sine_2, 
                  rainbow, 
                  rolling_rainbow,
                  wipe,
                  chase,
                  scanner_red,
                  scanner_rainbow
                  ]);
	
})();
