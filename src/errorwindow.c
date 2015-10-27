//
//  errorwindow.c
//  slabforpebble
//
//  Created by James Turck on 27/10/2015.
//
//

#include "errorwindow.h"
#include "pebble.h"
#include "util.h"
static Window * window;
static TextLayer * messageTL;
static char * message;
static BitmapLayer * micBL;
static GBitmap * mic;

static void window_appear(Window * w) {
#ifdef PBL_COLOR
    window_set_background_color(w,GColorRed);
#endif
    Layer * root = window_get_root_layer(w);
    GRect bounds = layer_get_frame(root);
    mic = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_MIC_S);
    micBL = bitmap_layer_create(bounds);
    bitmap_layer_set_bitmap(micBL,mic);
    bitmap_layer_set_alignment(micBL,GAlignTop);
    bitmap_layer_set_compositing_mode(micBL,GCompOpSet);
    layer_add_child(root,bitmap_layer_get_layer(micBL));
    GRect f = GRect(bounds.origin.x,bounds.origin.y+30, bounds.size.w, bounds.size.h);
    messageTL = new_text_layer(f,
                               message, FONT_KEY_GOTHIC_28, GTextAlignmentCenter, GColorBlack, GColorClear, root);
    layer_add_child(root,text_layer_get_layer(messageTL));
}
static void window_disappear(Window * w) {
    text_layer_destroy(messageTL);
    bitmap_layer_destroy(micBL);
    gbitmap_destroy(mic);
}
static void window_unload(Window * w) {
    if (message!=NULL) {
        free(message);
    }
    window_destroy(w);
}

void errorwindow_create(char * msg) {
    window = window_create();
#ifdef PBL_SDK_2
    window_set_fullscreen(window,true);
#endif
    message = strdup(msg);    
    // Setup the window handlers
    window_set_window_handlers(window, (WindowHandlers) {
        .appear = window_appear,
        .disappear = window_disappear,
        .unload = window_unload
    });
    
    window_stack_push(window,true);
}