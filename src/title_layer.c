/*
 * title_layer.c
 *
 *  Created on: 1 May 2015
 *      Author: turcja
 */
#include "title_layer.h"
#include "pebble.h"
#include "util.h"
#include <font-loader.h>


static void title_layer_update_proc(Layer *layer, GContext* ctx) {

	GRect b = layer_get_bounds(layer);

	TitleLayer *  title_layer = (TitleLayer*)(layer_get_data(layer));

	graphics_context_set_stroke_color(ctx, GColorWhite);

	graphics_context_set_fill_color(ctx, COLOR_SECONDARY);
	graphics_fill_rect(ctx,GRect(b.origin.x,b.origin.y,b.size.w,b.size.h),0,GCornersAll);

	graphics_context_set_text_color(ctx,GColorWhite);
	// Draw the text
#ifdef PBL_ROUND
    // Create the attributes object used for text rendering
    GTextAttributes *s_attributes
    = graphics_text_attributes_create();
    
    // Enable text flow with an inset of 5 pixels
    graphics_text_attributes_enable_screen_text_flow(s_attributes, 5);

    graphics_draw_text(ctx, title_layer->icon,
                       fonts_get_font(RESOURCE_ID_FONT_ICONS_16), GRect(0, 2, PEBBLE_WIDTH, 16),
                       GTextOverflowModeFill, GTextAlignmentCenter, NULL);
    graphics_draw_text(ctx, title_layer->title,
                       fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
                       GRect(0, 16, PEBBLE_WIDTH, 18), GTextOverflowModeTrailingEllipsis,
                       GTextAlignmentCenter, s_attributes);

#else

	graphics_draw_text(ctx, title_layer->icon,
			fonts_get_font(RESOURCE_ID_FONT_ICONS_16), GRect(3, 2, 16, 16),
			GTextOverflowModeFill, GTextAlignmentCenter, NULL);
	graphics_draw_text(ctx, title_layer->title,
			fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
			GRect(22, -2, PEBBLE_WIDTH - 24, 18), GTextOverflowModeTrailingEllipsis,
			GTextAlignmentLeft, NULL);
#endif
}

TitleLayer* title_layer_create(GRect frame, char * t,  char * i) {

	//creating base layer
	Layer* layer =layer_create_with_data(frame, sizeof(TitleLayer));
	layer_set_update_proc(layer, title_layer_update_proc);
	TitleLayer* title_layer = (TitleLayer*)layer_get_data(layer);
	memset(title_layer,0,sizeof(TitleLayer));
	title_layer->layer = layer;
	title_layer->title=t;
	title_layer->icon=i;
	return title_layer;
}

void title_layer_set_text(TitleLayer *title_layer, char * t) {
	title_layer->title=t;
	layer_mark_dirty(title_layer->layer);
}


//destroys title layer
void title_layer_destroy(TitleLayer *title_layer) {
	layer_destroy(title_layer->layer);
}

//gets layer
Layer* title_layer_get_layer(TitleLayer *title_layer) {
	return title_layer->layer;
}
