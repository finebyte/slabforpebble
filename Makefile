CC=gcc
ifeq ($(TRAVIS), true)
CFLAGS=
else
CFLAGS=-std=c11
endif
CINCLUDES=-I tests/include/ -I tests/

TEST_FILES=tests/tests.c
SRC_FILES=
TEST_EXTRAS=tests/src/pebble.c

all: test

test: lint
	@$(CC) $(CFLAGS) $(CINCLUDES) $(TEST_FILES) $(SRC_FILES) $(TEST_EXTRAS) -o tests/run
	@tests/run
	@rm tests/run
	@printf "\x1B[0m"

lint: jshint jscs

jshint:
		@ find src/js/src -name "*.js" \
			-not -path "src/js/libs/*" \
			-print0 | \
			xargs -0 ./node_modules/.bin/jshint \
			--reporter ./node_modules/jshint-stylish-ex/stylish.js

jscs:
	@ find src/js/src -name "*.js" \
		-not -path "src/js/libs/*" \
		-print0 | \
		xargs -0 ./node_modules/.bin/jscs \
		--reporter ./node_modules/jscs-stylish/jscs-stylish.js
