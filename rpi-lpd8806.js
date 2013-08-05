(function(){
	"use strict";
	
	var color = require('onecolor'),
	fs = require('fs'),
	range = require('./utils').range;
	
	
	
	/**
	 * TODO: Edit for nodejs LPD8806.py: Raspberry Pi library for LPD8806 based RGB
	 * light strips Initial code from: https://github.com/Sh4d/LPD8806
	 * 
	 * Provides the ability to drive a LPD8806 based strand of RGB leds from the
	 * Raspberry Pi
	 * 
	 * Colors are provided as RGB and converted internally to the strip's 7 bit
	 * values.
	 * 
	 * 
	 * Wiring: Pi MOSI -> Strand DI Pi SCLK -> Strand CI
	 * 
	 * Most strips use around 10W per meter (for ~32 LEDs/m) or 2A at 5V. The
	 * Raspberry Pi cannot even come close to this so a larger power supply is
	 * required, however, due to voltage loss along long runs you will need to put
	 * in a new power supply at least every 5 meters. Technically you can power the
	 * Raspberry Pi through the GPIO pins and use the same supply as the strips, but
	 * I would recommend just using the USB power as it's a much safer option.
	 * 
	 * Also, while it *should* work without it to be safe you should add a level
	 * converter between the Raspberry Pi and the strip's data lines. This will also
	 * help you have longer runs.
	 * 
	 * Example: 
	 * >> import LPD8806 
	 * >> led = LPD8806.LEDStrip() 
	 * >> led.fill(255, 0, 0)
	 */
	
// Not all LPD8806 strands are created equal.
// Some, like Adafruit's use GRB order and the other common order is GRB
// Library defaults to GRB but you can call strand.setChannelOrder(ChannelOrder)
// to set the order your strands use
	var ChannelOrder = {
			"RGB" : [0,1,2], // Probably not used, here for clarity
			"GRB" : [1,0,2], // Strands from Adafruit and some others (default)
			"BRG" : [1,2,0]  // Strands from many other manufacturers
	};
	
// Main color object used by all methods
	function Color(r, g, b, bright){
		
		// TODO: see if onecolor can completely replace self.
		
		var self = this;
		
		if (!r) { r = 0;}
		if (!g) { g = 0;}
		if (!b) { b = 0;}
		if (!bright) {bright = 1;}
		
		// Initialize Color object with option of passing RGB values and brightness
		function init(){
			if(r > 255.0 || r < 0.0 || g > 255.0 || g < 0.0 || b > 255.0 || b < 0.0){
				throw 'RGB values must be between 0 and 255';
			}
			if(bright > 1.0 || bright < 0.0){
				throw "Brightness must be between 0 and 1";
			}
			
			self.R = r*bright;
			self.G = g*bright;
			self.B = b*bright;
			
		}
		
		// gets ColorHSV object
		self.getColorHSV = function(){
			var _c = new color.RGB(self.R/255, self.G/255, self.B/255).hsv();
			return new ColorHSV(_c.hue()*360, _c.saturation(), _c.value());
		};
		
		self.toString = function(){
			return 'RGB:'+self.R+','+self.G+','+self.B;
		};
		
		init();
	}
	
// useful for natural color transitions. Increment hue to sweep through the
// colors
// must call getColorRGB() before passing to any of the methods
	function ColorHSV(h,s,v){
		var self = this;
		if (!h) { h = 360; }
		if (!s) { s = 1; }
		if (!v) { v = 1; }
		
		function init(){
			if(h > 360 || h < 0){
				throw 'Hue value must be between 0.0 and 360.0';
			}
			if(s > 1.0 || s < 0.0){
				throw 'Saturation must be between 0.0 and 1.0';
			}
			if(v > 1.0 || v < 0.0){
				throw 'Value must be between 0.0 and 1.0';
			}
			
			self.H = h;
			self.S = s;
			self.V = v;
		}
		
		// gets Color object (RGB)
		self.getColorRGB  = function(){
			var _c = new color.HSV(self.H/360, self.S, self.V).rgb();
			return new Color(_c.red() * 255, _c.green() * 255, _c.blue() * 255);
		};
		
		self.toString = function(){
			return 'HSV:'+self.H+','+self.S+','+self.V;
		};
		
		init();
	}
	
	
	function LEDStrip(leds, dev){
		var self = this;
		
		if (!leds){
			throw "Number of LEDs must pe specified";
		}
		
		if (!dev){
			dev = "/dev/spidev0.0";
		}
		
		function init(){
			// Variables:
			// leds -- strand size
			// dev -- spi device
			self.c_order = ChannelOrder.GRB;
			self.dev = dev;
			self.spi = fs.createWriteStream(self.dev);
			self.leds = leds;
			self.lastIndex = self.leds - 1;
			self.gamma = new Buffer(256);
			self.buffer = [];
			range( self.leds + 1).forEach(function(x){
				self.buffer[x] = 0;
			});			
			self.masterBrightness = 1.0;
			
			//anim step vars
			self.rainbowStep = 0;
			self.rainbowCycleStep = 0;
			self.wipeStep = 0;
			self.chaseStep = 0;
			self.larsonStep = 0;
			self.larsonDir = -1;
			self.larsonLast = 0;
			self.waveStep = 0;
			
			range(self.leds).forEach(function(led){
				self.buffer[led] = new Buffer(3);
			});
			range(256).forEach(function(i){
				self.gamma[i] = 0x80 | Math.floor( Math.pow(i/255, 2.5) * 127 + 0.5);
			});
		}
		
		//Allows for easily using LED strands with different channel orders
		self.setChannelOrder = function(order){
			self.c_order = order;
		};
		
		//Set the master brightness for the LEDs 0.0 - 1.0
		self.setMasterBrightness = function(bright){
			if(bright > 1.0 || bright < 0.0){
				throw 'Brightness must be between 0.0 and 1.0';
			}
			self.masterBrightness = bright;
		};
		
		
		//Push new data to strand
		self.update = function(){
			var _buffer = [];
			range(self.leds).forEach(function(x){
				_buffer.push(self.buffer[x]);
				//self.spi.write(self.buffer[x]);
				//self.spi.flush();
			});
			_buffer.push(new Buffer('\x00\x00\x00'));
			_buffer.push(new Buffer('\x00'));
			self.spi.write(Buffer.concat(_buffer, self.leds * 3 + 4));
			//self.spi.write(new Buffer('\x00\x00\x00')); //zero fill the last to prevent stray colors at the end
			//self.spi.write(new Buffer('\x00'));
			//self.spi.flush();
		};
		
		//Fill the strand (or a subset) with a single color using a Color object
		self.fill = function(color, start, end){
			if (start === undefined){start = 0;}
			if (end === undefined){end = 0;}
			if (start < 0){
				start = 0;
			}
			if (end === 0 || end > self.lastIndex){
				end = self.lastIndex;
			}
			range(start,end+1).forEach(function(led){
				self.__set_internal(led, color);
			});
		};
		
		//Fill the strand (or a subset) with a single color using RGB values
		self.fillRGB = function(r, g, b, start, end){
			if (start === undefined){start = 0;}
			if (end === undefined){end = 0;}
			self.fill( new Color(r, g, b), start, end);
		};
		
		//Fill the strand (or a subset) with a single color using HSV values
		self.fillHSV = function(h, s, v, start, end){
			if (start === undefined){start = 0;}
			if (end === undefined){end = 0;}
			self.fill(new ColorHSV(h, s, v).getColorRGB(), start, end);
		};
		
		//Fill the strand (or a subset) with a single color using a Hue value. 
		//Saturation and Value components of HSV are set to max.
		self.fillHue = function(hue, start, end){
			if (start === undefined){start = 0;}
			if (end === undefined){end = 0;}
			self.fill(new ColorHSV(hue).getColorRGB(), start, end);
		};
		
		self.fillOff = function(start, end){
			if (start === undefined){start = 0;}
			if (end === undefined){end = 0;}
			self.fillRGB(0, 0, 0, start, end);
		};
		
		//internal use only. sets pixel color
		self.__set_internal = function(pixel, color){
			if(pixel < 0 || pixel > self.lastIndex){
				return; //don't go out of bounds
			}
			self.buffer[pixel][self.c_order[0]] = self.gamma[Math.floor(color.R * self.masterBrightness)];
			self.buffer[pixel][self.c_order[1]] = self.gamma[Math.floor(color.G * self.masterBrightness)];
			self.buffer[pixel][self.c_order[2]] = self.gamma[Math.floor(color.B * self.masterBrightness)];
		};
		
		//Set single pixel to Color value
		self.set = function(pixel, color){
			self.__set_internal(pixel, color);
		};
		
		//Set single pixel to RGB value
		self.setRGB = function(pixel, r, g, b){
			var color = new Color(r, g, b);
			self.set(pixel, color);
		};
		
		//Set single pixel to HSV value
		self.setHSV = function(pixel, h, s, v){
			self.set(pixel,new ColorHSV(h, s, v).getColorRGB());
		};
		
		//Set single pixel to Hue value.
		//Saturation and Value components of HSV are set to max.
		self.setHue= function(pixel, hue){
			self.set(pixel,new ColorHSV(hue).getColorRGB());
		};
		
		//turns off the desired pixel
		self.setOff = function(pixel){
			self.setRGB(pixel, 0, 0, 0);
		};
		
		//Turn all LEDs off.
		self.all_off = function(){
			self.fillOff();
			self.update();
			self.fillOff();
			self.update();
		};
		
		//Get color from wheel value (0 - 384)
		self.wheel_color = function(wheelpos){
			var r,g,b,color;
			if (wheelpos < 0){
				wheelpos = 0;
			}
			if (wheelpos > 384){
				wheelpos = 384;
			}
			
			if (wheelpos < 128){
				r = 127 - wheelpos % 128;
				g = wheelpos % 128;
				b = 0;
			} else if (wheelpos < 256){
				g = 127 - wheelpos % 128;
				b = wheelpos % 128;
				r = 0;
			} else {
				b = 127 - wheelpos % 128;
				r = wheelpos % 128;
				g = 0;
			}
			color = new Color(r, g, b);
			return color;
		};
		
		//generate rainbow
		self.anim_rainbow = function(start, end){
			var size, color, c;
			if (start === undefined){start = 0;}
			if (end === undefined){end = 0;}
			if (end === 0 || end > self.lastIndex){
				end = self.lastIndex;
			}
			size = end - start + 1;
			
			range(size).forEach(function(i){
				color = (i + self.rainbowStep) % 384;
				c = self.wheel_color(color);
				self.set(start + i, c);
			});
			self.rainbowStep += 1;
			if (self.rainbowStep > 384){
				self.rainbowStep = 0;
			}
		};
		
		//Generate rainbow wheel equally distributed over strip
		self.anim_rainbow_cycle = function(start, end){
			var size, color, c;
			if (start === undefined){start = 0;}
			if (end === undefined){end = 0;}
			if (end === 0 || end > self.lastIndex){
				end = self.lastIndex;
			}
			size = end - start + 1;
			range(size).forEach(function(i){
				color = (i * (384 / size) + self.rainbowCycleStep) % 384;
				c = self.wheel_color(color);
				self.set(start + i, c);
			});
			self.rainbowCycleStep += 1;
			if (self.rainbowCycleStep > 384){
				self.rainbowCycleStep = 0;
			}
		};
		
		//fill the dots progressively along the strip
		self.anim_color_wipe = function(color, start, end){
			if (start === undefined){start = 0;}
			if (end === undefined){end = 0;}
			if (end === 0 || end > self.lastIndex){
				end = self.lastIndex;
			}
			if(self.wipeStep === 0){
				self.fillOff();
			}
			self.set(start + self.wipeStep, color);
			self.wipeStep += 1;
			if (start + self.wipeStep > end){
				self.wipeStep = 0;
			}
		};
		
		//chase one pixel down the strip
		self.anim_color_chase = function(color, start, end){
			if (start === undefined){start = 0;}
			if (end === undefined){end = 0;}
			if (end === 0 || end > self.lastIndex){
				end = self.lastIndex;
			}
			if(self.chaseStep === 0){
				self.setOff(end);
			} else {
				self.setOff(start + self.chaseStep - 1);
			}
			self.set(start + self.chaseStep, color);
			self.chaseStep += 1;
			if (start + self.chaseStep > end){
				self.chaseStep = 0;
			}
		};
		
		//larson scanner (i.e. Cylon Eye or K.I.T.T.)
		self.anim_larson_scanner = function(color, tail, fade, start, end){
			var size, c, level, tl, tr;
			if (start === undefined){start = 0;}
			if (end === undefined){end = 0;}
			if (tail === undefined){tail = 2;}
			if (fade === undefined){fade = 0.75;}
			if (end === 0 || end > self.lastIndex){
				end = self.lastIndex;
			}
			size = end - start + 1;
			tail += 1; //makes tail math later easier
			if (tail >= size / 2){
				tail = (size / 2) - 1;
			}
			self.larsonLast = start + self.larsonStep;
			self.set(self.larsonLast, color);
			tl = tail;
			if(self.larsonLast + tl > end){
				tl = end - self.larsonLast;
			}
			tr = tail;
			if(self.larsonLast - tr < start){
				tr = self.larsonLast - start;
			}
			
			range(1,tl+1).forEach(function(l){
				level = ( (tail - l) / tail ) * fade;
				self.setRGB(self.larsonLast + l, color.R * level, color.G * level, color.B * level);
			});
			
			if(self.larsonLast + tl + 1 <= end){
				self.setOff(self.larsonLast + tl + 1);
			}
			
			range(1,tr+1).forEach(function(r){
				level = ( (tail - r) / tail ) * fade;
				self.setRGB(self.larsonLast - r, color.R * level, color.G * level, color.B * level);
			});
			if(self.larsonLast - tr - 1 >= start){
				self.setOff(self.larsonLast - tr - 1);
			}
			
			if (start + self.larsonStep == end){
				self.larsonDir = -self.larsonDir;
			}else if (self.larsonStep === 0){
				self.larsonDir = -self.larsonDir;
			}
			
			self.larsonStep += self.larsonDir;
		};
		
		
		//larson scanner (i.e. Cylon Eye or K.I.T.T.) but Rainbow
		self.anim_larson_rainbow = function(tail, fade, start, end){
			var size, hue;
			if (start === undefined){start = 0;}
			if (end === undefined){end = 0;}
			if (tail === undefined){tail = 2;}
			if (fade === undefined){fade = 0.75;}
			if (end === 0 || end > self.lastIndex){
				end = self.lastIndex;
			}
			size = end - start + 1;
			
			hue = (self.larsonStep * (360 / size));
			self.anim_larson_scanner(new ColorHSV(hue).getColorRGB(), tail, fade, start, end);
		};
		
		
		//Sine wave animation
		self.anim_wave = function(color, cycles, start, end){
			var size,c2,y;
			if (start === undefined){start = 0;}
			if (end === undefined){end = 0;}
			if (end === 0 || end > self.lastIndex){
				end = self.lastIndex;
			}
			size = end - start + 1;
			c2 = new Color();
			
			range(size).forEach(function(i){
				y = Math.sin(Math.PI * cycles * self.waveStep * i / size);
				if(y >= 0.0){
					//Peaks of sine wave are white
					y = 1.0 - y; //Translate Y to 0.0 (top) to 1.0 (center)
					c2 = new Color(255 - (255 - color.R) * y, 255 - (255 - color.G) * y, 255 - (255 - color.B) * y);
				} else {
					//Troughs of sine wave are black
					y += 1.0; //Translate Y to 0.0 (bottom) to 1.0 (center)
					c2 = new Color( color.R * y, color.G * y, color.B * y);
				}
				self.set(start + i, c2);
			});
			self.waveStep += 1;
		};
		
		init();
	}
	exports.Color = Color;
	exports.ColorHSV = ColorHSV;
	exports.LEDStrip = LEDStrip;
})();
	