/*
 * chatwindow.c
 *
 *  Created on: 15 May 2015
 *      Author: turcja
 */

#include "pebble.h"
#include "util.h"
#include "channelwindow.h"
#include "replywindow.h"
#include "title_layer.h"
#include "chatwindow.h"
#include <font-loader.h>
#include <pebble-assist.h>


static Window *window=NULL;
static TitleLayer *title_layer;
static ScrollLayer *scroll_layer;
static Layer * chat_item_layer;
static Layer * chat_item_blob_layer;
static chan_info * myChan;
static chat_msg * chat;

static void chat_item_update(Layer * layer, GContext * ctx) {

	GRect b = layer_get_bounds(layer);

	graphics_context_set_text_color(ctx, GColorBlack);

#define TIME_WIDTH 35
	// time
	graphics_draw_text(ctx, chat->time,
			fonts_get_system_font(FONT_KEY_GOTHIC_18),
			GRect(4, -3, TIME_WIDTH, 18), GTextOverflowModeTrailingEllipsis,
			GTextAlignmentLeft, NULL);

	// name
	graphics_draw_text(ctx, chat->name,
			fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
			GRect(4 + TIME_WIDTH, -3, PEBBLE_WIDTH-(TIME_WIDTH), 18), GTextOverflowModeTrailingEllipsis,
			GTextAlignmentLeft, NULL);

	//
	graphics_draw_text(ctx, chat->msg,
			fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD),
			GRect(4, 11, PEBBLE_WIDTH - 8, b.size.h-10), GTextOverflowModeTrailingEllipsis,
			GTextAlignmentLeft, NULL);


}

static void chat_item_blob_update(Layer * layer, GContext * ctx) {
	graphics_context_set_fill_color(ctx, COLOR_PRIMARY);
	graphics_fill_circle(ctx,GPoint(144,84),10);
}

// Here we capture when a user selects a menu item
void chatitem_select_click(ClickRecognizerRef  ref, void *data) {
	//	APP_LOG(APP_LOG_LEVEL_DEBUG,"You clicked sel on the chat_item");
	if (myChan->id[0]=='D') {
		replywindow_create(myChan,"", get_myReplies());
	} else {
		static char replyToBuffer[100];
		snprintf(replyToBuffer,100,"@%s: ", chat->name);
		replywindow_create(myChan,replyToBuffer, get_myReplies());
	}
	window_stack_remove(window,false);
}

void click_config(void * data) {
	window_single_click_subscribe(BUTTON_ID_SELECT,chatitem_select_click);
}

void chatitem_appear(Window *window) {

	Layer * mainWindowLayer = window_get_root_layer(window);

	chat_item_blob_layer = layer_create(GRect(0,0,144,168));
	layer_set_update_proc(chat_item_blob_layer, chat_item_blob_update);


	title_layer = title_layer_create(GRect(0,0,144,24), myChan->name, channel_icon_str(myChan));

	layer_add_child(mainWindowLayer,title_layer_get_layer(title_layer));

	GSize s = graphics_text_layout_get_content_size(
			chat->msg,
			fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD),
			GRect(0,0,PEBBLE_WIDTH - 8,2000),
			GTextOverflowModeTrailingEllipsis,
			GTextAlignmentLeft);


	chat_item_layer = layer_create(GRect(0,0,144,2000));
	layer_set_update_proc(chat_item_layer, chat_item_update);

	scroll_layer = scroll_layer_create(GRect (0,24,144,144));

	scroll_layer_set_content_size(scroll_layer, GSize(s.w,s.h+48));

	scroll_layer_set_click_config_onto_window(scroll_layer,window);
	scroll_layer_set_callbacks(scroll_layer, (ScrollLayerCallbacks) {
		.click_config_provider = click_config
	});

	// Add the layers for display
	scroll_layer_add_child(scroll_layer, chat_item_layer);

	layer_add_child(mainWindowLayer, scroll_layer_get_layer(scroll_layer));
	layer_add_child(mainWindowLayer,chat_item_blob_layer);

}

void chatitem_disappear(Window *window) {
	// Destroy the menu layer
	title_layer_destroy(title_layer);
	layer_destroy(chat_item_layer);
	layer_destroy(chat_item_blob_layer);
	scroll_layer_destroy(scroll_layer);
}

void chatitem_unload(Window *w) {
	window_destroy(window);
	window=NULL;
}

void chatitem_window_create(chan_info * chan, chat_msg * c) {

	myChan=chan;
	chat=c;

	window = window_create();
#ifdef PBL_SDK_2
	window_set_fullscreen(window,true);
#endif

	// Setup the window handlers
	window_set_window_handlers(window, (WindowHandlers) {
		.appear = chatitem_appear,
				.disappear = chatitem_disappear,
				.unload = chatitem_unload
	});

	window_stack_push(window,true);

}
