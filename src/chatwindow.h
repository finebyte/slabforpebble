/*
 * chatwindow.h
 *
 *  Created on: 16 May 2015
 *      Author: turcja
 */

#ifndef CHATWINDOW_H_
#define CHATWINDOW_H_


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



void chatwindow_create(chan_info * chan);
void chatwindow_update();

void addMessages(char * v, int id);



#endif /* CHATWINDOW_H_ */
