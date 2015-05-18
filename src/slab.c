#include <pebble.h>
#include "channelwindow.h"
#include "chatwindow.h"
#include "util.h"

static Window *window;
static BitmapLayer *layer_bitmap;
static GBitmap *logo;

void logComms(char * c, bool tx) {
	static char time_text[] = "HH:MM:SS";
	time_t tt = time(NULL);
	struct tm* curret_time = localtime(&tt);
	strftime(time_text, sizeof(time_text), "%T", curret_time);
	app_log(APP_LOG_LEVEL_WARNING,__FILE__,__LINE__,"%s %u %s %s", time_text,heap_bytes_free(),tx ? "tx" : "rx", c);

}

static void window_load(Window *window) {
	logo = gbitmap_create_with_resource(RESOURCE_ID_LOGO_SLACK);
	layer_bitmap = bitmap_layer_create(GRect(32, 32, 80, 80));
	bitmap_layer_set_bitmap(layer_bitmap, logo);
	bitmap_layer_set_compositing_mode(layer_bitmap, GCompOpSet);
	layer_add_child(window_get_root_layer(window), bitmap_layer_get_layer(layer_bitmap));
}


static void window_appear(Window *window) {
}

static void window_disappear(Window *window) {
}

static void window_unload(Window *w) {
	bitmap_layer_destroy(layer_bitmap);
	gbitmap_destroy(logo);
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
	}
}

void dropped(AppMessageResult reason, void * context){
	if (reason==APP_MSG_BUFFER_OVERFLOW) {
		APP_LOG(APP_LOG_LEVEL_ERROR,"APP_MSG_BUF_OVR");
	}
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
	const bool animated = true;


	AppMessageResult r=	app_message_open(app_message_inbox_size_maximum(),app_message_outbox_size_maximum());
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
