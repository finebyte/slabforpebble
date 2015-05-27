/*
 * channelwindow.c
 *
 *  Created on: 14 May 2015
 *      Author: turcja
 */

#include "pebble.h"
#include "util.h"
#include "channelwindow.h"
#include "chatwindow.h"
#include "title_layer.h"



static Window *window=NULL;
static MenuLayer *menu_layer;
static TextLayer  * watchInfo;
static TitleLayer * title_layer;
static AppTimer * refresh_chan_timer=NULL;



char * sectionTitles[]={"Starred","Channels", "Groups", "DM" };
chan_group channels[NUM_SECTIONS];

char * channelWindowTitle;

static uint16_t menu_get_num_sections_callback(MenuLayer *menu_layer, void *data) {
	return NUM_SECTIONS;
}

// Each section has a number of items;  we use a callback to specify this
// You can also dynamically add and remove items using this
static uint16_t menu_get_num_rows_callback(MenuLayer *menu_layer, uint16_t section_index, void *data) {
	return channels[section_index].num;
}

// This is the menu item draw callback where you specify what each item should look like
static void menu_draw_row_callback(GContext* ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
	// Determine which section we're going to draw in
	menu_cell_basic_draw(ctx, cell_layer, channels[cell_index->section].chans[cell_index->row].name, channels[cell_index->section].chans[cell_index->row].unread_msg, NULL);
}

// Here we capture when a user selects a menu item
void menu_select_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
	APP_LOG(APP_LOG_LEVEL_DEBUG,"You clicked on %s %s %d " , channels[cell_index->section].chans[cell_index->row].name , channels[cell_index->section].chans[cell_index->row].id, channels[cell_index->section].chans[cell_index->row].unread);
	chatwindow_create(&channels[cell_index->section].chans[cell_index->row]);
}

int16_t menu_get_header_height_callback( MenuLayer *menu_layer, uint16_t section_index, void *callback_context) {
	return MENU_CELL_BASIC_HEADER_HEIGHT;
}

void menu_draw_header_callback(GContext *ctx, const Layer *cell_layer, uint16_t section_index, void *callback_context) {
	menu_cell_basic_header_draw(ctx,cell_layer,sectionTitles[section_index]);
}

// This initializes the menu upon window load
void window_load(Window *window) {

	Layer * mainWindowLayer = window_get_root_layer(window);

	title_layer = title_layer_create(GRect(0,0,144,24), channelWindowTitle);

	layer_add_child(mainWindowLayer,title_layer_get_layer(title_layer));


	// Create the menu layer
	menu_layer = menu_layer_create(GRect(0,24,144,168));

	// Set all the callbacks for the menu layer
	menu_layer_set_callbacks(menu_layer, NULL, (MenuLayerCallbacks){
		.get_num_sections = menu_get_num_sections_callback,
				.get_header_height = menu_get_header_height_callback,
				.get_num_rows = menu_get_num_rows_callback,
				.draw_row = menu_draw_row_callback,
				.draw_header = menu_draw_header_callback,
				.select_click = menu_select_callback,
	});

#ifdef PBL_COLOR
	menu_layer_set_highlight_colors(menu_layer,GColorBlue,GColorWhite);
#endif

	// Bind the menu layer's click config provider to the window for interactivity
	menu_layer_set_click_config_onto_window(menu_layer, window);

	// Add it to the window for display
	layer_add_child(mainWindowLayer, menu_layer_get_layer(menu_layer));
}

void window_disappear(Window *window) {
	// Destroy the menu layer
	layer_remove_from_parent(menu_layer_get_layer(menu_layer));
	menu_layer_destroy(menu_layer);
	text_layer_destroy(watchInfo);
}

void window_unload(Window *window) {
	window_destroy(window);
}




void channelwindow_create() {

	if (window==NULL) {
		window = window_create();
#ifdef PBL_SDK_2
		window_set_fullscreen(window,true);
#endif

		// Setup the window handlers
		window_set_window_handlers(window, (WindowHandlers) {
			.appear = &window_load,
					.disappear = &window_disappear,
					.unload = &window_unload
		});


		window_stack_push(window,true);
	} else {
		menu_layer_reload_data(menu_layer);
		layer_mark_dirty(window_get_root_layer(window));
	}
}

#define CHAN_REFESH_INTERVAL 5*60*1000

void refresh_chans(void * data) {

	APP_LOG(APP_LOG_LEVEL_DEBUG,"REFRESH CHANS");
	sendCommand("REFRESH","ALL");

	app_timer_reschedule(refresh_chan_timer, CHAN_REFESH_INTERVAL);
	//	refresh_timer=app_timer_register(2*60*1000,refresh_chan_timer,NULL);

}


void delChannels(int id) {
	APP_LOG(APP_LOG_LEVEL_DEBUG,"DELCHANS");
	int j;
	for (j=0;j<channels[id].num;j++) {
		chan_info * c = &channels[id].chans[j];
		if (c->id) free(c->id);
		if (c->name) free(c->name);
		if (c->unread_msg) free(c->unread_msg);
	}
	if (channels[id].chans) free(channels[id].chans);
}



void addChannels(char * v, int id) {

	APP_LOG(APP_LOG_LEVEL_DEBUG,"addChannels %s", v);

	delChannels(id);

	if (v!=NULL) {
		char * tok = strtok(v,SEP);
		if (tok!=NULL) {
			channels[id].num = atoi(tok);
			APP_LOG(APP_LOG_LEVEL_DEBUG,"numchans %d", channels[id].num);
			channels[id].chans = malloc (sizeof(chan_info) * channels[id].num);
		}
		if (channels[id].num > 0) {
			uint8_t i = 0;
			tok=strtok(NULL,SEP);
			// assuming correct formed messages...
			while (tok!=NULL) {
				APP_LOG(APP_LOG_LEVEL_DEBUG,"next chan id %s", tok);
				channels[id].chans[i].id = strdup(tok);
				tok=strtok(NULL,SEP);
				channels[id].chans[i].name = strdup(tok);
				tok=strtok(NULL,SEP);
				channels[id].chans[i].unread = atoi(tok);
				channels[id].chans[i].unread_msg = malloc(20);
				snprintf(channels[id].chans[i].unread_msg,20,"%d unread", channels[id].chans[i].unread);
				tok=strtok(NULL,SEP);
				i++;
			}
		}
	}

	static char time_text[] = "Updated at HH:MM";
	time_t tt = time(NULL);
	struct tm* curret_time = localtime(&tt);
	strftime(time_text, sizeof(time_text), "Updated at %H:%M", curret_time);
	channelWindowTitle = time_text;

	if (refresh_chan_timer!=NULL) app_timer_cancel(refresh_chan_timer);
	refresh_chan_timer = app_timer_register(CHAN_REFESH_INTERVAL, refresh_chans,NULL);


}
