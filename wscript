#
# Slab v1.0
#
# ----------------------
#
# The MIT License (MIT)
#
# Copyright © 2015 finebyte & Matthew Tole
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.
#
# --------------------
#
# wscript
#

import json
import datetime
import os
from sh import make
import sh
import rockit

top = '.'
out = 'build'


def options(ctx):
    ctx.load('pebble_sdk')


def configure(ctx):
    ctx.load('pebble_sdk')


def distclean(ctx):
    ctx.load('pebble_sdk')
    try:
        os.remove('../src/js/pebble-js-app.js')
        os.remove('../src/js/src/generated/appinfo.js')
        os.remove('../src/generated/appinfo.h')
    except OSError:
        pass


def build(ctx):
    ctx.load('pebble_sdk')

    js_sources = [
        '../src/js/src/generated/appinfo.js',
        '../src/js/src/hacks.js',
        '../src/js/src/utils.js',
        '../src/js/src/errors.js',
        '../src/js/src/emoji.js',
        '../src/js/src/users.js',
        '../src/js/src/channel.js',
        '../src/js/src/message.js',
        '../src/js/src/slack.js',
        '../src/js/src/state.js',
        '../src/js/src/main.js'
    ]
    if os.path.isfile('src/js/src/debug.js'):
        js_sources.insert(0, '../src/js/src/debug.js');

    built_js = '../src/js/pebble-js-app.js'

    # Generate appinfo.js
    ctx(rule=generate_appinfo_js, source='../appinfo.json',
        target='../src/js/src/generated/appinfo.js')

    # Generate appinfo.h
    ctx(rule=generate_appinfo_h, source='../appinfo.json',
        target='../src/generated/appinfo.h')

    # Run the C tests.
    # ctx(rule=make_test)

    # Run jshint on all the JavaScript files
    ctx(rule=js_jshint, source=js_sources)

    # Run jscs on all the JavaScript files
    ctx(rule=js_jscs, source=js_sources)

    # Run the suite of JS tests.
    # ctx(rule=js_karma)

    # Combine the source JS files into a single JS file.
    ctx(rule=concatenate_js,
        source=js_sources,
        target=built_js)

    # Use Rockit to build the app
    rockit.build(ctx, built_js)


def generate_appinfo_h(task):
    task.ext_out = '.c'

    src = task.inputs[0].abspath()
    target = task.outputs[0].abspath()
    appinfo = json.load(open(src))

    f = open(target, 'w')
    write_comment_header(f, 'src/generated/appinfo.h', appinfo)
    f.write('#pragma once\n\n')
    f.write('#define VERSION_LABEL "{0}"\n'.format(appinfo['versionLabel']))
    f.write('#define UUID "{0}"\n'.format(appinfo['uuid']))
    for key in appinfo['appKeys']:
        f.write('#define APP_KEY_{0} {1}\n'.format(key.upper(),
                                                   appinfo['appKeys'][key]))
    for key in appinfo['settings']:
        f.write('#define SETTING_{0} {1}\n'.format(key.upper(),
                                                   appinfo['settings'][key]))
    f.close()


def generate_appinfo_js(task):
    src = task.inputs[0].abspath()
    target = task.outputs[0].abspath()
    data = open(src).read().strip()
    appinfo = json.load(open(src))

    f = open(target, 'w')
    write_comment_header(f, 'src/js/src/generated/appinfo.js', appinfo)
    f.write('module.exports = ')
    f.write(data)
    f.write(';')
    f.close()


# Function to write the comment header for both the C and JS generated files.
# Thank goodness that they have the same comment syntax!
def write_comment_header(f, filename, appinfo):
    f.write("""/*

Slab v{0}

----------------------

The MIT License (MIT)

Copyright © {1} finebyte & Matthew Tole

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

{2}

*/


""".format(appinfo['versionLabel'], datetime.datetime.now().year, filename))


def concatenate_js(task):
    task.ext_out = '.js'
    browserify = sh.Command("./node_modules/.bin/browserify")
    browserify(task.inputs[-1].abspath(), o=task.outputs[0].abspath())


def make_test(task):
    make("test")


def js_jshint(task):
    task.ext_out = '.js'

    jshint = sh.Command("./node_modules/.bin/jshint")
    inputs = (input.abspath() for input in task.inputs)
    jshint(*inputs, config=".jshintrc")


def js_jscs(task):
    task.ext_out = '.js'
    make("jscs")


def js_karma(task):
    task.ext_out = '.js'
    karma = sh.Command("./node_modules/.bin/karma")
    karma("start", single_run=True, reporters="dots")
