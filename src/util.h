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

#define ICON_CHAT "A"
#define ICON_X "B"
#define ICON_REFRESH "C"
#define ICON_PHONE "D"
#define ICON_CHANNEL "E"
#define ICON_PRIVATE "F"
#define ICON_STAR "G"

#define COLOR_PRIMARY COLOR_FALLBACK(GColorBlue, GColorBlack)
#define COLOR_SECONDARY COLOR_FALLBACK(GColorOxfordBlue, GColorBlack)

#endif /* UTIL_H_ */
