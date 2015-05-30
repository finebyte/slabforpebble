# Compile and run the tests.
cd tests/
gcc font-loader.c ../src/font-loader.c ./src/pebble.c -I ~/pebble-dev/PebbleSDK-2/Pebble/include -I . -std=c11 -o tests
./tests
rm tests
cd ..
printf "\x1B[0m"