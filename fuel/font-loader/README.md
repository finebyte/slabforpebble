# Font Loader [![Build Status](http://img.shields.io/travis/smallstoneapps/font-loader.svg?style=flat-square)](https://travis-ci.org/smallstoneapps/font-loader/)&nbsp;![Version 2.1](http://img.shields.io/badge/version-2.0.1-orange.svg?style=flat-square)&nbsp;[![MIT License](http://img.shields.io/badge/license-MIT-lightgray.svg?style=flat-square)](./LICENSE)&nbsp;[![Support my development](http://img.shields.io/gittip/matthewtole.svg?style=flat-square)](https://www.gittip.com/matthewtole/)


Pebble library to do lazy loading of fonts from resources.



## What does it do?

Font Loader will automatically load fonts when they are needed, rather than having to handle the loading of them yourself.

It also allows you to create string aliases for the fonts, so you don't have to refer to them by their resource ID which will change if you alter the font size.

## Usage

````c
// This is not a complete example, but should demonstrate the basic usage of Font Loader.

static void init(void) {
  fonts_init();
  fonts_assign("example_font", RESOURCE_ID_FONT_EXAMPLE_24);
}

static void deiinit(void) {
  fonts_cleanup();
}

static void window_load(Window* window) {
  text_layer_set_font(text_layer, fonts_get_font(RESOURCE_ID_FONT_EXAMPLE_32));
  GFont font = fonts_get_font_by_name("example font");
}
````

**You can also look at the [demo app](/demo/src/app.c) to see the library in action.**

## Tests

Font Loader has *very* minimal (and currently broken) tests, that you can run using `./run-tests.sh`.

## Function Documentation

Initialise the Font Loader library.

````c
void fonts_init(void);
````

Assign a string name to a font resource ID.

````c
bool fonts_assign(char* name, uint32_t res_id);
````

Returns the font as specified by a resource ID.
If the font has not been requested before, it will be loaded.
````c
GFont fonts_get_font(uint32_t res_id);
````

Returns the font as specified by the name you assigned.
If the font has not been requested before, it will be loaded.
````c
GFont fonts_get_font_by_name(char* name);
````

Unload all the fonts from memory.
````c
void fonts_cleanup(void);
````
