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

chan_info * myChan=NULL;

typedef struct  {
	char * name;
	char * msg;
	char * time;
	char * title;
} chat_msg;


typedef struct  {
	uint8_t num;
	chat_msg * msgs;
} chat_group;


static Window *window=NULL;
static MenuLayer *menu_layer;
static TitleLayer *title_layer;
static AppTimer * refresh_timer;
static time_t lastupdate;


chat_group chats[1];

char * chatTitle;

void delMessages() {
	int i;
	for (i=0;i<1;i++) {
		int j;

		// First message is always static
		for (j=0;j<chats[i].num;j++) {
			chat_msg * c = &chats[i].msgs[j];
			if (c->msg) free(c->msg);
			if (c->name) free(c->name);
			if (c->time) free(c->time);
			if (c->title) free(c->title);
		}
		if (chats[i].msgs) free(chats[i].msgs);
	}
}



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

#ifdef PBL_PLATFORM_APLITE
	graphics_context_set_text_color(ctx,GColorBlack);
#endif

	graphics_draw_text(ctx,
			chats[cell_index->section].msgs[cell_index->row].title,
			fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
			GRect(b.origin.x,b.origin.y,b.size.w,18),
			GTextOverflowModeTrailingEllipsis,
			GTextAlignmentLeft,
			NULL);


	graphics_draw_text(ctx,
			chats[cell_index->section].msgs[cell_index->row].msg,
			fonts_get_system_font(FONT_KEY_GOTHIC_18),
			GRect(b.origin.x,b.origin.y+14,b.size.w,b.size.h-18),
			GTextOverflowModeTrailingEllipsis,
			GTextAlignmentLeft,
			NULL);

}

// Here we capture when a user selects a menu item
void chat_select_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
	APP_LOG(APP_LOG_LEVEL_DEBUG,"You clicked on %s %s %s " , chats[cell_index->section].msgs[cell_index->row].name , chats[cell_index->section].msgs[cell_index->row].msg, chats[cell_index->section].msgs[cell_index->row].time);
	if ((strcmp(chats[cell_index->section].msgs[cell_index->row].name,"newmsg")==0) ||
			(myChan->id[0]=='D')) {
		replywindow_create(myChan,"", get_myReplies());
	} else {
		static char replyToBuffer[100];
		snprintf(replyToBuffer,100,"@%s: ",chats[cell_index->section].msgs[cell_index->row].name);
		replywindow_create(myChan,replyToBuffer, get_myReplies());
	}
}

int16_t chat_get_header_height_callback( MenuLayer *menu_layer, uint16_t section_index, void *callback_context) {
	return MENU_CELL_BASIC_HEADER_HEIGHT;
}

int16_t chat_get_cell_height_callback( MenuLayer *menu_layer, MenuIndex *cell_index, void *callback_context){

	GSize s = graphics_text_layout_get_content_size(
			chats[cell_index->section].msgs[cell_index->row].msg,
			fonts_get_system_font(FONT_KEY_GOTHIC_18),
			GRect(0,0,144,144-28),
			GTextOverflowModeTrailingEllipsis,
			GTextAlignmentLeft);

	return s.h + 18 + 10;
}

void chat_draw_header_callback(GContext *ctx, const Layer *cell_layer, uint16_t section_index, void *callback_context) {
	menu_cell_basic_header_draw(ctx,cell_layer,chatTitle);
}

// This initializes the menu upon window load
void chat_load(Window *window) {

	Layer * mainWindowLayer = window_get_root_layer(window);

	title_layer = title_layer_create(GRect(0,0,144,24), chatTitle);

	layer_add_child(mainWindowLayer,title_layer_get_layer(title_layer));

	// Create the menu layer
	menu_layer = menu_layer_create(GRect(0,24,144,144));

	// Set all the callbacks for the menu layer
	menu_layer_set_callbacks(menu_layer, NULL, (MenuLayerCallbacks){
		.get_num_sections = chat_get_num_sections_callback,
		.get_cell_height = chat_get_cell_height_callback,
		.get_num_rows = chat_get_num_rows_callback,
		.draw_row = chat_draw_row_callback,
		.select_click = chat_select_callback,
	});

	// Bind the menu layer's click config provider to the window for interactivity
	menu_layer_set_click_config_onto_window(menu_layer, window);

#ifdef PBL_COLOR
	menu_layer_set_highlight_colors(menu_layer, COLOR_PRIMARY, GColorWhite);
#endif

	// Add it to the window for display
	layer_add_child(mainWindowLayer, menu_layer_get_layer(menu_layer));
}

void chat_disappear(Window *window) {
	// Destroy the menu layer
	layer_remove_from_parent(menu_layer_get_layer(menu_layer));
	menu_layer_destroy(menu_layer);
	title_layer_destroy(title_layer);
}

void chat_unload(Window *w) {
	window_destroy(window);
	app_timer_cancel(refresh_timer);
	window=NULL;
}

chat_msg * chat_msg_create (char * msg, char* name, char *title, char *time) {
	chat_msg * c = malloc(sizeof(chat_msg));
	c->msg=strdup(msg);
	c->title=strdup(title);
	c->name=strdup(name);
	c->time=strdup(time);
	return c;
}

void resetChatData() {
	chats[0].num=1;
	chats[0].msgs=chat_msg_create("Loading","load","Wait a moment","00:00");
}


void refresh(void * data) {

	APP_LOG(APP_LOG_LEVEL_DEBUG,"REFRESH");
	time_t now = time(NULL);
	if (now-lastupdate > 3 * 60) {
		sendCommand("MESSAGES",myChan->id);
	}

	app_timer_reschedule(refresh_timer,2*60*1000);
//	refresh_timer=app_timer_register(2*60*1000,refresh,NULL);

}


void chatwindow_create(chan_info * chan) {

	if (myChan!=NULL) {
		if (strcmp(myChan->id,chan->id)!=0) {
			delMessages();
			resetChatData();
		}
	} else {
		resetChatData();
	}

	myChan = chan;
	sendCommand("MESSAGES",chan->id);
	chatTitle=chan->name;

	window = window_create();
#ifdef PBL_SDK_2
	window_set_fullscreen(window,true);
#endif

	// Setup the window handlers
	window_set_window_handlers(window, (WindowHandlers) {
		.appear = chat_load,
		.disappear = chat_disappear,
		.unload = chat_unload
	});

	refresh_timer = app_timer_register(60*2*1000, refresh,NULL);


	window_stack_push(window,true);

}

void chatwindow_update() {
	if (window!=NULL) {
		menu_layer_reload_data(menu_layer);
		layer_mark_dirty(window_get_root_layer(window));
	}
}



void addMessages(char * v, int id) {

	APP_LOG(APP_LOG_LEVEL_DEBUG,"addmessages %s", v);
	delMessages();
	if (v!=NULL) {
		char * tok = strtok(v,SEP);
		if (tok!=NULL) {
			APP_LOG(APP_LOG_LEVEL_DEBUG,"%u chat for chan %s chat_msg=%d", heap_bytes_free(), tok, sizeof(chat_msg));

		}
		tok=strtok(NULL,SEP);

		if (tok!=NULL) {
			chats[id].num = atoi(tok)+1;
			APP_LOG(APP_LOG_LEVEL_DEBUG,"num chats=%d", chats[id].num);
			chats[id].msgs = malloc (sizeof(chat_msg) * chats[id].num);
		}

//		chats[0].msgs[0]=*chat_msg_create("New Message","newmsg","Contribute","00:00");
		chats[0].msgs[0].title=strdup("Contribute");
		chats[0].msgs[0].msg=strdup("New Message");
		chats[0].msgs[0].time=strdup("00:00");
		chats[0].msgs[0].name=strdup("newmsg");

		uint8_t i = 1;
		tok=strtok(NULL,SEP);
		// assuming correct formed triples...
		//C04RHFQU8
		//10k
		//ddlb
		//13:43
		//hmm
		//ygalanter13:43with some other modifications

		while (tok!=NULL) {
			chats[id].msgs[i].name = strdup(tok);
			tok=strtok(NULL,SEP);
			if (tok!=NULL) {
				chats[id].msgs[i].time = strdup(tok);
				tok=strtok(NULL,SEP);
				if (tok!=NULL) {
					chats[id].msgs[i].msg = strdup(tok);

					int title_len=strlen(chats[id].msgs[i].name)+1+
							strlen(chats[id].msgs[i].time)+1+2;
					chats[id].msgs[i].title = malloc(title_len * sizeof(char));
					snprintf(chats[id].msgs[i].title,title_len,"%s %s",
							chats[id].msgs[i].time,
							chats[id].msgs[i].name);
//					APP_LOG(APP_LOG_LEVEL_DEBUG,"chat %u %d %s:%s",
//							heap_bytes_free(),
//							i,
//							chats[id].msgs[i].title,
//							chats[id].msgs[i].msg);
				} else {
					APP_LOG(APP_LOG_LEVEL_ERROR,"Bad chat msg, NULL msg for %s", chats[id].msgs[i].name );

				}
			} else {
				APP_LOG(APP_LOG_LEVEL_ERROR,"Bad chat msg, NULL time for %s", chats[id].msgs[i].name );
			}

			i++;
			tok=strtok(NULL,SEP);
		}
		lastupdate=time(NULL);
	}
}
