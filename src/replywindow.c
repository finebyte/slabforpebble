/*
 * replywindow.c
 *
 *  Created on: 17 May 2015
 *      Author: turcja
 */



#include "pebble.h"
#include "util.h"
#include "channelwindow.h"
#include "title_layer.h"
#include "replywindow.h"


typedef struct {
	chan_info * replyChan;
	char * replyTo;
	Window *window;
	MenuLayer *menu_layer;
	TitleLayer * title_layer;
	ReplyList * replies;
} ReplyWindow;


char * staticReplies[]={"Emoji","Yes","No","Everything is awesome"};
ReplyList staticRL;
char * emojiList[]={"😛","😄","😄","😎","😖","💩","🍺"};
ReplyList emojiRL;

ReplyList * myReplies=NULL;

void set_myReplies(ReplyList * r) {
	myReplies=r;
}

ReplyList * get_myReplies() {
	return myReplies;

}

static uint16_t reply_get_num_sections_callback(MenuLayer *menu_layer, void *data) {
	return 1;
}

// Each section has a number of items;  we use a callback to specify this
// You can also dynamically add and remove items using this
static uint16_t reply_get_num_rows_callback(MenuLayer *menu_layer, uint16_t section_index, void *data) {
	ReplyWindow * rw = (ReplyWindow*)data;
	return rw->replies->num;
//			ARRAY_LENGTH(rw->replies);
}

static void reply_draw_row_callback(GContext* ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
	ReplyWindow * rw = (ReplyWindow*)data;
	// Determine which section we're going to draw in
	menu_cell_basic_draw(ctx, cell_layer, rw->replies->values[cell_index->row], NULL, NULL);
}

//void refresh(void * data) {
//	sendCommand("MESSAGES",rw->replyChan->id);
//}

// Here we capture when a user selects a menu item
void reply_select_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
	ReplyWindow * rw = (ReplyWindow*)data;
	APP_LOG(APP_LOG_LEVEL_DEBUG,"You clicked on %s" ,
			rw->replies->values[cell_index->row]);

	if (strcmp(rw->replies->values[cell_index->row],"Emoji")==0) {
		emojiRL.values=emojiList;
		emojiRL.num=ARRAY_LENGTH(emojiList);
		replywindow_create(rw->replyChan,rw->replyTo,&emojiRL);
	} else {

		static char msg[100];
		snprintf(msg,100,"%s%c%s%s", rw->replyChan->id,0x7f,rw->replyTo,rw->replies->values[cell_index->row]);
		sendCommand("MESSAGE",msg);
		bool pop2 = rw->replies->values==emojiList;
		window_stack_pop(true);
		if (pop2) {
			APP_LOG(APP_LOG_LEVEL_DEBUG,"2nd pop - skipping");
//			window_stack_pop(false);
			APP_LOG(APP_LOG_LEVEL_DEBUG,"2nd popped");
		}
	}
}

int16_t reply_get_header_height_callback( MenuLayer *menu_layer, uint16_t section_index, void *callback_context) {
	return MENU_CELL_BASIC_HEADER_HEIGHT;
}

// This initializes the menu upon window load
void replywindow_load(Window *window) {

	ReplyWindow * rw = (ReplyWindow*)window_get_user_data(window);


	Layer * mainWindowLayer = window_get_root_layer(window);

	static char titleText[40];
	snprintf(titleText,40,"Reply %s", rw->replyTo);

	rw->title_layer = title_layer_create(GRect(0,0,144,24), titleText);

	layer_add_child(mainWindowLayer,title_layer_get_layer(rw->title_layer));


	// Create the menu layer
	rw->menu_layer = menu_layer_create(GRect(0,24,144,144));

	// Set all the callbacks for the menu layer
	menu_layer_set_callbacks(rw->menu_layer, rw, (MenuLayerCallbacks){
		.get_num_sections = reply_get_num_sections_callback,
		.get_num_rows = reply_get_num_rows_callback,
		.draw_row = reply_draw_row_callback,
		.select_click = reply_select_callback,
	});

#ifdef PBL_COLOR
	menu_layer_set_highlight_colors(rw->menu_layer,GColorBlue,GColorWhite);
#endif


	// Bind the menu layer's click config provider to the window for interactivity
	menu_layer_set_click_config_onto_window(rw->menu_layer, window);

	// Add it to the window for display
	layer_add_child(mainWindowLayer, menu_layer_get_layer(rw->menu_layer));
}

void replywindow_disappear(Window *window) {
	APP_LOG(APP_LOG_LEVEL_DEBUG,"rw dis");

	ReplyWindow * rw = (ReplyWindow*)window_get_user_data(window);

	// Destroy the menu layer
	layer_remove_from_parent(menu_layer_get_layer(rw->menu_layer));
	menu_layer_destroy(rw->menu_layer);
	APP_LOG(APP_LOG_LEVEL_DEBUG,"rw dis2");
}

void replywindow_unload(Window *window) {
	APP_LOG(APP_LOG_LEVEL_DEBUG,"rw un");

	ReplyWindow * rw = (ReplyWindow*)window_get_user_data(window);
	free(rw);

	window_destroy(window);
	APP_LOG(APP_LOG_LEVEL_DEBUG,"rw un2");

}

void replywindow_create(chan_info * c, char * replyto, ReplyList * rl) {

	ReplyWindow * rw = malloc(sizeof(ReplyWindow));
	rw->replyTo=replyto;
	rw->replyChan=c;

		rw->window = window_create();
		window_set_user_data(rw->window,rw);
#ifdef PBL_SDK_2
		window_set_fullscreen(rw->window,true);
#endif

		if (rl==NULL) {
			APP_LOG(APP_LOG_LEVEL_DEBUG,"rl==NULL");

			rw->replies=&staticRL;
			rw->replies->values=staticReplies;
			rw->replies->num=ARRAY_LENGTH(staticReplies);
		} else {
			APP_LOG(APP_LOG_LEVEL_DEBUG,"rl!=NULL");
			rw->replies=rl;
		}

		// Setup the window handlers
		window_set_window_handlers(rw->window, (WindowHandlers) {
			.appear = &replywindow_load,
			.disappear = &replywindow_disappear,
			.unload = &replywindow_unload
		});

		window_stack_push(rw->window,true);
}

ReplyList * addReplies(char * v) {

	char * m=strdup(v);

	ReplyList * rl = malloc(sizeof (ReplyList));

	APP_LOG(APP_LOG_LEVEL_DEBUG,"addReplies %s", m);
	if (v!=NULL) {
		char * tok = strtok(v,SEP);
		int num_replies=0;
		if (tok!=NULL) {
			rl->num = atoi(tok)+1;
			APP_LOG(APP_LOG_LEVEL_DEBUG,"num replies %d", rl->num);
			rl->values = malloc(sizeof(char*) * rl->num);
		}
		// add Emoji
		rl->values[0] = strdup("Emoji");
		uint8_t i = 1;
		tok=strtok(NULL,SEP);
		// assuming correct formed triples...
		while (tok!=NULL) {
			APP_LOG(APP_LOG_LEVEL_DEBUG,"next reply %s", tok);
			rl->values[i] = strdup(tok);
			tok=strtok(NULL,SEP);
			i++;
		}
	}
	free(m);
	myReplies = rl;
	return rl;
}




