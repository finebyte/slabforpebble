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
#include "errorwindow.h"

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
char * emojiList[]={"😛","😄","😒","😎","😖","💩","🍺","🎉","❤️"};
ReplyList emojiRL;



ReplyList * myReplies=NULL;

#ifndef PBL_PLATFORM_APLITE

ReplyList dictationFailedRL;
char dictation_status_msg[50];
DictationSession * dictsess;
GBitmap * mic;
#endif

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
#ifndef PBL_PLATFORM_APLITE
    
    if (rw->replies==&dictationFailedRL) {
        return 1;
    } else {
        return rw->replies->num;
    }
#else
    return rw->replies->num;
#endif
}

static void reply_draw_row_callback(GContext* ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
    ReplyWindow * rw = (ReplyWindow*)data;
    
#ifndef PBL_PLATFORM_APLITE
    if (rw->replies==&dictationFailedRL) {
        menu_cell_basic_draw(ctx, cell_layer, "Failed", dictation_status_msg, mic);
    } else {
        
        if (strcmp(rw->replies->values[cell_index->row], "Dictate")==0) {
            if (dictsess!=NULL) {
                menu_cell_basic_draw(ctx, cell_layer, "Dictate", NULL, mic);
            } else {
                menu_cell_basic_draw(ctx, cell_layer, "Dictate", "UNAVAILABLE", mic);
            }
        } else {
            menu_cell_basic_draw(ctx, cell_layer, rw->replies->values[cell_index->row], NULL, NULL);
        }
    }
#else
    menu_cell_basic_draw(ctx, cell_layer, rw->replies->values[cell_index->row], NULL, NULL);
    
#endif
    
}

//void refresh(void * data) {
//	sendCommand("MESSAGES",rw->replyChan->id);
//}

// Here we capture when a user selects a menu item
void reply_select_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
    ReplyWindow * rw = (ReplyWindow*)data;
    
#ifndef PBL_PLATFORM_APLITE
    
    if (rw->replies==&dictationFailedRL) {
        window_stack_pop(false);
        return;
    }
#endif
    
    APP_LOG(APP_LOG_LEVEL_DEBUG,"You clicked on %s" ,
            rw->replies->values[cell_index->row]);
    
    int row = cell_index->row;
    if (strcmp(rw->replies->values[row],"Dictate")==0) {
#ifndef PBL_PLATFORM_APLITE
        dictation_session_start(dictsess);
#endif
    } else if (strcmp(rw->replies->values[row],"Emoji")==0) {
        emojiRL.values=emojiList;
        emojiRL.num=ARRAY_LENGTH(emojiList);
        replywindow_create(rw->replyChan,rw->replyTo,&emojiRL);
    } else {
        
        static char msg[100];
        snprintf(msg,100,"%s%c%s%s", rw->replyChan->id,0x7f,rw->replyTo,rw->replies->values[row]);
        sendCommand("MESSAGE",msg);
        bool pop2 = rw->replies->values==emojiList;
        window_stack_pop(false);
        if (pop2) {
            window_stack_pop(false);
        }
    }
}

int16_t reply_get_cell_height_callback( MenuLayer *menu_layer, MenuIndex* menu_index, void *callback_context) {
#ifdef PBL_ROUND
    return MENU_CELL_ROUND_FOCUSED_SHORT_CELL_HEIGHT;
#else
    return 44;
#endif
}


int16_t reply_get_header_height_callback( MenuLayer *menu_layer, uint16_t section_index, void *callback_context) {
    return MENU_CELL_BASIC_HEADER_HEIGHT;
}

// This initializes the menu upon window load
void replywindow_appear(Window *window) {
    
    ReplyWindow * rw = (ReplyWindow*)window_get_user_data(window);
    
    
    Layer * mainWindowLayer = window_get_root_layer(window);
    
    static char titleText[40];
#ifdef PBL_ROUND
    if ((rw->replyTo!=NULL) && (strlen(rw->replyTo) > 3)) {
        snprintf(titleText,40,"%s", rw->replyTo);
    } else {
        snprintf(titleText,40,"Reply %s", rw->replyTo);        
    }
#else
    snprintf(titleText,40,"Reply %s", rw->replyTo);
#endif
    rw->title_layer = title_layer_create(GRect(0,0,PEBBLE_WIDTH,TITLE_HEIGHT), titleText, ICON_CHAT);
    
    // Create the menu layer
#ifdef PBL_ROUND
    rw->menu_layer = menu_layer_create(GRect(0,0,PEBBLE_WIDTH,PEBBLE_HEIGHT));
#else
    rw->menu_layer = menu_layer_create(GRect(0,TITLE_HEIGHT,PEBBLE_WIDTH,PEBBLE_HEIGHT-TITLE_HEIGHT));
#endif
    // Set all the callbacks for the menu layer
    menu_layer_set_callbacks(rw->menu_layer, rw, (MenuLayerCallbacks){
        .get_num_sections = reply_get_num_sections_callback,
        .get_num_rows = reply_get_num_rows_callback,
        .draw_row = reply_draw_row_callback,
        .select_click = reply_select_callback,
        .get_cell_height = reply_get_cell_height_callback,
    });
    
#ifdef PBL_COLOR
    menu_layer_set_highlight_colors(rw->menu_layer,COLOR_PRIMARY,GColorWhite);
#endif
    
    
    // Bind the menu layer's click config provider to the window for interactivity
    menu_layer_set_click_config_onto_window(rw->menu_layer, window);
    
    // Add it to the window for display
    layer_add_child(mainWindowLayer, menu_layer_get_layer(rw->menu_layer));
    layer_add_child(mainWindowLayer,title_layer_get_layer(rw->title_layer));
}

void replywindow_disappear(Window *window) {
    ReplyWindow * rw = (ReplyWindow*)window_get_user_data(window);
    
    // Destroy the menu layer
    layer_remove_from_parent(menu_layer_get_layer(rw->menu_layer));
    menu_layer_destroy(rw->menu_layer);
    title_layer_destroy(rw->title_layer);
}

void replywindow_unload(Window *window) {
    ReplyWindow * rw = (ReplyWindow*)window_get_user_data(window);
#ifndef PBL_PLATFORM_APLITE
    if (rw->replies!=&emojiRL) {
    if (dictsess!=NULL) {
        dictation_session_destroy(dictsess);
        dictsess=NULL;
    }
    
    if (mic!=NULL) {
        gbitmap_destroy(mic);
        mic=NULL;
    }
    }
#endif
    free(rw);
    
    window_destroy(window);
}
#ifndef PBL_PLATFORM_APLITE
static void dictation_session_callback(DictationSession *session, DictationSessionStatus status,
                                       char *transcription, void *context) {
    ReplyWindow * rw = (ReplyWindow*)context;
    
    // Print the results of a transcription attempt
    APP_LOG(APP_LOG_LEVEL_INFO, "Dictation status: %d", (int)status);
    if (status == DictationSessionStatusSuccess) {
        APP_LOG(APP_LOG_LEVEL_INFO, "Dictation: %s", transcription);
        static char msg[581];
        snprintf(msg,580,"%s%c%s%s", rw->replyChan->id,0x7f,rw->replyTo,transcription);
        sendCommand("MESSAGE",msg);
        window_stack_pop(false);
    } else {
        snprintf(dictation_status_msg, 50, "Dictation\nFailed\nReason=%d", (int)status);
        APP_LOG(APP_LOG_LEVEL_INFO, "%s",dictation_status_msg);
        errorwindow_create(dictation_status_msg);
    }
}
#endif

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
        rw->replies=&staticRL;
        rw->replies->values=staticReplies;
        rw->replies->num=ARRAY_LENGTH(staticReplies);
    } else {
        rw->replies=rl;
    }
    
    // Setup the window handlers
    window_set_window_handlers(rw->window, (WindowHandlers) {
        .appear = &replywindow_appear,
        .disappear = &replywindow_disappear,
        .unload = &replywindow_unload
    });
    
#ifndef PBL_PLATFORM_APLITE
    if (rl!=&emojiRL) {
    dictsess= dictation_session_create(500, dictation_session_callback, rw);
    mic = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_MIC_S);
    }
#endif
    
    window_stack_push(rw->window,true);
}

ReplyList * addReplies(char * v) {
    
    char * m=strdup(v);
    
    ReplyList * rl = malloc(sizeof (ReplyList));
    
    APP_LOG(APP_LOG_LEVEL_DEBUG,"addReplies %s", m);
    if (v!=NULL) {
        char * tok = strtok(v,SEP);
        if (tok!=NULL) {
            rl->num = atoi(tok)+1;
#ifndef PBL_PLATFORM_APLITE
            rl->num++;
#endif
            APP_LOG(APP_LOG_LEVEL_DEBUG,"num replies %d", rl->num);
            rl->values = malloc(sizeof(char*) * rl->num);
        }
        // add Emoji
        uint8_t i = 0;
#ifndef PBL_PLATFORM_APLITE
        rl->values[i] = strdup("Dictate");
        i++;
#endif
        rl->values[i] = strdup("Emoji");
        i++;
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
