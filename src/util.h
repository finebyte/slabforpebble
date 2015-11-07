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

#define ICON_EXCLAMATION "A"
#define ICON_X "B"
#define ICON_CHAT "C"
#define ICON_REFRESH "G"
#define ICON_PHONE "E"
#define ICON_CHANNEL "H"
#define ICON_PRIVATE "D"
#define ICON_STAR "F"

#define COLOR_PRIMARY COLOR_FALLBACK(GColorBlue, GColorBlack)
#define COLOR_SECONDARY COLOR_FALLBACK(GColorOxfordBlue, GColorBlack)

#ifdef PBL_ROUND
#define PEBBLE_WIDTH 180
#define PEBBLE_HEIGHT 180
#define TITLE_HEIGHT 40
#else
#define PEBBLE_WIDTH 144
#define PEBBLE_HEIGHT 168
#define TITLE_HEIGHT 24
#endif

#endif /* UTIL_H_ */
