/*
 * util.c
 *
 *  Created on: 14 May 2015
 *      Author: turcja
 */
#include "pebble.h"



void sendCommand(char * op, char * data) {
	DictionaryIterator* iterout;
	app_message_outbox_begin(&iterout);
	dict_write_cstring(iterout, 0, op);
	dict_write_cstring(iterout, 1,data);
	dict_write_end(iterout);
	app_message_outbox_send();
	APP_LOG(APP_LOG_LEVEL_INFO,"tx %s %s", op, data);
}



char * strdup (const char *s)
{
	if (s==NULL)
			return NULL;
	size_t len = strlen (s) + 1;
	void *new = malloc (len);

	if (new == NULL)
		return NULL;

	return (char *) memcpy (new, s, len);
}


char * strtok_r(char *s, const char *delim, char **last)
{
	char *spanp;
	int c, sc;
	char *tok;


	if (s == NULL && (s = *last) == NULL)
		return (NULL);

	/*
	 * Skip (span) leading delimiters (s += strspn(s, delim), sort of).
	 */
	cont:
	c = *s++;
	for (spanp = (char *)delim; (sc = *spanp++) != 0;) {
		if (c == sc)
			goto cont;
	}

	if (c == 0) {		/* no non-delimiter characters */
		*last = NULL;
		return (NULL);
	}
	tok = s - 1;

	/*
	 * Scan token (scan for delimiters: s += strcspn(s, delim), sort of).
	 * Note that delim must have one NUL; we stop if we see that, too.
	 */
	for (;;) {
		c = *s++;
		spanp = (char *)delim;
		do {
			if ((sc = *spanp++) == c) {
				if (c == 0)
					s = NULL;
				else
					s[-1] = 0;
				*last = s;
				return (tok);
			}
		} while (sc != 0);
	}
	/* NOTREACHED */
}

char * strtok(char *s, const char *delim)
{
	static char *last;

	return strtok_r(s, delim, &last);
}

TextLayer * new_text_layer(GRect frame, char* t, char *f, GTextAlignment a, GColor fg, GColor bg, Layer* p) {
	TextLayer * tl = text_layer_create(frame);
	if (tl==NULL) {
		app_log(APP_LOG_LEVEL_WARNING,__FILE__,__LINE__,"TLFail %s",t);
	} else {
		text_layer_set_text(tl, t);
		GFont font = fonts_get_system_font(f);
		text_layer_set_font(tl, font);
		text_layer_set_text_alignment(tl, a);
		text_layer_set_text_color(tl,fg);
		text_layer_set_background_color(tl,bg);
		layer_add_child(p, text_layer_get_layer(tl));
	}
	return tl;
}



