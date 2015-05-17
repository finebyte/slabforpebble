/*
 * util.h
 *
 *  Created on: 14 May 2015
 *      Author: turcja
 */

#ifndef UTIL_H_
#define UTIL_H_

TextLayer * new_text_layer(GRect frame, char* t, char *f, GTextAlignment a, GColor fg, GColor bg, Layer* p);
char * strtok(char *s, const char *delim);
char * strtok_r(char *s, const char *delim, char **last);
char * strdup (const char *s);
void sendCommand(char * op, char * data);

static char SEP[]={(char)0x7f, (char)0x00};


#define SETTING_DELIMITER 127

#endif /* UTIL_H_ */
