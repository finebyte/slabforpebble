/*
 * replywindow.c
 *
 *  Created on: 17 May 2015
 *      Author: turcja
 */



#include "pebble.h"
#include "util.h"
#include "channelwindow.h"

chan_info * replyChan;


static Window *window=NULL;
static MenuLayer *menu_layer;
static TextLayer  * watchInfo;

//chan_group channels[3];

char * replyTitles[]={"Reply"};

char * replies[] = {"Yes","No","Everything is awesome"};

static uint16_t reply_get_num_sections_callback(MenuLayer *menu_layer, void *data) {
	return 1;
}

// Each section has a number of items;  we use a callback to specify this
// You can also dynamically add and remove items using this
static uint16_t reply_get_num_rows_callback(MenuLayer *menu_layer, uint16_t section_index, void *data) {
	return ARRAY_LENGTH(replies);
}

// This is the menu item draw callback where you specify what each item should look like
static void reply_draw_row_callback(GContext* ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
	// Determine which section we're going to draw in
	menu_cell_basic_draw(ctx, cell_layer, replies[cell_index->row], NULL, NULL);
}

void refresh(void * data) {
	sendCommand("MESSAGES",replyChan->id);
}

// Here we capture when a user selects a menu item
void reply_select_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
	APP_LOG(APP_LOG_LEVEL_DEBUG,"You clicked on %s" ,
		replies[cell_index->row]);
	static char msg[100];
	snprintf(msg,100,"%s%c%s", replyChan->id,0x7f,replies[cell_index->row]);
	sendCommand("MESSAGE",msg);
	window_stack_pop(true);
	app_timer_register(500,refresh,NULL);


}

 int16_t reply_get_header_height_callback( MenuLayer *menu_layer, uint16_t section_index, void *callback_context) {
	 return MENU_CELL_BASIC_HEADER_HEIGHT;
 }

 void reply_draw_header_callback(GContext *ctx, const Layer *cell_layer, uint16_t section_index, void *callback_context) {
		menu_cell_basic_header_draw(ctx,cell_layer,replyTitles[section_index]);
 }

// This initializes the menu upon window load
void replywindow_load(Window *window) {

	Layer * mainWindowLayer = window_get_root_layer(window);

	// Create the menu layer
	menu_layer = menu_layer_create(GRect(0,0,144,168));

	// Set all the callbacks for the menu layer
	menu_layer_set_callbacks(menu_layer, NULL, (MenuLayerCallbacks){
		.get_num_sections = reply_get_num_sections_callback,
				.get_header_height = reply_get_header_height_callback,
		.get_num_rows = reply_get_num_rows_callback,
				.draw_row = reply_draw_row_callback,
				.draw_header = reply_draw_header_callback,
				.select_click = reply_select_callback,
	});

	// Bind the menu layer's click config provider to the window for interactivity
	menu_layer_set_click_config_onto_window(menu_layer, window);

	// Add it to the window for display
	layer_add_child(mainWindowLayer, menu_layer_get_layer(menu_layer));
}

void replywindow_disappear(Window *window) {
	// Destroy the menu layer
	layer_remove_from_parent(menu_layer_get_layer(menu_layer));
	menu_layer_destroy(menu_layer);
	text_layer_destroy(watchInfo);
}

void replywindow_unload(Window *w) {
	window=NULL;
	window_destroy(window);
}




void replywindow_create(chan_info * c) {

	replyChan=c;

	if (window==NULL) {
	window = window_create();
#ifdef PBL_SDK_2
	window_set_fullscreen(window,true);
#endif

	// Setup the window handlers
	window_set_window_handlers(window, (WindowHandlers) {
		.appear = &replywindow_load,
				.disappear = &replywindow_disappear,
				.unload = &replywindow_unload
	});


	window_stack_push(window,true);
	} else {
		menu_layer_reload_data(menu_layer);
		layer_mark_dirty(window_get_root_layer(window));
	}
}





