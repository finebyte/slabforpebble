#include <pebble.h>
#include "channelwindow.h"
#include "chatwindow.h"
#include "util.h"
#include "replywindow.h"

static Window *window;
static BitmapLayer *layer_bitmap;
static GBitmap *splash;
static TextLayer * status_tl;
static AppTimer * login_timer=NULL;

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
	if (status_tl!=NULL) {
		text_layer_set_text(status_tl, "Timeout connecting\nPlease launch again");
	}
}

static void window_load(Window *window) {
	splash = gbitmap_create_with_resource(RESOURCE_ID_SPLASH);
	layer_bitmap = bitmap_layer_create(GRect(0, 0, 144, 168));
	bitmap_layer_set_bitmap(layer_bitmap, splash);
	layer_add_child(window_get_root_layer(window), bitmap_layer_get_layer(layer_bitmap));
	status_tl=text_layer_create(GRect(0,128,144,60));
	text_layer_set_text_alignment(status_tl,GTextAlignmentCenter);
	text_layer_set_text_color(status_tl,GColorWhite);
	text_layer_set_background_color(status_tl,GColorBlack);
	text_layer_set_text(status_tl, "Waiting for slack...");
	layer_add_child(window_get_root_layer(window),text_layer_get_layer(status_tl));
	tick_timer_service_subscribe(MINUTE_UNIT, handle_time_tick);
	login_timer=app_timer_register(10000,timeout,NULL);
}


static void window_appear(Window *window) {
}

static void window_disappear(Window *window) {
}

static void window_unload(Window *w) {
	bitmap_layer_destroy(layer_bitmap);
	gbitmap_destroy(splash);
	text_layer_destroy(status_tl);
	status_tl=NULL;
	window=NULL;
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
		APP_LOG(APP_LOG_LEVEL_DEBUG, "rcv %s", op);
		if (strcmp(op,"CHANNELS")==0) {
			t=dict_find(received,1); // data
			if (t!=NULL) {
				addChannels(t->value->cstring, CHANNELS);
				channelwindow_create();
				if (window!=NULL) {
					window_stack_remove(window,false);
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
			}
			text_layer_set_text(status_tl, "Please configure Slab\nIn the Pebble Android app");
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
