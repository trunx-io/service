#!/bin/bash

JSON="{ \"type\": \"message\", \"data\": {\"id\":\"_1\",\"name\":\"status\",\"args\":[]} } \f"
RESULT=`printf "$JSON" | nc -w1 -U /tmp/app.trunx1`

if [[ $RESULT == "" ]]; then
	echo "TrunxIO IPC server is NOT running"
else
	echo "TrunxIO IPC server IS running"
fi
