/*
 * chatwindow.c
 *
 *  Created on: 15 May 2015
 *      Author: turcja
 */

#include "pebble.h"
#include "util.h"



typedef struct  {
	char * name;
	char * msg;
	char * time;
} chat_msg;


typedef struct  {
	uint8_t num;
	chat_msg * chans;
} chat_group;


static Window *window=NULL;
static MenuLayer *menu_layer;
static TextLayer  * watchInfo;

chat_group chats[1];

char * chatTitle;





static uint16_t chat_get_num_sections_callback(MenuLayer *menu_layer, void *data) {
	return 3;
}

// Each section has a number of items;  we use a callback to specify this
// You can also dynamically add and remove items using this
static uint16_t chat_get_num_rows_callback(MenuLayer *menu_layer, uint16_t section_index, void *data) {
	return chats[section_index].num;
}

// This is the menu item draw callback where you specify what each item should look like
static void chat_draw_row_callback(GContext* ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
	// Determine which section we're going to draw in
	menu_cell_basic_draw(ctx, cell_layer, chats[cell_index->section].chans[cell_index->row].msg, chats[cell_index->section].chans[cell_index->row].name, NULL);
}

// Here we capture when a user selects a menu item
void chat_select_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
	APP_LOG(APP_LOG_LEVEL_DEBUG,"You clicked on %s %s %s " , chats[cell_index->section].chans[cell_index->row].name , chats[cell_index->section].chans[cell_index->row].msg, chats[cell_index->section].chans[cell_index->row].time);
//	static char msg[100];
//	snprintf(msg,100,"CHANNEL%c%s",0x7f, chats[cell_index->section].chans[cell_index->row].id);
//	sendCommand("MESSAGES",msg);
}

 int16_t chat_get_header_height_callback( MenuLayer *menu_layer, uint16_t section_index, void *callback_context) {
	 return MENU_CELL_BASIC_HEADER_HEIGHT;
 }

 int16_t chat_get_cell_height_callback( MenuLayer *menu_layer, MenuIndex *cell_index, void *callback_context){

	 return 100;
 }

 void chat_draw_header_callback(GContext *ctx, const Layer *cell_layer, uint16_t section_index, void *callback_context) {
		menu_cell_basic_header_draw(ctx,cell_layer,"ChatTitle");
 }

// This initializes the menu upon window load
void chat_load(Window *window) {

	Layer * mainWindowLayer = window_get_root_layer(window);

	// Create the menu layer
	menu_layer = menu_layer_create(GRect(0,0,144,168));

	// Set all the callbacks for the menu layer
	menu_layer_set_callbacks(menu_layer, NULL, (MenuLayerCallbacks){
		.get_num_sections = chat_get_num_sections_callback,
		.get_header_height = chat_get_header_height_callback,
		.get_cell_height = chat_get_cell_height_callback,
		.get_num_rows = chat_get_num_rows_callback,
		.draw_row = chat_draw_row_callback,
		.draw_header = chat_draw_header_callback,
		.select_click = chat_select_callback,
	});

	// Bind the menu layer's click config provider to the window for interactivity
	menu_layer_set_click_config_onto_window(menu_layer, window);

	// Add it to the window for display
	layer_add_child(mainWindowLayer, menu_layer_get_layer(menu_layer));
}

void chat_disappear(Window *window) {
	// Destroy the menu layer
	layer_remove_from_parent(menu_layer_get_layer(menu_layer));
	menu_layer_destroy(menu_layer);
	text_layer_destroy(watchInfo);
}

void chat_unload(Window *window) {
	window_destroy(window);
}




void chatwindow_create() {

	if (window==NULL) {
	window = window_create();
#ifdef PBL_SDK_2
	window_set_fullscreen(window,true);
#endif

	// Setup the window handlers
	window_set_window_handlers(window, (WindowHandlers) {
		.appear = &chat_load,
				.disappear = &chat_disappear,
				.unload = &chat_unload
	});


	window_stack_push(window,true);
	} else {
		menu_layer_reload_data(menu_layer);
		layer_mark_dirty(window_get_root_layer(window));
	}
}


void addMessage(char * v, int id) {

	char * m=strdup(v);
	APP_LOG(APP_LOG_LEVEL_DEBUG,"addchats %s", m);
	if (v!=NULL) {
		char * tok = strtok(v,"^");
		if (tok!=NULL) {
			chats[id].num = atoi(tok);
			APP_LOG(APP_LOG_LEVEL_DEBUG,"numchans %d", chats[id].num);
			chats[id].chans = malloc (sizeof(chat_msg) * chats[id].num);
		}
		uint8_t i = 0;
		tok=strtok(NULL,"^");
		APP_LOG(APP_LOG_LEVEL_DEBUG,"next chan id %s", tok);
		// assuming correct formed triples...
		while (tok!=NULL) {
			APP_LOG(APP_LOG_LEVEL_DEBUG,"next chan id %s", tok);
			chats[id].chans[i].name = strdup(tok);
			tok=strtok(NULL,"^");
			chats[id].chans[i].msg = strdup(tok);
			tok=strtok(NULL,"^");
			chats[id].chans[i].time = strdup(tok);
			tok=strtok(NULL,"^");
			i++;
		}
	}
	free(m);
}




