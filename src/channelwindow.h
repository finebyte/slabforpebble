/*
 * channelwindow.h
 *
 *  Created on: 14 May 2015
 *      Author: turcja
 */

#ifndef CHANNELWINDOW_H_
#define CHANNELWINDOW_H_

#define CHANNELS 0
#define DM 2
#define GROUPS 1

void	addChannels(char *v, int i);
void	channelwindow_create();

typedef struct  {
	char * id;
	char * name;
	char * unread_msg;
	int unread;
} chan_info;


typedef struct  {
	uint8_t num;
	chan_info * chans;
} chan_group;


#endif /* CHANNELWINDOW_H_ */
