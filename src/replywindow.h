/*
 * replywindow.h
 *
 *  Created on: 17 May 2015
 *      Author: turcja
 */

#ifndef REPLYWINDOW_H_
#define REPLYWINDOW_H_

typedef struct  {
	int num;
	char ** values;
} ReplyList;

void replywindow_create(chan_info * c, char * r, ReplyList * rl);

ReplyList * addReplies(char * v);

ReplyList * get_myReplies();

#endif /* REPLYWINDOW_H_ */
