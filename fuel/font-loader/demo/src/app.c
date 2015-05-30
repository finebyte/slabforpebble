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

demo/src/app.c

*/

#include <pebble.h>
#include "../../src/font-loader.h"

static void init(void);
static void deinit(void);
static void window_load(Window *window);
static void window_unload(Window *window);
static void click_config_provider(void *context);
static void select_click_handler(ClickRecognizerRef recognizer, void *context);
static void up_click_handler(ClickRecognizerRef recognizer, void *context);
static void down_click_handler(ClickRecognizerRef recognizer, void *context);

static Window* window;
static TextLayer* text_layer;

int main(void) {
  init();
  app_event_loop();
  deinit();
}

static void init(void) {
  fonts_init();
  fonts_assign("up font", RESOURCE_ID_FONT_DEMO_ALPHA_24);
  fonts_assign("select font", RESOURCE_ID_FONT_DEMO_BETA_24);
  fonts_assign("down font", RESOURCE_ID_FONT_DEMO_GAMMA_24);

  window = window_create();
  window_set_click_config_provider(window, click_config_provider);
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload,
  });
  window_stack_push(window, true);
}

static void deinit(void) {
  window_destroy(window);
  fonts_cleanup();
}

static void window_load(Window *window) {
  text_layer = text_layer_create(GRect(8, 8, 128, 100));
  text_layer_set_text(text_layer, "PRESS BUTTONS TO SWITCH FONT");
  text_layer_set_text_alignment(text_layer, GTextAlignmentLeft);
  layer_add_child(window_get_root_layer(window), text_layer_get_layer(text_layer));
}

static void window_unload(Window *window) {
  text_layer_destroy(text_layer);
}

static void click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
  window_single_click_subscribe(BUTTON_ID_UP, up_click_handler);
  window_single_click_subscribe(BUTTON_ID_DOWN, down_click_handler);
}

static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_font(text_layer, fonts_get_font_by_name("select font"));
}

static void up_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_font(text_layer, fonts_get_font_by_name("up font"));
}

static void down_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_font(text_layer, fonts_get_font(RESOURCE_ID_FONT_DEMO_GAMMA_24));
}

