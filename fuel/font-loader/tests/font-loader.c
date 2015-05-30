/*

Font Loader v2.0.1
On-demand loading of fonts from resources.
http://smallstoneapps.github.io/font-loader/

----------------------

The MIT License (MIT)

Copyright © 2014 Matthew Tole

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

--------------------

tests/font-loader.h

*/

#include "unit.h"
#include "./src/pebble-extra.h"
#include "../src/font-loader.h"

// Colour code definitions to make the output all pretty.
#define KNRM  "\x1B[0m"
#define KRED  "\x1B[31m"
#define KGRN  "\x1B[32m"
#define KYEL  "\x1B[33m"
#define KBLU  "\x1B[34m"
#define KMAG  "\x1B[35m"
#define KCYN  "\x1B[36m"
#define KWHT  "\x1B[37m"

// Keep track of how many tests have run, and how many have passed.
int tests_run = 0;
int tests_passed = 0;
const int NUM_TESTS = 2;

static void before_each(void) {
  fonts_init();
}

static void after_each(void) {
  fonts_cleanup();
}

static char* test_id(void) {
  const uint32_t id = 123422;
  GFont font = fonts_get_font(id);
  mu_assert(NULL != font, "Loading font by ID returned NULL.");
  mu_assert(id == ((FakeFont*)font)->id, "Loading font by ID returned mismatched ID.");
  return 0;
}

static char* test_name(void) {
  const uint32_t id = 53818581;
  const char* name = "demo font";
  fonts_assign(name, id);
  GFont font = fonts_get_font_by_name(name);
  mu_assert(NULL != font, "Loading font by name returned NULL.");
  mu_assert(id == ((FakeFont*)font)->id, "Loading font by name returned mismatched ID.");
  return 0;
}

static char* all_tests() {
  mu_run_test(test_id);
  mu_run_test(test_name);
  return 0;
}

int main(int argc, char **argv) {
  printf("%s----------------------------\n", KCYN);
  printf("Running Font Loader Tests\n");
  printf("----------------------------\n%s", KNRM);
  char* result = all_tests();
  if (0 != result) {
    printf("%sFailed Test:%s %s\n", KRED, KNRM, result);
  }
  printf("Tests Run: %s%d / %d%s\n", (tests_run == NUM_TESTS) ? KGRN : KRED, tests_run, NUM_TESTS, KNRM);
  printf("Tests Passed: %s%d / %d%s\n", (tests_passed == NUM_TESTS) ? KGRN : KRED, tests_passed, NUM_TESTS, KNRM);

  printf("%s----------------------------%s\n", KCYN, KNRM);
  return result != 0;
}