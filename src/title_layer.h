/*
 * inverter_layer.h
 *
 *  Created on: 1 May 2015
 *      Author: turcja
 */

#include "pebble.h"

#ifndef TITLE_LAYER_H_
#define TITLE_LAYER_H_



// structure of title layer
typedef struct {
  Layer* layer;
 char * title;
 char * icon;
} TitleLayer;

// set the title text
void title_layer_set_text(TitleLayer *title_layer, char * t);


//creates title layer
TitleLayer* title_layer_create(GRect frame, char * t, char * i);

//destroys title layer
void title_layer_destroy(TitleLayer *title_layer);

//gets layer
Layer* title_layer_get_layer(TitleLayer *title_layer);



#endif /* title_LAYER_H_ */
