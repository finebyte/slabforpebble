/*
 * title_layer.c
 *
 *  Created on: 1 May 2015
 *      Author: turcja
 */
#include "title_layer.h"
#include "pebble.h"

static void title_layer_update_proc(Layer *layer, GContext* ctx) {
//		GRect b = layer_get_frame(layer);

		GRect b = layer_get_bounds(layer);

		TitleLayer *  title_layer = (TitleLayer*)(layer_get_data(layer));

		graphics_context_set_stroke_color(ctx, GColorBlack);
		graphics_context_set_text_color(ctx,GColorBlack);
		// Draw the text
		graphics_draw_text(ctx,
				title_layer->title,
				fonts_get_system_font(FONT_KEY_GOTHIC_18),
				b,
				GTextOverflowModeTrailingEllipsis,
				GTextAlignmentCenter,
				NULL);

		// Draw the lines

		GPoint l = GPoint(b.origin.x,b.origin.y+b.size.h-1);
		GPoint r = GPoint(l.x+b.size.w,l.y);

		graphics_draw_line(ctx, l,r);
		graphics_draw_line(ctx, GPoint(l.x,l.y-3),GPoint(r.x,r.y-3));

}

TitleLayer* title_layer_create(GRect frame, char * t) {

	//creating base layer
	Layer* layer =layer_create_with_data(frame, sizeof(TitleLayer));
	layer_set_update_proc(layer, title_layer_update_proc);
	TitleLayer* title_layer = (TitleLayer*)layer_get_data(layer);
	memset(title_layer,0,sizeof(TitleLayer));
	title_layer->layer = layer;
	title_layer->title=t;
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


