#
# Rockit Pebble Build Utilities v0.1
# https://smallstoneapps.github.io/rockit/
#
# ----------------------
#
# The MIT License (MIT)
#
# Copyright (c) 2015 Matthew Tole
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
# rockit.py
#

import os
import waflib
import json


def build(ctx, js_path=None):
    build_worker = os.path.exists('worker_src')
    binaries = []

    for p in ctx.env.TARGET_PLATFORMS:
        ctx.set_env(ctx.all_envs[p])
        ctx.set_group(ctx.env.PLATFORM_NAME)
        app_elf = '{}/pebble-app.elf'.format(ctx.env.BUILD_DIR)
        ctx.pbl_program(source=ctx.path.ant_glob('src/**/*.c') + sources(ctx),
                        includes=includes(ctx),
                        target=app_elf)

        if build_worker:
            worker_elf = '{}/pebble-worker.elf'.format(ctx.env.BUILD_DIR)
            binaries.append({'platform': p, 'app_elf': app_elf,
                             'worker_elf': worker_elf})
            ctx.pbl_worker(source=ctx.path.ant_glob('worker_src/**/*.c') +
                           sources(ctx),
                           includes=includes(ctx),
                           target=worker_elf)
        else:
            binaries.append({'platform': p, 'app_elf': app_elf})

    ctx.set_group('bundle')
    ctx.pbl_bundle(binaries=binaries,
                   js=js_path or ctx.path.ant_glob('src/js/**/*.js'))


def includes(ctx):
    include_folders = []
    libs = ctx.path.find_node('./fuel')
    for folder in libs.listdir():
        if not os.path.isdir(os.path.join('fuel', folder)):
            continue
        data = __get_data(folder)
        if 'includes' not in data:
            waflib.Logs.pprint(
                'RED',
                'Error: Rockit could not find "includes" in {}'
                .format(os.path.join('fuel', folder, 'rockit.json')))
            return []
        for include in data['includes']:
            include_folders.append(
                os.path.normpath(
                    os.path.join('fuel', folder, include)).encode('utf-8'))
    return include_folders


def sources(ctx):
    source_files = []
    libs = ctx.path.find_node('./fuel')
    for folder in libs.listdir():
        if not os.path.isdir(os.path.join('fuel', folder)):
            continue
        data = __get_data(folder)
        for file in data['sources']:
            source_files.append(
                os.path.normpath(
                    os.path.join('fuel', folder, file)).encode('utf-8'))
    return source_files


def __get_data(folder):
    rockit_file = os.path.join('fuel', folder, 'rockit.json')
    json_data = open(rockit_file).read()
    return json.loads(json_data)
