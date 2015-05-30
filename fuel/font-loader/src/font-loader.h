/*

Font Loader v2.0.1
On-demand loading of fonts from resources.
http://smallstoneapps.github.io/font-loader/

----------------------

The MIT License (MIT)

Copyright © 2014 Matthew Tole

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

--------------------

src/font-loader.h

*/

#pragma once

#include <pebble.h>

// Initialise the font loading library.
void fonts_init(void);

// Assign a string name to a font resource ID.
void fonts_assign(const char* name, const uint32_t res_id);

// Returns the font as specified by a resource ID.
// If the font has not been requested before, it will be loaded.
GFont fonts_get_font(const uint32_t res_id);

// Returns the font as specified by the name you assigned.
// If the font has not been requested before, it will be loaded.
GFont fonts_get_font_by_name(const char* name);

// Unload all the fonts from memory.
void fonts_cleanup(void);
