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

src/font-loader.c

*/

#include <pebble.h>
#include "font-loader.h"

typedef struct AppFont AppFont;

struct AppFont {
  uint32_t res_id;
  GFont font;
  char* name;
  AppFont* next;
};

AppFont* find_by_id(const uint32_t res_id);
AppFont* find_by_name(const char* name);
AppFont* add(const uint32_t res_id);
void load(AppFont* font);

static AppFont* fonts = NULL;

void fonts_init(void) {
  fonts_cleanup();
  fonts = NULL;
}

void fonts_assign(const char* name, uint32_t res_id) {
  AppFont* font = find_by_id(res_id);
  if (NULL == font) {
    font = add(res_id);
  }
  if (NULL != font->name) {
    free(font->name);
  }
  font->name = malloc(sizeof(char) * (strlen(name) + 1));
  strcpy(font->name, name);
}

GFont fonts_get_font(const uint32_t res_id) {
  AppFont* font = find_by_id(res_id);
  if (NULL == font) {
    font = add(res_id);
  }
  if (NULL == font->font) {
    load(font);
  }
  return font->font;
}

GFont fonts_get_font_by_name(const const char* name) {
  AppFont* font = find_by_name(name);
  if (NULL == font) {
    return NULL;
  }
  if (NULL == font->font) {
    load(font);
  }
  return font->font;
}

// Unload all the fonts from memory.
void fonts_cleanup(void) {
  AppFont* current = fonts;
  while (current != NULL) {
    if (NULL != current->name) {
      free(current->name);
    }
    if (NULL != current->font) {
      fonts_unload_custom_font(current->font);
    }
    AppFont* tmp = current->next;
    free(current);
    current = tmp;
  }
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //

AppFont* find_by_id(const uint32_t res_id) {
  AppFont* current = fonts;
  while (NULL != current) {
    if (res_id == current->res_id) {
      return current;
    }
    current = current->next;
  }
  return NULL;
}

AppFont* find_by_name(const char* name) {
  AppFont* current = fonts;
  while (NULL != current) {
    if (0 == strcmp(current->name, name)) {
      return current;
    }
    current = current->next;
  }
  return NULL;
}

AppFont* add(uint32_t res_id) {
  AppFont* font = malloc(sizeof(AppFont));
  font->res_id = res_id;
  font->name = NULL;
  font->font = NULL;
  font->next = NULL;
  if (NULL == fonts) {
    fonts = font;
  }
  else {
    AppFont* tail = fonts;
    while (NULL != tail->next) {
      tail = tail->next;
    }
    tail->next = font;
  }
  return font;
}

void load(AppFont* font) {
  if (NULL == font) {
    return;
  }
  if (NULL != font->font) {
    fonts_unload_custom_font(font->font);
    font->font = NULL;
  }
  font->font = fonts_load_custom_font(resource_get_handle(font->res_id));
}
