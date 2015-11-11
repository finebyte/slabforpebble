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
#include "chatitemwindow.h"
#include <font-loader.h>


chan_info * myChan=NULL;

static Window *window=NULL;
static MenuLayer *menu_layer=NULL;
static TitleLayer *title_layer;
static AppTimer * refresh_timer;
static time_t lastupdate;
int current_item=0;


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

static uint16_t chat_get_num_rows_callback(MenuLayer *menu_layer, uint16_t section_index, void *data) {
	return chats[section_index].num;
}

static void chat_draw_row_callback(GContext* ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {

	GRect b = layer_get_bounds(cell_layer);

#ifdef PBL_BW
	graphics_context_set_text_color(ctx, GColorBlack);
#endif

	chat_msg * chat = &chats[cell_index->section].msgs[cell_index->row];

	char * row_0_txt="SEND MESSAGE";
	char * row_0_icon=ICON_CHAT;

	if (strcmp(chat->name,"load")==0) {

		row_0_txt="LOADING";
		row_0_icon=ICON_REFRESH;

	}




#ifdef PBL_ROUND
#define TIME_WIDTH 50
    GTextAttributes *s_attributes
    = graphics_text_attributes_create();
    
    // Enable text flow with an inset of 5 pixels
    graphics_text_attributes_enable_screen_text_flow(s_attributes, 5);
    if (cell_index->row==0) {
        graphics_draw_text(ctx, row_0_txt,
                           fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
                           GRect(6, 9, PEBBLE_WIDTH - 24, 24), GTextOverflowModeTrailingEllipsis,
                           GTextAlignmentLeft, s_attributes);
        graphics_draw_text(ctx, row_0_icon,
                           fonts_get_font(RESOURCE_ID_FONT_ICONS_24),
                           GRect(PEBBLE_WIDTH-28, 7, 24, 24),
                           GTextOverflowModeFill, GTextAlignmentCenter, s_attributes);
    } else {
        // Create the attributes object used for text rendering
        //
        // time
        graphics_draw_text(ctx, chat->time,
                           fonts_get_system_font(FONT_KEY_GOTHIC_18),
                           GRect(4, -3, TIME_WIDTH, 18), GTextOverflowModeTrailingEllipsis,
                           GTextAlignmentLeft, s_attributes);
        
        // name
        graphics_draw_text(ctx, chat->name,
                           fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
                           GRect(4 + TIME_WIDTH, -3, PEBBLE_WIDTH-(TIME_WIDTH), 18), GTextOverflowModeTrailingEllipsis,
                           GTextAlignmentLeft, s_attributes);

        
        graphics_draw_text(ctx, chat->msg,
                           fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD),
                           GRect(4, 11, PEBBLE_WIDTH - 8, b.size.h-10), GTextOverflowModeTrailingEllipsis,
                           GTextAlignmentLeft, s_attributes);
#else
#define TIME_WIDTH 35
        if (cell_index->row==0) {
            graphics_draw_text(ctx, row_0_txt,
                               fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
                               GRect(6, 9, PEBBLE_WIDTH - 24, 24), GTextOverflowModeTrailingEllipsis,
                               GTextAlignmentLeft, NULL);
            graphics_draw_text(ctx, row_0_icon,
                               fonts_get_font(RESOURCE_ID_FONT_ICONS_24),
                               GRect(PEBBLE_WIDTH-28, 7, 24, 24),
                               GTextOverflowModeFill, GTextAlignmentCenter, NULL);
        } else {

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

#endif

	}


}

// Here we capture when a user selects a menu item
void chat_select_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
	APP_LOG(APP_LOG_LEVEL_DEBUG,"You clicked on %s %s %s " , chats[cell_index->section].msgs[cell_index->row].name , chats[cell_index->section].msgs[cell_index->row].msg, chats[cell_index->section].msgs[cell_index->row].time);

	current_item=cell_index->row;

	if (strcmp(chats[cell_index->section].msgs[cell_index->row].name,"newmsg")==0) {
		replywindow_create(myChan,"", get_myReplies());
	} else {
		chatitem_window_create(myChan, &chats[cell_index->section].msgs[cell_index->row]);
	}
}

void chat_select_long_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
	APP_LOG(APP_LOG_LEVEL_DEBUG,"You clicked on %s %s %s " , chats[cell_index->section].msgs[cell_index->row].name , chats[cell_index->section].msgs[cell_index->row].msg, chats[cell_index->section].msgs[cell_index->row].time);

	current_item=cell_index->row;

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
#ifdef PBL_ROUND
    return MENU_CELL_BASIC_HEADER_HEIGHT+5;
#else

	return MENU_CELL_BASIC_HEADER_HEIGHT;
#endif
}

int16_t chat_get_cell_height_callback( MenuLayer *menu_layer, MenuIndex *cell_index, void *callback_context){

	GSize s = graphics_text_layout_get_content_size(
			chats[cell_index->section].msgs[cell_index->row].msg,
			fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD),
			GRect(0,0,PEBBLE_WIDTH - 8,144-28),
			GTextOverflowModeTrailingEllipsis,
			GTextAlignmentLeft);

	if (s.h > 72) {
		return 90;
	}
	return s.h + 18;
}

void chat_draw_header_callback(GContext *ctx, const Layer *cell_layer, uint16_t section_index, void *callback_context) {
	menu_cell_basic_header_draw(ctx,cell_layer,chatTitle);
}

// This initializes the menu upon window load
void chat_appear(Window *window) {

	Layer * mainWindowLayer = window_get_root_layer(window);

    int title_layer_height=TITLE_HEIGHT;

    APP_LOG(APP_LOG_LEVEL_DEBUG,"title layer h = %d",title_layer_height);
	title_layer = title_layer_create(GRect(0,0,PEBBLE_WIDTH,title_layer_height), myChan->name, channel_icon_str(myChan));


	// Create the menu layer
#ifdef PBL_ROUND
    menu_layer = menu_layer_create(GRect(0,0,PEBBLE_WIDTH,PEBBLE_HEIGHT));
#else
    menu_layer = menu_layer_create(GRect(0,title_layer_height,PEBBLE_WIDTH,PEBBLE_HEIGHT-title_layer_height));
#endif

	// Set all the callbacks for the menu layer
	menu_layer_set_callbacks(menu_layer, NULL, (MenuLayerCallbacks){
		.get_num_sections = chat_get_num_sections_callback,
				.get_cell_height = chat_get_cell_height_callback,
				.get_num_rows = chat_get_num_rows_callback,
				.draw_row = chat_draw_row_callback,
				.select_click = chat_select_callback,
				.select_long_click = chat_select_long_callback
	});

	// Bind the menu layer's click config provider to the window for interactivity
	menu_layer_set_click_config_onto_window(menu_layer, window);

	MenuIndex indx;
	indx.section=0;
	indx.row=current_item;
	menu_layer_set_selected_index(menu_layer,indx,MenuRowAlignCenter,false);

#ifdef PBL_COLOR
	menu_layer_set_highlight_colors(menu_layer, COLOR_PRIMARY, GColorWhite);
#endif

	// Add it to the window for display
	layer_add_child(mainWindowLayer, menu_layer_get_layer(menu_layer));
    layer_add_child(mainWindowLayer,title_layer_get_layer(title_layer));
}

void chat_disappear(Window *window) {
	// Destroy the menu layer
	layer_remove_from_parent(menu_layer_get_layer(menu_layer));
	menu_layer_destroy(menu_layer);
	menu_layer=NULL;
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

	current_item=0;
	myChan = chan;
	sendCommand("MESSAGES",chan->id);
	chatTitle=chan->name;

	window = window_create();
#ifdef PBL_SDK_2
	window_set_fullscreen(window,true);
#endif

	// Setup the window handlers
	window_set_window_handlers(window, (WindowHandlers) {
		.appear = chat_appear,
				.disappear = chat_disappear,
				.unload = chat_unload
	});

	refresh_timer = app_timer_register(60*2*1000, refresh,NULL);


	window_stack_push(window,true);

}

void chatwindow_update() {
	if (menu_layer!=NULL) {
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
