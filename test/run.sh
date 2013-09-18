#!/bin/sh
for I in TD_COAP_*
do
    node $I
    if [ $? != 0 ]
    then
        exit 1
    fi
done
