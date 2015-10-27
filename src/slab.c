#include <pebble.h>
#include <pebble-assist.h>
#include <font-loader.h>
#include "channelwindow.h"
#include "chatwindow.h"
#include "util.h"
#include "replywindow.h"
#include "generated/appinfo.h"


typedef enum {
    MODE_WAITING,
    MODE_ERROR,
    MODE_TIMEOUT,
    MODE_LOGIN
} Mode;

static Window *window;
static Layer *layer;
static AppTimer * login_timer=NULL;
static Mode mode;

void logComms(char * c, bool tx) {
    static char time_text[] = "HH:MM:SS";
    time_t tt = time(NULL);
    struct tm* curret_time = localtime(&tt);
    strftime(time_text, sizeof(time_text), "%T", curret_time);
    app_log(APP_LOG_LEVEL_WARNING,__FILE__,__LINE__,"%s %u %s %s", time_text,heap_bytes_free(),tx ? "tx" : "rx", c);
    
}

void handle_time_tick(struct tm *tick_time, TimeUnits units_changed) {
    
    if( (units_changed & MINUTE_UNIT) != 0 ) {
        /* Minutes changed */
        logComms("TICK",false);
    }
}

void timeout(void* d) {
    mode = MODE_TIMEOUT;
    if (layer!=NULL) {
        layer_mark_dirty(layer);
    }
}

static void layer_update_proc(Layer* layer, GContext* ctx) {
    graphics_context_set_fill_color(ctx, COLOR_PRIMARY);
    graphics_context_set_text_color(ctx, GColorWhite);
    char* icon = ICON_X;
    char* message = "";
    switch (mode) {
        case MODE_WAITING:
        icon = ICON_REFRESH;
        message = "WAITING FOR SLACK";
        break;
        case MODE_ERROR:
        icon = ICON_X;
        message = "UNKNOWN ERROR";
        break;
        case MODE_LOGIN:
        icon = ICON_PHONE;
        message = "LOGIN REQUIRED";
        break;
        case MODE_TIMEOUT:
        icon = ICON_X;
        message = "FAILED TO LOAD";
        break;
    }
    
    graphics_fill_rect(ctx, layer_get_bounds(layer), 0, GCornerNone);
    graphics_draw_text(ctx, icon, fonts_get_font(RESOURCE_ID_FONT_ICONS_32),
                       GRect(58, 23, 32, 32), GTextOverflowModeFill, GTextAlignmentCenter, NULL);
    graphics_draw_text(ctx, message,
                       fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD),
                       GRect(8, 64, PEBBLE_WIDTH-16, 100), GTextOverflowModeWordWrap,
                       GTextAlignmentCenter, NULL);
    
    graphics_context_set_fill_color(ctx, COLOR_SECONDARY);
    graphics_fill_rect(ctx, GRect(0, PEBBLE_HEIGHT - 22, PEBBLE_WIDTH, 22), GCornerNone, 0);
    char footer[16];
    snprintf(footer, 16, "SLAB %s", VERSION_LABEL);
    graphics_draw_text(ctx, footer, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
                       GRect(8, PEBBLE_HEIGHT - 24, PEBBLE_WIDTH - 16, 18), GTextOverflowModeFill,
                       GTextAlignmentCenter, NULL);
}

static void window_load(Window *window) {
    layer = layer_create_fullscreen(window);
    layer_set_update_proc(layer, layer_update_proc);
    layer_add_to_window(layer, window);
    mode = MODE_WAITING;
    // splash = gbitmap_create_with_resource(RESOURCE_ID_SPLASH);
    // layer_bitmap = bitmap_layer_create(GRect(0, 0, 144, 168));
    // bitmap_layer_set_bitmap(layer_bitmap, splash);
    // layer_add_child(window_get_root_layer(window), bitmap_layer_get_layer(layer_bitmap));
    // status_tl=text_layer_create(GRect(0,128,144,60));
    // text_layer_set_text_alignment(status_tl,GTextAlignmentCenter);
    // text_layer_set_text_color(status_tl,GColorWhite);
    // text_layer_set_background_color(status_tl,GColorBlack);
    // text_layer_set_text(status_tl, "Waiting for slack...");
    // layer_add_child(window_get_root_layer(window),text_layer_get_layer(status_tl));
    tick_timer_service_subscribe(MINUTE_UNIT, handle_time_tick);
    login_timer=app_timer_register(10000,timeout,NULL);
}


static void window_appear(Window *window) {
}

static void window_disappear(Window *window) {
}

static void window_unload(Window *w) {
    layer = NULL;
    window = NULL;
}

void sendBufferSize() {
    char bufsize[20];
    snprintf(bufsize,20,"%lu",app_message_inbox_size_maximum());
    sendCommand("BUFFER",bufsize);
}

void rcv(DictionaryIterator *received, void *context) {
    
    // Got a message
    Tuple* t;
    
    t=dict_find(received,0); // key 0 tells me what sort of message
    if (t!=NULL) {
        char * op = t->value->cstring;
        logComms(op,false);
        if (strcmp(op,"STARRED")==0) {
            t=dict_find(received,1); // data
            if (t!=NULL) {
                addChannels(t->value->cstring, STARRED);
                channelwindow_create();
                if (window!=NULL) {
                    window_stack_remove(window,false);
                }
                if (login_timer) {
                    app_timer_cancel(login_timer);
                    login_timer = NULL;
                }
                
            } else {
                APP_LOG(APP_LOG_LEVEL_DEBUG, "STARRED: NO STARRED");
            }
            
            sendBufferSize();
            
        }
        if (strcmp(op,"CHANNELS")==0) {
            t=dict_find(received,1); // data
            if (t!=NULL) {
                addChannels(t->value->cstring, CHANNELS);
                channelwindow_create();
                if (window!=NULL) {
                    window_stack_remove(window,false);
                }
                if (login_timer) {
                    app_timer_cancel(login_timer);
                    login_timer = NULL;
                }
            } else {
                APP_LOG(APP_LOG_LEVEL_DEBUG, "CHANNELS: NO CHANNELS");
            }
            
            sendBufferSize();
            
        }
        if (strcmp(op,"GROUPS")==0) {
            t=dict_find(received,1); // data
            if (t!=NULL) {
                addChannels(t->value->cstring, GROUPS);
                channelwindow_create();
                if (window!=NULL) {
                    window_stack_remove(window,false);
                }
                if (login_timer) {
                    app_timer_cancel(login_timer);
                    login_timer = NULL;
                }
            } else {
                APP_LOG(APP_LOG_LEVEL_DEBUG, "GROUPS: NO GROUPS");
            }
        }
        if (strcmp(op,"IMS")==0) {
            t=dict_find(received,1); // data
            if (t!=NULL) {
                addChannels(t->value->cstring,DM);
                channelwindow_create();
                if (window!=NULL) {
                    window_stack_remove(window,false);
                }
                if (login_timer) {
                    app_timer_cancel(login_timer);
                    login_timer = NULL;
                }
            } else {
                APP_LOG(APP_LOG_LEVEL_DEBUG, "IMS: NO IMS");
            }
        }
        if (strcmp(op,"MESSAGES")==0) {
            t=dict_find(received,1); // data
            if (t!=NULL) {
                addMessages(t->value->cstring,0);
                chatwindow_update();
            } else {
                APP_LOG(APP_LOG_LEVEL_DEBUG, "MESSAGES: NO MESSAGES");
            }
        }
        if (strcmp(op,"REPLIES")==0) {
            t=dict_find(received,1); // data
            if (t!=NULL) {
                addReplies(t->value->cstring);
            } else {
                APP_LOG(APP_LOG_LEVEL_DEBUG, "REPLIES: NO REPLIES");
            }
        }
        if (strcmp(op,"CONFIG")==0) {
            if (login_timer!=NULL) {
                app_timer_cancel(login_timer);
                login_timer = NULL;
            }
            mode = MODE_LOGIN;
            layer_mark_dirty(layer);
        }
        if (strcmp(op,"ERROR")==0) {
            APP_LOG(APP_LOG_LEVEL_DEBUG, "ERROR!");
            
        }
    }
}

void dropped(AppMessageResult reason, void * context){
    if (reason==APP_MSG_BUFFER_OVERFLOW) {
        APP_LOG(APP_LOG_LEVEL_ERROR,"APP_MSG_BUF_OVR");
    }
    APP_LOG(APP_LOG_LEVEL_ERROR,"APP_MSG DROP %d", reason);
}

void send_failed(DictionaryIterator * iter, AppMessageResult r, void* c) {
    logComms("SendFail",true);
}

void sent_callback(DictionaryIterator * iter, void * c) {
    logComms("SendOK", true);
}


static void init(void) {
    window = window_create();
    window_set_window_handlers(window, (WindowHandlers) {
        .load = window_load,
        .unload = window_unload,
        .appear = window_appear,
        .disappear = window_disappear,
    });
#ifdef PBL_SDK_2
    window_set_fullscreen(window, true);
#endif
    const bool animated = true;
    
    fonts_init();
    
    app_message_open(app_message_inbox_size_maximum(),app_message_outbox_size_maximum());
    app_message_register_inbox_received(rcv);
    app_message_register_inbox_dropped(dropped);
    app_message_register_outbox_failed(send_failed);
    app_message_register_outbox_sent(sent_callback);
    
    
    
    window_stack_push(window, animated);
}

static void deinit(void) {
    window_destroy(window);
}

int main(void) {
    init();
    
    APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, pushed window: %p", window);
    
    app_event_loop();
    deinit();
}
