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

chan_info * myChan;

typedef struct  {
	char * name;
	char * msg;
	char * time;
	char * title;
} chat_msg;


typedef struct  {
	uint8_t num;
	chat_msg * chans;
} chat_group;


static Window *window=NULL;
static MenuLayer *menu_layer;

chat_group chats[1];

char * chatTitle;





static uint16_t chat_get_num_sections_callback(MenuLayer *menu_layer, void *data) {
	return 1;
}

// Each section has a number of items;  we use a callback to specify this
// You can also dynamically add and remove items using this
static uint16_t chat_get_num_rows_callback(MenuLayer *menu_layer, uint16_t section_index, void *data) {
	return chats[section_index].num;
}

// This is the menu item draw callback where you specify what each item should look like
static void chat_draw_row_callback(GContext* ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
	// Determine which section we're going to draw in
	//	menu_cell_basic_draw(ctx, cell_layer, chats[cell_index->section].chans[cell_index->row].msg, chats[cell_index->section].chans[cell_index->row/].name, NULL);

	GRect b = layer_get_bounds(cell_layer);


	graphics_draw_text(ctx,
			chats[cell_index->section].chans[cell_index->row].title,
			fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
			b,
			GTextOverflowModeFill,
			GTextAlignmentLeft,
			NULL);


	graphics_draw_text(ctx,
			chats[cell_index->section].chans[cell_index->row].msg,
			fonts_get_system_font(FONT_KEY_GOTHIC_18),
			GRect(b.origin.x,b.origin.y+14,b.size.w,b.size.h),
			GTextOverflowModeFill,
			GTextAlignmentLeft,
			NULL);

}

// Here we capture when a user selects a menu item
void chat_select_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
	APP_LOG(APP_LOG_LEVEL_DEBUG,"You clicked on %s %s %s " , chats[cell_index->section].chans[cell_index->row].name , chats[cell_index->section].chans[cell_index->row].msg, chats[cell_index->section].chans[cell_index->row].time);
	replywindow_create(myChan);
}

int16_t chat_get_header_height_callback( MenuLayer *menu_layer, uint16_t section_index, void *callback_context) {
	return MENU_CELL_BASIC_HEADER_HEIGHT;
}

int16_t chat_get_cell_height_callback( MenuLayer *menu_layer, MenuIndex *cell_index, void *callback_context){

	GSize s = graphics_text_layout_get_content_size(
			chats[cell_index->section].chans[cell_index->row].msg,
			fonts_get_system_font(FONT_KEY_GOTHIC_18),
			GRect(0,0,144,168),
			GTextOverflowModeFill,
			GTextAlignmentLeft);

	return s.h + 18 + 10;
}

void chat_draw_header_callback(GContext *ctx, const Layer *cell_layer, uint16_t section_index, void *callback_context) {
	menu_cell_basic_header_draw(ctx,cell_layer,chatTitle);
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
}

void chat_unload(Window *w) {
	window_destroy(window);
	window=NULL;
}



void chatwindow_create(chan_info * chan) {
//	static char msg[100];
//	snprintf(msg,100,"CHANNEL%c%s",0x7f, chan->id);
	myChan = chan;
	sendCommand("MESSAGES",chan->id);
	chatTitle=chan->name;

}

void chatwindow_update() {

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

	//	menu_layer_reload_data(menu_layer);
	//	layer_mark_dirty(window_get_root_layer(window));

}



void addMessages(char * v, int id) {

	char * m=strdup(v);
	APP_LOG(APP_LOG_LEVEL_DEBUG,"addmessages %s", m);
	if (v!=NULL) {
		char * tok = strtok(v,SEP);
		if (tok!=NULL) {
			APP_LOG(APP_LOG_LEVEL_DEBUG,"chat for chan %s", tok);
		}
		tok=strtok(NULL,SEP);

		if (tok!=NULL) {
			chats[id].num = atoi(tok);
			APP_LOG(APP_LOG_LEVEL_DEBUG,"num chats=%d", chats[id].num);
			chats[id].chans = malloc (sizeof(chat_msg) * chats[id].num);
		}


		uint8_t i = 0;
		tok=strtok(NULL,SEP);
		// assuming correct formed triples...
		//C04RHFQU8
		//10k
		//ddlb
		//13:43
		//hmm
		//ygalanter13:43with some other modifications

		while (tok!=NULL) {
			chats[id].chans[i].name = strdup(tok);
			tok=strtok(NULL,SEP);
			chats[id].chans[i].time = strdup(tok);
			tok=strtok(NULL,SEP);
			chats[id].chans[i].msg = strdup(tok);
			tok=strtok(NULL,SEP);
			int title_len=strlen(chats[id].chans[i].name)+1+
					strlen(chats[id].chans[i].time)+1+2;
			chats[id].chans[i].title = malloc(title_len);
			snprintf(chats[id].chans[i].title,title_len,"%s@%s",
					chats[id].chans[i].name,
					chats[id].chans[i].time);
			APP_LOG(APP_LOG_LEVEL_DEBUG,"chat %u %d %s:%s",
					heap_bytes_free(),
					i,
					chats[id].chans[i].title,
					chats[id].chans[i].msg);

			i++;
		}
	}
	free(m);
}




